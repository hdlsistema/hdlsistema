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
import { ACCESS_QR_EXPIRY_HOURS, publicAccessUrl } from './accessPassIssuer'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const checkinRoles = ['super_admin', 'admin', 'operations']
const exportRoles = ['super_admin', 'admin', 'operations', 'viewer']

type Relation<T> = T | T[] | null

type CustomerRelation = {
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type ExperienceRelation = {
  id?: string | null
  title?: string | null
  cover_image_url?: string | null
  capacity?: number | string | null
}

type EventRelation = {
  id?: string | null
  title?: string | null
  start_at?: string | null
  end_at?: string | null
  capacity?: number | string | null
  sold_count?: number | string | null
  reserved_count?: number | string | null
  cover_image_url?: string | null
}

type SlotRelation = {
  start_at?: string | null
  end_at?: string | null
  capacity?: number | string | null
  reserved_count?: number | string | null
}

type OrderRelation = {
  order_number?: string | null
  status?: string | null
  source?: string | null
  total?: number | string | null
  created_at?: string | null
  customers?: Relation<CustomerRelation>
}

type TicketTypeRelation = {
  id?: string | null
  name?: string | null
  capacity?: number | string | null
  sold_count?: number | string | null
  reserved_count?: number | string | null
  events?: Relation<EventRelation>
}

type ReservationRelation = {
  id?: string | null
  reservation_number: string
  reservation_type?: string | null
  people_count: number
  status?: string | null
  source?: string | null
  total?: number | string | null
  created_at?: string | null
  customers?: Relation<CustomerRelation>
  experience_slots?: Relation<SlotRelation>
  experiences?: Relation<ExperienceRelation>
  events?: Relation<EventRelation>
}

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
  metadata?: Record<string, unknown> | null
  reservations?: Relation<ReservationRelation>
  orders?: Relation<OrderRelation>
  event_ticket_types?: Relation<TicketTypeRelation>
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
    id?: string | null
    pass_number?: string | null
    status?: string | null
    valid_until?: string | null
    issued_at?: string | null
    metadata?: Record<string, unknown> | null
    reservations?: Relation<ReservationRelation>
    orders?: Relation<OrderRelation>
    event_ticket_types?: Relation<TicketTypeRelation>
  }>
}

type ValidationResult = {
  valid: boolean
  reason?: string | null
  accessPassId: string
  passNumber?: string | null
  reservationNumber?: string | null
  orderNumber?: string | null
  accessType?: string | null
  guestName?: string | null
  peopleCount?: number | null
	  status?: string | null
	  reservationStatus?: string | null
	  experienceTitle?: string | null
	  eventTitle?: string | null
	  ticketTypeName?: string | null
	  usedAt?: string | null
	}

const passSelect = `
  id,reservation_id,order_id,event_ticket_type_id,pass_number,status,valid_from,valid_until,used_at,
  issued_at,revoked_at,revocation_reason,created_at,metadata,
  reservations(id,reservation_number,reservation_type,people_count,status,source,total,created_at,
    customers(display_name,first_name,last_name,email),
    experience_slots(start_at,end_at,capacity,reserved_count),
    experiences(id,title,cover_image_url,capacity),
    events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)),
  orders(order_number,status,source,total,created_at,customers(display_name,first_name,last_name,email)),
  event_ticket_types(id,name,capacity,sold_count,reserved_count,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url))
`

