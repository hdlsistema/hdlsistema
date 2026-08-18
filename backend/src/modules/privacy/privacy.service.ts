import { randomBytes } from 'crypto'
import { supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  httpError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { createControlNotification } from '../notifications/notifications.service'
import type {
  AccountDeletionListQuery,
  AccountDeletionStatus,
  AuthenticatedAccountDeletionRequestPayload,
  PatchAccountDeletionRequestPayload,
  PublicAccountDeletionRequestPayload,
} from './privacy.schemas'

const privacyReadRoles = ['super_admin', 'admin', 'operations', 'finance']
const privacyWriteRoles = ['super_admin', 'admin', 'operations']
const closedStatuses: AccountDeletionStatus[] = ['completed', 'rejected', 'cancelled']

type PrivacyUserContext = UserContext & {
  email?: string | null
  displayName?: string | null
}

type DeletionRequestRow = {
  id: string
  request_number: string
  user_id?: string | null
  customer_id?: string | null
  email: string
  requested_name?: string | null
  source: 'public_web' | 'mobile_app' | 'admin'
  status: AccountDeletionStatus
  explicit_confirmation_at: string
  legal_retention_acknowledged_at: string
  identity_verified_at?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  completed_at?: string | null
  completed_by?: string | null
  cancelled_at?: string | null
  cancelled_by?: string | null
  admin_notes?: string | null
  retention_notes?: string | null
  deletion_scope?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type DeletionHistoryRow = {
  id: string
  from_status?: string | null
  to_status: string
  notes?: string | null
  actor_user_id?: string | null
  created_at: string
}

const allowedTransitions: Record<AccountDeletionStatus, AccountDeletionStatus[]> = {
  requested: ['identity_verification', 'confirmed', 'rejected', 'cancelled'],
  identity_verification: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['in_progress', 'rejected', 'cancelled'],
  in_progress: ['completed', 'rejected', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function requestNumber() {
  return `DEL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function mapRequest(row: DeletionRequestRow) {
  return {
    id: row.id,
    requestNumber: row.request_number,
    userId: row.user_id ?? null,
    customerId: row.customer_id ?? null,
    email: row.email,
    requestedName: row.requested_name ?? null,
    source: row.source,
    status: row.status,
    explicitConfirmationAt: row.explicit_confirmation_at,
    legalRetentionAcknowledgedAt: row.legal_retention_acknowledged_at,
    identityVerifiedAt: row.identity_verified_at ?? null,
    reviewedAt: row.reviewed_at ?? null,
    completedAt: row.completed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    adminNotes: row.admin_notes ?? null,
    retentionNotes: row.retention_notes ?? null,
    deletionScope: row.deletion_scope ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapHistory(row: DeletionHistoryRow) {
  return {
    id: row.id,
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status,
    notes: row.notes ?? null,
    actorUserId: row.actor_user_id ?? null,
    createdAt: row.created_at,
  }
}

async function activeRequestByEmail(email: string) {
  const result = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('email', email)
    .not('status', 'in', `(${closedStatuses.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return assertNoError(result).data as DeletionRequestRow | null
}

async function findCustomerByEmail(email: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,first_name,last_name')
    .eq('email', email)
    .limit(1)
    .maybeSingle()
  return assertNoError(result).data as {
    id: string
    user_id?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null
}

async function findCustomerByUserId(userId: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,email,first_name,last_name')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return assertNoError(result).data as {
    id: string
    email?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null
}

async function insertRequest(input: {
  email: string
  name?: string | null
  source: 'public_web' | 'mobile_app' | 'admin'
  userId?: string | null
  customerId?: string | null
  locale: 'es' | 'en'
  requestId?: string | null
}) {
  const now = new Date().toISOString()
  const result = await supabaseAdminClient
    .from('account_deletion_requests')
    .insert({
      request_number: requestNumber(),
      user_id: input.userId ?? null,
      customer_id: input.customerId ?? null,
      email: input.email,
      requested_name: input.name?.trim() || null,
      source: input.source,
      status: 'requested',
      explicit_confirmation_at: now,
      legal_retention_acknowledged_at: now,
      request_context: {
        locale: input.locale,
        requestId: input.requestId ?? null,
      },
    })
    .select('*')
    .single()

  if (result.error && result.error.code === '23505') {
    return activeRequestByEmail(input.email)
  }
  return assertNoError(result).data as DeletionRequestRow
}

export async function createPublicAccountDeletionRequest(
  payload: PublicAccountDeletionRequestPayload,
  requestId?: string | null,
) {
  const email = normalizeEmail(payload.email)
  const existing = await activeRequestByEmail(email)
  if (!existing) {
    const customer = await findCustomerByEmail(email)
    const row = await insertRequest({
      email,
      name: payload.name,
      source: 'public_web',
      userId: customer?.user_id ?? null,
      customerId: customer?.id ?? null,
      locale: payload.locale,
      requestId,
    })
    if (row) {
      void createControlNotification({
        type: 'account_deletion_requested',
        title: 'Solicitud de eliminación de cuenta',
        body: `Solicitud recibida desde la web pública para ${email}.`,
        deepLink: `/control/eliminacion-cuentas?requestId=${encodeURIComponent(row.id)}`,
        idempotencyKey: `account_deletion:${row.id}`,
        data: { requestId: row.id, source: 'public_web' },
      }).catch(() => undefined)
    }
  }

  // La respuesta pública es deliberadamente neutra para no revelar si existe una cuenta.
  return { accepted: true as const }
}

export async function createAuthenticatedAccountDeletionRequest(
  payload: AuthenticatedAccountDeletionRequestPayload,
  user: PrivacyUserContext,
  requestId?: string | null,
) {
  if (!user.userId || !user.email) throw httpError(401, 'La sesión no contiene una cuenta identificable')
  const email = normalizeEmail(user.email)
  const customer = await findCustomerByUserId(user.userId)
  const existing = await activeRequestByEmail(email)
  if (existing) return { data: mapRequest(existing), duplicate: true }

  const fallbackName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
  const row = await insertRequest({
    email,
    name: payload.name || user.displayName || fallbackName || null,
    source: 'mobile_app',
    userId: user.userId,
    customerId: customer?.id ?? null,
    locale: payload.locale,
    requestId,
  })
  if (!row) throw httpError(500, 'No fue posible registrar la solicitud')
  await createControlNotification({
    type: 'account_deletion_requested',
    title: 'Nueva solicitud de eliminación de cuenta',
    body: `${payload.name || user.displayName || fallbackName || 'Un cliente'} envió una solicitud desde la app.`,
    deepLink: `/control/eliminacion-cuentas?requestId=${encodeURIComponent(row.id)}`,
    idempotencyKey: `account_deletion:${row.id}`,
    data: { requestId: row.id, customerId: row.customer_id ?? null, source: 'mobile_app' },
  }).catch(() => undefined)
  return { data: mapRequest(row), duplicate: false }
}

export async function listAccountDeletionRequests(query: AccountDeletionListQuery, user: UserContext) {
  requireOperationRole(user, privacyReadRoles)
  const start = (query.page - 1) * query.perPage
  const end = start + query.perPage - 1
  let request = supabaseAdminClient
    .from('account_deletion_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: query.orderDirection === 'asc' })
    .range(start, end)
  if (query.status) request = request.eq('status', query.status)
  if (query.source) request = request.eq('source', query.source)
  if (query.search) {
    const safeSearch = query.search.replace(/[^\p{L}\p{N}@._+\-\s]/gu, ' ').trim()
    if (safeSearch) {
      request = request.or(`request_number.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,requested_name.ilike.%${safeSearch}%`)
    }
  }
  const result = await request
  const { data, count } = assertNoError(result)
  return { data: ((data ?? []) as DeletionRequestRow[]).map(mapRequest), count: count ?? 0 }
}

export async function getAccountDeletionRequest(id: string, user: UserContext) {
  requireOperationRole(user, privacyReadRoles)
  const requestResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError(requestResult).data as DeletionRequestRow | null
  if (!row) throw httpError(404, 'Solicitud no encontrada')

  const historyResult = await supabaseAdminClient
    .from('account_deletion_request_history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: false })
  const history = assertNoError(historyResult).data as DeletionHistoryRow[]
  return { data: { ...mapRequest(row), history: (history ?? []).map(mapHistory) } }
}

export async function patchAccountDeletionRequest(
  id: string,
  payload: PatchAccountDeletionRequestPayload,
  user: UserContext,
) {
  requireOperationRole(user, privacyWriteRoles)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const currentResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const current = assertNoError(currentResult).data as DeletionRequestRow | null
  if (!current) throw httpError(404, 'Solicitud no encontrada')

  if (payload.status && payload.status !== current.status) {
    if (!allowedTransitions[current.status].includes(payload.status)) {
      throw httpError(422, 'La transición de estado no está permitida')
    }
    if (closedStatuses.includes(payload.status) && !payload.adminNotes?.trim() && !current.admin_notes?.trim()) {
      throw httpError(422, 'Agrega una nota operativa antes de cerrar la solicitud')
    }
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    reviewed_at: now,
    reviewed_by: user.userId,
  }
  if (payload.adminNotes !== undefined) updates.admin_notes = payload.adminNotes?.trim() || null
  if (payload.retentionNotes !== undefined) updates.retention_notes = payload.retentionNotes?.trim() || null
  if (payload.status !== undefined) {
    updates.status = payload.status
    if (payload.status === 'confirmed') updates.identity_verified_at = now
    if (payload.status === 'completed') {
      updates.completed_at = now
      updates.completed_by = user.userId
    }
    if (payload.status === 'cancelled') {
      updates.cancelled_at = now
      updates.cancelled_by = user.userId
    }
  }

  const updateResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  const updated = assertNoError(updateResult).data as DeletionRequestRow

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId,
    action: 'account_deletion_request_updated',
    entity_type: 'account_deletion_requests',
    entity_id: id,
    before_data: { status: current.status },
    after_data: { status: updated.status, requestNumber: updated.request_number },
  })

  return { data: mapRequest(updated) }
}
