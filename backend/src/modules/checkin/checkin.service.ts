import { createHash, randomBytes, randomUUID } from 'crypto'
import {
  createSupabaseUserRequestClient,
  supabaseAdminClient,
} from '../../config/supabase'
import {
  assertNoError,
  httpError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  AccessPassListQuery,
  CheckinListQuery,
  IssueAccessPassPayload,
  RegisterCheckinPayload,
} from './checkin.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const checkinRoles = ['super_admin', 'admin', 'operations']
const exportRoles = ['super_admin', 'admin', 'operations', 'viewer']

type Relation<T> = T | T[] | null

type PassRow = {
  id: string
  reservation_id?: string | null
  order_id?: string | null
  event_ticket_type_id?: string | null
  pass_number?: string | null
  status: string
  valid_from?: string | null
  valid_until?: string | null
  used_at?: string | null
  issued_at?: string | null
  revoked_at?: string | null
  revocation_reason?: string | null
  created_at: string
  reservations?: Relation<{
    reservation_number: string
    people_count: number
    customers?: Relation<{ display_name?: string | null; first_name: string; last_name: string }>
    experiences?: Relation<{ title: string }>
    events?: Relation<{ title: string }>
  }>
  orders?: Relation<{ order_number: string; status: string }>
}

type CheckinRow = {
  id: string
  access_pass_id: string
  checked_in_at: string
  notes?: string | null
  reversed_at?: string | null
  reversal_reason?: string | null
  created_at?: string | null
  access_passes?: Relation<{
    pass_number?: string | null
	    reservations?: Relation<{ reservation_number: string; experiences?: Relation<{ title: string }>; events?: Relation<{ title: string }> }>
  }>
}

type ValidationResult = {
  valid: boolean
  reason?: string | null
  accessPassId: string
  passNumber?: string | null
  reservationNumber?: string | null
  guestName?: string | null
  peopleCount?: number | null
  status?: string | null
  reservationStatus?: string | null
  experienceTitle?: string | null
  usedAt?: string | null
}

const passSelect = `
  id,reservation_id,order_id,event_ticket_type_id,pass_number,status,valid_from,valid_until,used_at,
  issued_at,revoked_at,revocation_reason,created_at,
	  reservations(reservation_number,people_count,customers(display_name,first_name,last_name),experiences(title),events(title)),
  orders(order_number,status)
`