const checkinSelect = `
  id,access_pass_id,checked_in_at,notes,reversed_at,reversal_reason,created_at,
  access_passes(id,pass_number,status,valid_until,issued_at,metadata,
    reservations(id,reservation_number,reservation_type,people_count,status,source,total,created_at,
      customers(display_name,first_name,last_name,email),
      experience_slots(start_at,end_at,capacity,reserved_count),
      experiences(id,title,cover_image_url,capacity),
      events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)),
    orders(order_number,status,source,total,created_at,customers(display_name,first_name,last_name,email)),
    event_ticket_types(id,name,capacity,sold_count,reserved_count,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)))
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function positiveNumberOrNull(value: unknown) {
  const parsed = numberOrNull(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

function relationCustomerName(customer: CustomerRelation | null) {
  return customer?.display_name
    || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
    || null
}

function metadataText(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function addHoursIso(value: string | null | undefined, hours: number) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp + (hours * 60 * 60 * 1000)).toISOString()
}

function displayValidUntil(stored: string | null | undefined, startsAt: string | null | undefined, endsAt: string | null | undefined) {
  return stored ?? addHoursIso(endsAt ?? startsAt ?? null, ACCESS_QR_EXPIRY_HOURS)
}

function passEventContext(input: {
  reservation?: ReservationRelation | null
  ticketType?: TicketTypeRelation | null
  metadata?: Record<string, unknown> | null
}) {
  const reservation = input.reservation ?? null
  const ticketType = input.ticketType ?? null
  const slot = firstRelation(reservation?.experience_slots)
  const reservationExperience = firstRelation(reservation?.experiences)
  const reservationEvent = firstRelation(reservation?.events)
  const ticketEvent = firstRelation(ticketType?.events)
  const metadataTitle = metadataText(input.metadata, ['title', 'eventTitle', 'experienceTitle'])
  const metadataImage = metadataText(input.metadata, ['imageUrl', 'image_url', 'coverImageUrl', 'cover_image_url'])
  const eventId = ticketEvent?.id ?? reservationEvent?.id ?? reservationExperience?.id ?? null
  const title = ticketEvent?.title ?? reservationEvent?.title ?? reservationExperience?.title ?? metadataTitle
  const eventCapacity = positiveNumberOrNull(ticketEvent?.capacity)
    ?? positiveNumberOrNull(reservationEvent?.capacity)
    ?? positiveNumberOrNull(slot?.capacity)
    ?? positiveNumberOrNull(reservationExperience?.capacity)
    ?? positiveNumberOrNull(ticketType?.capacity)
  return {
    eventId,
    eventTitle: title ?? null,
    eventImageUrl: ticketEvent?.cover_image_url ?? reservationEvent?.cover_image_url ?? reservationExperience?.cover_image_url ?? metadataImage,
    eventCapacity,
    eventStartsAt: ticketEvent?.start_at ?? reservationEvent?.start_at ?? slot?.start_at ?? null,
    eventEndsAt: ticketEvent?.end_at ?? reservationEvent?.end_at ?? slot?.end_at ?? null,
    ticketCapacity: positiveNumberOrNull(ticketType?.capacity),
  }
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
  const order = firstRelation(row.orders)
  const orderCustomer = firstRelation(order?.customers)
  const ticketType = firstRelation(row.event_ticket_types)
  const eventContext = passEventContext({ reservation, ticketType, metadata: row.metadata })
  const validUntil = displayValidUntil(row.valid_until ?? null, eventContext.eventStartsAt, eventContext.eventEndsAt)
  const metadataAccessType = typeof row.metadata?.accessType === 'string' ? row.metadata.accessType : null
  const accessType = row.event_ticket_type_id
    ? 'event_ticket'
    : metadataAccessType ?? (row.reservation_id ? 'reservation' : 'paid_order')
  return {
    id: row.id,
    reservationId: row.reservation_id ?? null,
    orderId: row.order_id ?? null,
    eventTicketTypeId: row.event_ticket_type_id ?? null,
    eventId: eventContext.eventId,
    accessType,
    passNumber: row.pass_number ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    orderNumber: order?.order_number ?? null,
    guestName: relationCustomerName(customer) ?? relationCustomerName(orderCustomer),
    guestEmail: customer?.email ?? orderCustomer?.email ?? null,
    eventOrExperience: eventContext.eventTitle,
    eventImageUrl: eventContext.eventImageUrl,
    eventCapacity: eventContext.eventCapacity,
    eventStartsAt: eventContext.eventStartsAt,
    eventEndsAt: eventContext.eventEndsAt,
    ticketTypeName: ticketType?.name ?? null,
    ticketCapacity: eventContext.ticketCapacity,
    purchaseSource: order?.source ?? reservation?.source ?? metadataText(row.metadata, ['source', 'purchaseSource']) ?? null,
    purchasedAt: order?.created_at ?? reservation?.created_at ?? row.issued_at ?? row.created_at,
    orderTotal: numberOrNull(order?.total),
    reservationTotal: numberOrNull(reservation?.total),
    peopleCount: row.event_ticket_type_id ? 1 : reservation?.people_count ?? null,
    status: row.status,
    validFrom: row.valid_from ?? null,
    validUntil,
    usedAt: row.used_at ?? null,
    issuedAt: row.issued_at ?? row.created_at,
    revokedAt: row.revoked_at ?? null,
    revocationReason: row.revocation_reason ?? null,
    createdAt: row.created_at,
  }
}

function isEntryPassRow(row: PassRow) {
  const metadataAccessType = typeof row.metadata?.accessType === 'string' ? row.metadata.accessType : null
  return !['wine_order', 'paid_order'].includes(metadataAccessType ?? '')
    && Boolean(row.reservation_id || row.event_ticket_type_id)
}

function isForbiddenCredentialType(accessType?: string | null) {
  return accessType === 'wine_order' || accessType === 'paid_order'
}

function mapCheckin(row: CheckinRow) {
  const pass = firstRelation(row.access_passes)
  const reservation = firstRelation(pass?.reservations)
  const ticketType = firstRelation(pass?.event_ticket_types)
  const order = firstRelation(pass?.orders)
  const customer = firstRelation(reservation?.customers)
  const orderCustomer = firstRelation(order?.customers)
  const eventContext = passEventContext({ reservation, ticketType, metadata: pass?.metadata })
  const validUntil = displayValidUntil(pass?.valid_until ?? null, eventContext.eventStartsAt, eventContext.eventEndsAt)
  return {
    id: row.id,
    accessPassId: row.access_pass_id,
    passNumber: pass?.pass_number ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    orderNumber: order?.order_number ?? null,
    guestName: relationCustomerName(customer) ?? relationCustomerName(orderCustomer),
    guestEmail: customer?.email ?? orderCustomer?.email ?? null,
    eventId: eventContext.eventId,
    eventOrExperience: eventContext.eventTitle,
    eventImageUrl: eventContext.eventImageUrl,
    eventCapacity: eventContext.eventCapacity,
    eventStartsAt: eventContext.eventStartsAt,
    eventEndsAt: eventContext.eventEndsAt,
    ticketTypeName: ticketType?.name ?? null,
    purchaseSource: order?.source ?? reservation?.source ?? metadataText(pass?.metadata, ['source', 'purchaseSource']) ?? null,
    purchasedAt: order?.created_at ?? reservation?.created_at ?? pass?.issued_at ?? row.created_at ?? null,
    orderTotal: numberOrNull(order?.total ?? reservation?.total),
    validUntil,
    passStatus: pass?.status ?? null,
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
      .or('reservation_id.not.is.null,event_ticket_type_id.not.is.null')
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  const rows = (assertNoError<PassRow[]>(result).data ?? []).filter(isEntryPassRow)
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
  if (!isEntryPassRow(row)) throw httpError(404, 'Pase no encontrado')
  return { data: mapPass(row) }
}

export async function issueAccessPass(payload: IssueAccessPassPayload, user: UserContext) {
  requireOperationRole(user, checkinRoles)
  if (!payload.reservationId && !payload.eventTicketTypeId) {
    throw httpError(422, 'Las compras de vino y comprobantes de pago se gestionan en pedidos y logística; no generan QR de entrada.')
  }
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
  return { data: { ...pass.data, qrToken: token, qrPayload: publicAccessUrl(token) } }
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
  const validation = result.data as ValidationResult
  if (isForbiddenCredentialType(validation.accessType)) {
    throw httpError(422, 'Este QR no corresponde a una entrada o reservación.')
  }
  return { data: validation }
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