const checkinSelect = `
  id,access_pass_id,checked_in_at,notes,reversed_at,reversal_reason,created_at,
	  access_passes(pass_number,reservations(reservation_number,experiences(title),events(title)))
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function hashCode(code: string) {
  return createHash('sha256').update(code.trim(), 'utf8').digest('hex')
}

function makePassToken() {
  return `hdl_${randomBytes(32).toString('base64url')}`
}

function mapPass(row: PassRow) {
  const reservation = firstRelation(row.reservations)
  const customer = firstRelation(reservation?.customers)
  return {
    id: row.id,
    reservationId: row.reservation_id ?? null,
    orderId: row.order_id ?? null,
    eventTicketTypeId: row.event_ticket_type_id ?? null,
    passNumber: row.pass_number ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    orderNumber: firstRelation(row.orders)?.order_number ?? null,
    guestName: customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim(),
	    eventOrExperience: firstRelation(reservation?.experiences)?.title ?? firstRelation(reservation?.events)?.title ?? null,
    peopleCount: reservation?.people_count ?? null,
    status: row.status,
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
    usedAt: row.used_at ?? null,
    issuedAt: row.issued_at ?? row.created_at,
    revokedAt: row.revoked_at ?? null,
    revocationReason: row.revocation_reason ?? null,
    createdAt: row.created_at,
  }
}

function mapCheckin(row: CheckinRow) {
  const pass = firstRelation(row.access_passes)
  const reservation = firstRelation(pass?.reservations)
  return {
    id: row.id,
    accessPassId: row.access_pass_id,
    passNumber: pass?.pass_number ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
	    eventOrExperience: firstRelation(reservation?.experiences)?.title ?? firstRelation(reservation?.events)?.title ?? null,
    checkedInAt: row.checked_in_at,
    reversedAt: row.reversed_at ?? null,
    reversalReason: row.reversal_reason ?? null,
    notes: row.notes ?? null,
    status: row.reversed_at ? 'reversed' : 'active',
  }
}

function applyPassFilters(request: any, query: AccessPassListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.reservationId) next = next.eq('reservation_id', query.reservationId)
  if (query.orderId) next = next.eq('order_id', query.orderId)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`pass_number.ilike.%${safe}%`)
  }
  return next
}

function applyCheckinFilters(request: any, query: CheckinListQuery) {
  let next = request
  if (query.accessPassId) next = next.eq('access_pass_id', query.accessPassId)
  if (query.status === 'active') next = next.is('reversed_at', null)
  if (query.status === 'reversed') next = next.not('reversed_at', 'is', null)
  if (query.from) next = next.gte('checked_in_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('checked_in_at', `${query.to}T23:59:59.999Z`)
  return next
}

export async function listAccessPasses(query: AccessPassListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyPassFilters(
    supabaseAdminClient
      .from('access_passes')
      .select(passSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  const rows = assertNoError<PassRow[]>(result).data ?? []
  return { data: rows.map(mapPass), count: result.count ?? rows.length }
}

export async function getAccessPass(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('access_passes')
    .select(passSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<PassRow | null>(result).data
  if (!row) throw httpError(404, 'Pase no encontrado')
  return { data: mapPass(row) }
}

export async function issueAccessPass(payload: IssueAccessPassPayload, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  const token = makePassToken()
  const result = await rpcClient(user).rpc('issue_access_pass', {
    p_reservation_id: payload.reservationId ?? null,
    p_order_id: payload.orderId ?? null,
    p_event_ticket_type_id: payload.eventTicketTypeId ?? null,
    p_qr_token_hash: hashCode(token),
    p_valid_from: payload.validFrom ?? null,
    p_valid_until: payload.validUntil ?? null,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  const pass = await getAccessPass(String(result.data), user)
  return { data: { ...pass.data, qrToken: token } }
}

export async function revokeAccessPass(id: string, reason: string | null | undefined, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  const result = await rpcClient(user).rpc('revoke_access_pass', {
    p_access_pass_id: id,
    p_reason: reason ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getAccessPass(id, user)
}

export async function validateAccessPass(code: string, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  const result = await rpcClient(user).rpc('validate_access_pass', {
    p_qr_token_hash: hashCode(code),
  })
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data as ValidationResult }
}

export async function listCheckins(query: CheckinListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyCheckinFilters(
    supabaseAdminClient
      .from('checkins')
      .select(checkinSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  const rows = assertNoError<CheckinRow[]>(result).data ?? []
  return { data: rows.map(mapCheckin), count: result.count ?? rows.length }
}

export async function getCheckin(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('checkins')
    .select(checkinSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<CheckinRow | null>(result).data
  if (!row) throw httpError(404, 'Check-in no encontrado')
  return { data: mapCheckin(row) }
}

export async function registerCheckin(payload: RegisterCheckinPayload, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  const result = await rpcClient(user).rpc('register_checkin', {
    p_access_pass_id: payload.accessPassId,
    p_request_id: payload.requestId ?? randomUUID(),
    p_notes: payload.notes ?? null,
    p_device_info: payload.deviceInfo ?? {},
    p_evidence_storage_path: payload.evidenceStoragePath ?? null,
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getCheckin(String(result.data), user)
}

export async function reverseCheckin(id: string, reason: string, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  const result = await rpcClient(user).rpc('reverse_checkin', {
    p_checkin_id: id,
    p_reason: reason,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getCheckin(id, user)
}

export async function exportCheckins(query: CheckinListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listCheckins({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'pass_number',
    'reservation_number',
    'event_or_experience',
    'checked_in_at',
    'operator',
    'reversed_at',
    'status',
  ]
  const rows = data.map((item) => [
    item.passNumber ?? '',
    item.reservationNumber ?? '',
    item.eventOrExperience ?? '',
    item.checkedInAt,
    '',
    item.reversedAt ?? '',
    item.status,
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
