import { randomBytes, randomUUID } from 'crypto'
import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { createControlNotification } from '../notifications/notifications.service'
import {
  assertNoError,
  httpError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { revokeAppleSignInTokensForUser } from '../auth/appleSignIn.service'
import {
  createSignedAccountDeletionToken,
  decryptServerSecret,
  encryptServerSecret,
  sha256,
  verifySignedAccountDeletionToken,
} from './privacyCrypto'
import type {
  AccountDeletionListQuery,
  AccountDeletionStatus,
  AuthenticatedAccountDeletionRequestPayload,
  ConfirmAccountDeletionPayload,
  PatchAccountDeletionRequestPayload,
  PublicAccountDeletionRequestPayload,
} from './privacy.schemas'

const privacyReadRoles = ['super_admin', 'admin', 'operations', 'finance']
const privacyWriteRoles = ['super_admin', 'admin', 'operations']
const controlStatuses: AccountDeletionStatus[] = ['pending_processing', 'in_progress', 'completed', 'technical_error']

type PrivacyUserContext = UserContext & {
  email?: string | null
  displayName?: string | null
}

type DeletionRequestSource = 'public_web' | 'mobile_app' | 'admin'

type DeletionRequestRow = {
  id: string
  request_number: string
  user_id?: string | null
  customer_id?: string | null
  email: string
  requested_name?: string | null
  source: DeletionRequestSource
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
  request_context?: Record<string, unknown> | null
  confirmation_token_hash?: string | null
  confirmation_sent_at?: string | null
  confirmation_expires_at?: string | null
  confirmation_used_at?: string | null
  confirmed_at?: string | null
  processing_started_at?: string | null
  processing_due_at?: string | null
  technical_error_at?: string | null
  technical_error_code?: string | null
  sessions_revoked_at?: string | null
  auth_deleted_at?: string | null
  apple_token_revoked_at?: string | null
  apple_token_revoke_status?: string | null
  personal_data_erased_at?: string | null
  completion_email_sent_at?: string | null
  session_token_ciphertext?: string | null
  deletion_summary?: Record<string, unknown> | null
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

type DeletionActionSummary = {
  deleted: string[]
  anonymized: string[]
  retained: string[]
  skipped: string[]
  auth: Record<string, unknown>
  apple: Record<string, unknown>
}

const allowedTransitions: Record<AccountDeletionStatus, AccountDeletionStatus[]> = {
  awaiting_email_confirmation: [],
  pending_processing: ['in_progress', 'technical_error'],
  in_progress: ['technical_error'],
  completed: [],
  technical_error: ['in_progress'],
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function requestNumber() {
  return `DEL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function numberFromEnv(value: string | number | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback
}

function processingDays() {
  return numberFromEnv(env.ACCOUNT_DELETION_PROCESSING_DAYS, 30)
}

function confirmationTtlHours() {
  return numberFromEnv(env.ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS, 24)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function processingWindowLabel(locale: 'es' | 'en' | string | null | undefined) {
  const days = processingDays()
  return locale === 'en' || locale === 'en-US'
    ? `${days} calendar day${days === 1 ? '' : 's'}`
    : `${days} días naturales`
}

function confirmationBaseUrl() {
  const candidates = [
    env.ACCOUNT_DELETION_CONFIRM_BASE_URL,
    process.env.PUBLIC_CUSTOMER_APP_URL,
    process.env.CUSTOMER_APP_URL,
    process.env.VITE_APP_URL,
    env.FRONTEND_URL,
  ]
  const externalBase = candidates.find((value) => {
    if (!value) return false
    return !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value)
  })
  return (externalBase || 'https://admhaciendadeletras.com').replace(/\/+$/, '')
}

function confirmationUrl(token: string) {
  const base = confirmationBaseUrl()
  try {
    const url = new URL(`${base}/eliminar-cuenta/confirmar`)
    url.searchParams.set('token', token)
    return url.toString()
  } catch {
    return `https://admhaciendadeletras.com/eliminar-cuenta/confirmar?token=${encodeURIComponent(token)}`
  }
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
    confirmationSentAt: row.confirmation_sent_at ?? null,
    confirmationExpiresAt: row.confirmation_expires_at ?? null,
    confirmationUsedAt: row.confirmation_used_at ?? null,
    confirmedAt: row.confirmed_at ?? null,
    processingStartedAt: row.processing_started_at ?? null,
    processingDueAt: row.processing_due_at ?? null,
    technicalErrorAt: row.technical_error_at ?? null,
    technicalErrorCode: row.technical_error_code ?? null,
    sessionsRevokedAt: row.sessions_revoked_at ?? null,
    authDeletedAt: row.auth_deleted_at ?? null,
    appleTokenRevokedAt: row.apple_token_revoked_at ?? null,
    appleTokenRevokeStatus: row.apple_token_revoke_status ?? null,
    personalDataErasedAt: row.personal_data_erased_at ?? null,
    completionEmailSentAt: row.completion_email_sent_at ?? null,
    processingWindowDays: processingDays(),
    adminNotes: row.admin_notes ?? null,
    retentionNotes: row.retention_notes ?? null,
    deletionScope: row.deletion_scope ?? {},
    deletionSummary: row.deletion_summary ?? {},
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

function missingDatabaseObject(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : ''
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message).toLowerCase()
    : error instanceof Error ? error.message.toLowerCase() : ''
  return code === '42P01' || code === '42703' || message.includes('does not exist') || message.includes('schema cache')
}

function technicalErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'technical_error').slice(0, 80)
  }
  if (error instanceof Error && error.message) {
    return error.message.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80) || 'technical_error'
  }
  return 'technical_error'
}

async function activeRequestByEmail(email: string) {
  const result = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('email', email)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return assertNoError<DeletionRequestRow | null>(result).data
}

async function findCustomerByEmail(email: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,first_name,last_name')
    .eq('email', email)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle()
  return assertNoError<{
    id: string
    user_id?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null>(result).data
}

async function findCustomerByUserId(userId: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,email,first_name,last_name')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return assertNoError<{
    id: string
    email?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null>(result).data
}

async function sendRequiredTransactionalEmail(input: Parameters<typeof enqueueAndProcessTransactionalEmail>[0]) {
  const result = await enqueueAndProcessTransactionalEmail(input)
  const status = result.outbox.status
  if (!['sent', 'delivered'].includes(status)) {
    throw httpError(503, 'No fue posible enviar el correo transaccional requerido')
  }
  return result
}

async function issueConfirmationEmail(row: DeletionRequestRow, locale: 'es' | 'en') {
  if (row.status !== 'awaiting_email_confirmation') {
    return { row, emailStatus: null as string | null }
  }
  const expiresAt = addHours(new Date(), confirmationTtlHours())
  const token = createSignedAccountDeletionToken({ requestId: row.id, expiresAt })
  const tokenHash = sha256(token)
  const sentAt = new Date().toISOString()
  const updatedResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .update({
      confirmation_token_hash: tokenHash,
      confirmation_sent_at: sentAt,
      confirmation_expires_at: expiresAt.toISOString(),
      confirmation_used_at: null,
    })
    .eq('id', row.id)
    .select('*')
    .single()
  const updated = assertNoError<DeletionRequestRow>(updatedResult).data

  const emailResult = await sendRequiredTransactionalEmail({
    eventType: 'account_deletion.confirmation',
    aggregateType: 'account_deletion_requests',
    aggregateId: updated.id,
    customerId: updated.customer_id ?? null,
    userId: updated.user_id ?? null,
    recipientEmail: updated.email,
    locale,
    payload: {
      customerName: updated.requested_name ?? null,
      requestNumber: updated.request_number,
      processingWindow: processingWindowLabel(locale),
      confirmationExpiresAt: expiresAt.toISOString(),
      ctaUrl: confirmationUrl(token),
    },
    idempotencyKey: `account_deletion.confirmation:${updated.id}:${tokenHash.slice(0, 18)}`,
  })

  return { row: updated, emailStatus: emailResult.outbox.status }
}

async function insertRequest(input: {
  email: string
  name?: string | null
  source: DeletionRequestSource
  userId?: string | null
  customerId?: string | null
  locale: 'es' | 'en'
  requestId?: string | null
  accessToken?: string | null
}) {
  const now = new Date().toISOString()
  const id = randomUUID()
  const expiresAt = addHours(new Date(), confirmationTtlHours())
  const token = createSignedAccountDeletionToken({ requestId: id, expiresAt })
  const tokenHash = sha256(token)
  const result = await supabaseAdminClient
    .from('account_deletion_requests')
    .insert({
      id,
      request_number: requestNumber(),
      user_id: input.userId ?? null,
      customer_id: input.customerId ?? null,
      email: input.email,
      requested_name: input.name?.trim() || null,
      source: input.source,
      status: 'awaiting_email_confirmation',
      explicit_confirmation_at: now,
      legal_retention_acknowledged_at: now,
      confirmation_token_hash: tokenHash,
      confirmation_sent_at: now,
      confirmation_expires_at: expiresAt.toISOString(),
      session_token_ciphertext: encryptServerSecret(input.accessToken),
      request_context: {
        locale: input.locale,
        requestId: input.requestId ?? null,
        processingWindowDays: processingDays(),
      },
    })
    .select('*')
    .single()

  if (result.error && result.error.code === '23505') return activeRequestByEmail(input.email)
  const row = assertNoError<DeletionRequestRow>(result).data
  await sendRequiredTransactionalEmail({
    eventType: 'account_deletion.confirmation',
    aggregateType: 'account_deletion_requests',
    aggregateId: row.id,
    customerId: row.customer_id ?? null,
    userId: row.user_id ?? null,
    recipientEmail: row.email,
    locale: input.locale,
    payload: {
      customerName: row.requested_name ?? null,
      requestNumber: row.request_number,
      processingWindow: processingWindowLabel(input.locale),
      confirmationExpiresAt: expiresAt.toISOString(),
      ctaUrl: confirmationUrl(token),
    },
    idempotencyKey: `account_deletion.confirmation:${row.id}:${tokenHash.slice(0, 18)}`,
  })
  return row
}

export async function createPublicAccountDeletionRequest(
  payload: PublicAccountDeletionRequestPayload,
  requestId?: string | null,
) {
  const email = normalizeEmail(payload.email)
  const customer = await findCustomerByEmail(email)
  if (!customer) return { accepted: true as const }

  const existing = await activeRequestByEmail(email)
  if (existing) {
    await issueConfirmationEmail(existing, payload.locale)
    return { accepted: true as const }
  }

  await insertRequest({
    email,
    name: payload.name,
    source: 'public_web',
    userId: customer.user_id ?? null,
    customerId: customer.id,
    locale: payload.locale,
    requestId,
  })

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
  if (existing) {
    const issued = await issueConfirmationEmail(existing, payload.locale)
    return { data: mapRequest(issued.row), duplicate: true, confirmationEmailStatus: issued.emailStatus }
  }

  const fallbackName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
  const row = await insertRequest({
    email,
    name: payload.name || user.displayName || fallbackName || null,
    source: 'mobile_app',
    userId: user.userId,
    customerId: customer?.id ?? null,
    locale: payload.locale,
    requestId,
    accessToken: user.accessToken,
  })
  if (!row) throw httpError(500, 'No fue posible registrar la solicitud')
  return { data: mapRequest(row), duplicate: false, confirmationEmailStatus: 'sent' }
}

async function markAccountPendingInAuth(row: DeletionRequestRow, confirmedAt: string) {
  if (!row.user_id) return { status: 'not_available' as const }
  const current = await supabaseAdminClient.auth.admin.getUserById(row.user_id)
  if (current.error || !current.data.user) return { status: 'auth_user_not_found' as const }

  const update = await supabaseAdminClient.auth.admin.updateUserById(row.user_id, {
    ban_duration: `${processingDays() * 24}h`,
    app_metadata: {
      ...(current.data.user.app_metadata ?? {}),
      account_deletion_status: 'pending_processing',
      account_deletion_request_id: row.id,
      account_deletion_confirmed_at: confirmedAt,
    },
  })
  if (update.error) throw update.error

  const accessToken = decryptServerSecret(row.session_token_ciphertext)
  if (!accessToken) return { status: 'metadata_marked_no_session_token' as const }

  const signOut = await supabaseAdminClient.auth.admin.signOut(accessToken, 'global')
  if (signOut.error) return { status: 'metadata_marked_signout_failed' as const, errorCode: signOut.error.message }
  return { status: 'revoked' as const }
}

export async function confirmAccountDeletion(payload: ConfirmAccountDeletionPayload) {
  const verified = verifySignedAccountDeletionToken(payload.token)
  if (!verified) throw httpError(422, 'El enlace de confirmación no es válido o expiró')

  const tokenHash = sha256(payload.token)
  const result = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('id', verified.requestId)
    .eq('confirmation_token_hash', tokenHash)
    .maybeSingle()
  const row = assertNoError<DeletionRequestRow | null>(result).data
  if (!row) throw httpError(422, 'El enlace de confirmación ya fue usado, no es válido o expiró')
  if (row.status !== 'awaiting_email_confirmation') throw httpError(409, 'La eliminación de esta cuenta ya fue confirmada')
  if (!row.confirmation_expires_at || new Date(row.confirmation_expires_at).getTime() < Date.now()) {
    throw httpError(422, 'El enlace de confirmación expiró. Inicia nuevamente el proceso desde la app.')
  }

  const confirmedAt = new Date().toISOString()
  const dueAt = addDays(new Date(), processingDays()).toISOString()
  const authState = await markAccountPendingInAuth(row, confirmedAt)
  const updateResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .update({
      status: 'pending_processing',
      identity_verified_at: confirmedAt,
      confirmed_at: confirmedAt,
      confirmation_used_at: confirmedAt,
      confirmation_token_hash: null,
      processing_due_at: dueAt,
      sessions_revoked_at: authState.status === 'revoked' ? confirmedAt : null,
      deletion_summary: {
        ...(row.deletion_summary ?? {}),
        authSession: authState,
      },
    })
    .eq('id', row.id)
    .select('*')
    .single()
  const updated = assertNoError<DeletionRequestRow>(updateResult).data

  await createControlNotification({
    type: 'account_deletion_confirmed',
    title: 'Orden confirmada de eliminación',
    body: `${updated.requested_name || 'Un cliente'} confirmó la eliminación de cuenta. Pendiente de procesar.`,
    deepLink: `/control/eliminacion-cuentas?requestId=${encodeURIComponent(updated.id)}`,
    idempotencyKey: `account_deletion_confirmed:${updated.id}`,
    data: { requestId: updated.id, customerId: updated.customer_id ?? null, source: updated.source },
  }).catch(() => undefined)

  return {
    data: {
      requestNumber: updated.request_number,
      status: updated.status,
      confirmedAt: updated.confirmed_at,
      processingDueAt: updated.processing_due_at,
      processingWindowDays: processingDays(),
    },
  }
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
  else request = request.in('status', controlStatuses)
  if (query.source) request = request.eq('source', query.source)
  if (query.search) {
    const safeSearch = query.search.replace(/[^\p{L}\p{N}@._+\-\s]/gu, ' ').trim()
    if (safeSearch) {
      request = request.or(`request_number.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,requested_name.ilike.%${safeSearch}%`)
    }
  }
  const result = await request
  const { data, count } = assertNoError<DeletionRequestRow[]>(result)
  return { data: ((data ?? []) as DeletionRequestRow[]).map(mapRequest), count: count ?? 0 }
}

export async function getAccountDeletionRequest(id: string, user: UserContext) {
  requireOperationRole(user, privacyReadRoles)
  const requestResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<DeletionRequestRow | null>(requestResult).data
  if (!row) throw httpError(404, 'Orden de eliminación no encontrada')

  const historyResult = await supabaseAdminClient
    .from('account_deletion_request_history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: false })
  const history = assertNoError<DeletionHistoryRow[]>(historyResult).data
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
  const current = assertNoError<DeletionRequestRow | null>(currentResult).data
  if (!current) throw httpError(404, 'Orden no encontrada')
  if (current.status === 'awaiting_email_confirmation') throw httpError(409, 'La orden aún no fue confirmada por correo')
  if (current.status === 'completed') throw httpError(409, 'La orden ya fue completada')

  if (payload.status && payload.status !== current.status) {
    if (!allowedTransitions[current.status].includes(payload.status)) {
      throw httpError(422, 'La transición operativa no está permitida')
    }
    if (payload.status === 'technical_error' && !payload.adminNotes?.trim() && !current.admin_notes?.trim()) {
      throw httpError(422, 'Describe el error técnico antes de pausar el procesamiento')
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
    if (payload.status === 'in_progress') {
      updates.processing_started_at = current.processing_started_at ?? now
      updates.technical_error_at = null
      updates.technical_error_code = null
    }
    if (payload.status === 'technical_error') {
      updates.technical_error_at = now
      updates.technical_error_code = 'manual_technical_error'
    }
  }

  const updateResult = await supabaseAdminClient
    .from('account_deletion_requests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  const updated = assertNoError<DeletionRequestRow>(updateResult).data

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId,
    action: 'account_deletion_order_updated',
    entity_type: 'account_deletion_requests',
    entity_id: id,
    before_data: { status: current.status },
    after_data: { status: updated.status, requestNumber: updated.request_number },
  })

  return { data: mapRequest(updated) }
}

async function collectIds(table: string, column: string, value?: string | null) {
  if (!value) return []
  try {
    const result = await supabaseAdminClient.from(table).select('id').eq(column, value)
    if (result.error) {
      if (missingDatabaseObject(result.error)) return []
      assertNoError(result)
    }
    return ((result.data ?? []) as Array<{ id?: string | null }>).map((row) => row.id).filter((id): id is string => Boolean(id))
  } catch (error) {
    if (missingDatabaseObject(error)) return []
    throw error
  }
}

async function safeAction(
  summary: DeletionActionSummary,
  bucket: 'deleted' | 'anonymized',
  label: string,
  action: () => PromiseLike<{ error?: unknown } | unknown>,
) {
  try {
    const result = await action()
    if (result && typeof result === 'object' && 'error' in result && (result as { error?: unknown }).error) {
      const error = (result as { error?: unknown }).error
      if (missingDatabaseObject(error)) {
        summary.skipped.push(`${label}: estructura no disponible`)
        return
      }
      assertNoError({ data: null, error })
    }
    summary[bucket].push(label)
  } catch (error) {
    if (missingDatabaseObject(error)) {
      summary.skipped.push(`${label}: estructura no disponible`)
      return
    }
    throw error
  }
}

function redactedJson(now: string, reason: string) {
  return {
    redacted: true,
    redactedAt: now,
    reason,
  }
}

async function erasePersonalData(row: DeletionRequestRow, actorUserId: string, anonymizedEmail: string, shortHash: string) {
  const now = new Date().toISOString()
  const summary: DeletionActionSummary = {
    deleted: [],
    anonymized: [],
    retained: [
      'orders: importes, moneda, folio y estado se conservan para obligaciones fiscales/operativas',
      'payments: importes, proveedor, estado y referencia de pago se conservan para obligaciones fiscales/contracargos',
      'reservations/access_passes/checkins: folios, estados y evidencia operativa se conservan sin datos personales directos',
      'audit_logs: bitácora de seguridad y operación se conserva con referencias auth en null cuando aplique',
    ],
    skipped: [],
    auth: {},
    apple: {},
  }
  const userId = row.user_id ?? null
  const customerId = row.customer_id ?? null
  const deletedLabel = `Cliente eliminado ${shortHash}`
  const orderIds = customerId ? await collectIds('orders', 'customer_id', customerId) : []
  const reservationIds = customerId ? await collectIds('reservations', 'customer_id', customerId) : []
  const outboxIds = [
    ...await collectIds('email_outbox', 'recipient_user_id', userId),
    ...await collectIds('email_outbox', 'recipient_customer_id', customerId),
  ]

  if (userId) {
    await safeAction(summary, 'anonymized', 'profiles: nombre, teléfono, avatar y fecha de nacimiento', () =>
      supabaseAdminClient.from('profiles').update({
        first_name: null,
        last_name: null,
        display_name: deletedLabel,
        phone: null,
        avatar_url: null,
        birth_date: null,
        updated_at: now,
      }).eq('id', userId))
    await safeAction(summary, 'deleted', 'user_preferences', () => supabaseAdminClient.from('user_preferences').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'user_roles', () => supabaseAdminClient.from('user_roles').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'addresses', () => supabaseAdminClient.from('addresses').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'notification_devices', () => supabaseAdminClient.from('notification_devices').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'carts y cart_items por usuario', () => supabaseAdminClient.from('carts').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'customer_payment_profiles por usuario', () => supabaseAdminClient.from('customer_payment_profiles').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'communication_preferences por usuario', () => supabaseAdminClient.from('communication_preferences').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'sommelier_usage por usuario', () => supabaseAdminClient.from('sommelier_usage').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'sommelier_feedback por usuario', () => supabaseAdminClient.from('sommelier_feedback').delete().eq('user_id', userId))
    await safeAction(summary, 'anonymized', 'financial_access_grants: revocación operativa', () =>
      supabaseAdminClient.from('financial_access_grants').update({ revoked_at: now }).eq('user_id', userId).is('revoked_at', null))
    await safeAction(summary, 'deleted', 'control_user_site_scopes', () => supabaseAdminClient.from('control_user_site_scopes').delete().eq('user_id', userId))
  }

  if (customerId) {
    await safeAction(summary, 'deleted', 'customer_addresses', () => supabaseAdminClient.from('customer_addresses').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'customer_notes', () => supabaseAdminClient.from('customer_notes').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'customer_tag_assignments', () => supabaseAdminClient.from('customer_tag_assignments').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'campaign_recipients', () => supabaseAdminClient.from('campaign_recipients').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'notifications', () => supabaseAdminClient.from('notifications').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'carts y cart_items por cliente', () => supabaseAdminClient.from('carts').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'customer_app_events', () => supabaseAdminClient.from('customer_app_events').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'sommelier_usage por cliente', () => supabaseAdminClient.from('sommelier_usage').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'sommelier_sessions y mensajes', () => supabaseAdminClient.from('sommelier_sessions').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'customer_payment_profiles por cliente', () => supabaseAdminClient.from('customer_payment_profiles').delete().eq('customer_id', customerId))
    await safeAction(summary, 'deleted', 'communication_preferences por cliente', () => supabaseAdminClient.from('communication_preferences').delete().eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'customers: identidad y contacto desvinculados', () =>
      supabaseAdminClient.from('customers').update({
        user_id: null,
        first_name: 'Cliente',
        last_name: `Eliminado ${shortHash}`,
        display_name: deletedLabel,
        email: null,
        phone: null,
        phone_normalized: null,
        birth_date: null,
        notes: null,
        segment: 'inactivo',
        marketing_email_consent: false,
        marketing_push_consent: false,
        consent_source: 'account_deletion',
        consent_updated_at: now,
        archived_at: now,
        updated_by: actorUserId,
        metadata: {
          accountDeleted: true,
          accountDeletionRequestId: row.id,
          originalEmailHash: sha256(row.email),
          anonymizedAt: now,
        },
        updated_at: now,
      }).eq('id', customerId))
  }

  if (userId) {
    await safeAction(summary, 'deleted', 'notifications por usuario', () => supabaseAdminClient.from('notifications').delete().eq('user_id', userId))
    await safeAction(summary, 'deleted', 'customer_app_events por entidad de usuario', () => supabaseAdminClient.from('customer_app_events').delete().eq('entity_id', userId))
    await safeAction(summary, 'anonymized', 'reservations: user_id y notas personales', () =>
      supabaseAdminClient.from('reservations').update({ user_id: null, customer_notes: null, updated_at: now }).eq('user_id', userId))
    await safeAction(summary, 'anonymized', 'orders por usuario: datos de entrega/facturación redacted', () =>
      supabaseAdminClient.from('orders').update({
        user_id: null,
        billing_address: redactedJson(now, 'account_deletion'),
        shipping_address: redactedJson(now, 'account_deletion'),
        updated_at: now,
      }).eq('user_id', userId))
  }

  if (customerId) {
    await safeAction(summary, 'anonymized', 'reservations: notas visibles del cliente', () =>
      supabaseAdminClient.from('reservations').update({ user_id: null, customer_notes: null, updated_at: now }).eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'orders: direcciones snapshot redacted', () =>
      supabaseAdminClient.from('orders').update({
        user_id: null,
        billing_address: redactedJson(now, 'account_deletion'),
        shipping_address: redactedJson(now, 'account_deletion'),
        updated_at: now,
      }).eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'quote_requests: contacto y notas personales', () =>
      supabaseAdminClient.from('quote_requests').update({
        user_id: null,
        contact_first_name: 'Cliente',
        contact_last_name: `Eliminado ${shortHash}`,
        contact_email: anonymizedEmail,
        contact_phone: '0000000000',
        company_name: null,
        notes: null,
        updated_at: now,
      }).eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'order_shipping_addresses: destinatario y domicilio', () =>
      supabaseAdminClient.from('order_shipping_addresses').update({
        user_id: null,
        recipient_name: deletedLabel,
        phone: '0000000000',
        email: anonymizedEmail,
        line1: 'Dirección eliminada por privacidad',
        line2: null,
        neighborhood: null,
        city: 'Eliminado',
        state: 'Eliminado',
        postal_code: '00000',
        country: 'MX',
        "references": null,
      }).eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'memberships: renovación desactivada', () =>
      supabaseAdminClient.from('memberships').update({ auto_renew: false, status: 'cancelled', ends_at: now, updated_at: now }).eq('customer_id', customerId))
  }

  if (reservationIds.length) {
    await safeAction(summary, 'anonymized', 'reservation_guests: datos de acompañantes', () =>
      supabaseAdminClient.from('reservation_guests').update({
        full_name: 'Invitado eliminado',
        email: null,
        phone: null,
        dietary_notes: null,
      }).in('reservation_id', reservationIds))
    await safeAction(summary, 'anonymized', 'access_passes de reservaciones: metadatos personales', () =>
      supabaseAdminClient.from('access_passes').update({
        metadata: redactedJson(now, 'account_deletion'),
      }).in('reservation_id', reservationIds))
  }

  if (orderIds.length) {
    await safeAction(summary, 'anonymized', 'payments: provider_response redacted', () =>
      supabaseAdminClient.from('payments').update({
        provider_response: redactedJson(now, 'account_deletion_retained_payment_record'),
        updated_at: now,
      }).in('order_id', orderIds))
    await safeAction(summary, 'anonymized', 'shipments: destino y metadatos personales', () =>
      supabaseAdminClient.from('shipments').update({
        destination: 'Dirección eliminada por privacidad',
        metadata: redactedJson(now, 'account_deletion'),
        updated_at: now,
      }).in('order_id', orderIds))
    await safeAction(summary, 'anonymized', 'access_passes de órdenes: metadatos personales', () =>
      supabaseAdminClient.from('access_passes').update({
        metadata: redactedJson(now, 'account_deletion'),
      }).in('order_id', orderIds))
  }

  if (outboxIds.length) {
    await safeAction(summary, 'anonymized', 'email_deliveries: payload del proveedor', () =>
      supabaseAdminClient.from('email_deliveries').update({
        payload: redactedJson(now, 'account_deletion'),
      }).in('email_outbox_id', outboxIds))
  }

  if (userId) {
    await safeAction(summary, 'anonymized', 'communication_events: payload y vínculos', () =>
      supabaseAdminClient.from('communication_events').update({
        user_id: null,
        customer_id: null,
        payload: redactedJson(now, 'account_deletion'),
        updated_at: now,
      }).eq('user_id', userId))
    await safeAction(summary, 'anonymized', 'email_outbox: destinatario y payload', () =>
      supabaseAdminClient.from('email_outbox').update({
        recipient_user_id: null,
        recipient_customer_id: null,
        recipient_email: anonymizedEmail,
        payload: redactedJson(now, 'account_deletion'),
        html_body: 'Contenido eliminado por privacidad.',
        text_body: 'Contenido eliminado por privacidad.',
        updated_at: now,
      }).eq('recipient_user_id', userId))
  }

  if (customerId) {
    await safeAction(summary, 'anonymized', 'communication_events por cliente: payload y vínculos', () =>
      supabaseAdminClient.from('communication_events').update({
        user_id: null,
        customer_id: null,
        payload: redactedJson(now, 'account_deletion'),
        updated_at: now,
      }).eq('customer_id', customerId))
    await safeAction(summary, 'anonymized', 'email_outbox por cliente: destinatario y payload', () =>
      supabaseAdminClient.from('email_outbox').update({
        recipient_user_id: null,
        recipient_customer_id: null,
        recipient_email: anonymizedEmail,
        payload: redactedJson(now, 'account_deletion'),
        html_body: 'Contenido eliminado por privacidad.',
        text_body: 'Contenido eliminado por privacidad.',
        updated_at: now,
      }).eq('recipient_customer_id', customerId))
  }

  return summary
}

async function sendCompletionEmail(row: DeletionRequestRow, summary: DeletionActionSummary, locale: string | null | undefined) {
  const result = await sendRequiredTransactionalEmail({
    eventType: 'account_deletion.completed',
    aggregateType: 'account_deletion_requests',
    aggregateId: row.id,
    customerId: row.customer_id ?? null,
    userId: null,
    recipientEmail: row.email,
    locale,
    payload: {
      customerName: row.requested_name ?? null,
      requestNumber: row.request_number,
      processingWindow: processingWindowLabel(locale),
      deletedData: summary.deleted.length,
      anonymizedData: summary.anonymized.length,
    },
    idempotencyKey: `account_deletion.completed:${row.id}`,
  })
  return result.outbox.status
}

async function deleteAuthUser(row: DeletionRequestRow) {
  if (!row.user_id) return { status: 'not_available' as const, deletedAt: null as string | null }
  const current = await supabaseAdminClient.auth.admin.getUserById(row.user_id)
  if (current.error || !current.data.user) return { status: 'already_deleted' as const, deletedAt: new Date().toISOString() }
  const result = await supabaseAdminClient.auth.admin.deleteUser(row.user_id, false)
  if (result.error) throw result.error
  return { status: 'deleted' as const, deletedAt: new Date().toISOString() }
}

export async function processAccountDeletionRequest(id: string, user: UserContext) {
  requireOperationRole(user, privacyWriteRoles)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const currentResult = await supabaseAdminClient.from('account_deletion_requests').select('*').eq('id', id).maybeSingle()
  const current = assertNoError<DeletionRequestRow | null>(currentResult).data
  if (!current) throw httpError(404, 'Orden no encontrada')
  if (current.status === 'awaiting_email_confirmation') throw httpError(409, 'La eliminación aún no fue confirmada por correo')
  if (current.status === 'completed') return { data: mapRequest(current) }

  const now = new Date().toISOString()
  await supabaseAdminClient.from('account_deletion_requests').update({
    status: 'in_progress',
    processing_started_at: current.processing_started_at ?? now,
    reviewed_at: now,
    reviewed_by: user.userId,
    technical_error_at: null,
    technical_error_code: null,
  }).eq('id', id)

  const originalEmailHash = sha256(current.email)
  const shortHash = originalEmailHash.slice(0, 10)
  const anonymizedEmail = `deleted+${shortHash}@deleted.invalid`

  try {
    const appleState = current.user_id
      ? await revokeAppleSignInTokensForUser(current.user_id)
      : { status: 'not_available' as const }
    const summary = await erasePersonalData(current, user.userId, anonymizedEmail, shortHash)
    summary.apple = appleState
    const authState = await deleteAuthUser(current)
    summary.auth = authState
    const completionEmailStatus = await sendCompletionEmail(current, summary, current.request_context?.locale as string | null | undefined)

    const completedAt = new Date().toISOString()
    const updateResult = await supabaseAdminClient
      .from('account_deletion_requests')
      .update({
        status: 'completed',
        user_id: null,
        customer_id: null,
        email: anonymizedEmail,
        requested_name: 'Cuenta eliminada',
        completed_at: completedAt,
        completed_by: user.userId,
        auth_deleted_at: authState.deletedAt,
        apple_token_revoked_at: appleState.status === 'revoked' ? completedAt : null,
        apple_token_revoke_status: appleState.status,
        personal_data_erased_at: completedAt,
        completion_email_sent_at: ['sent', 'delivered'].includes(completionEmailStatus) ? completedAt : null,
        session_token_ciphertext: null,
        confirmation_token_hash: null,
        deletion_summary: {
          ...summary,
          originalEmailHash,
          anonymizedEmail,
          completionEmailStatus,
        },
        request_context: redactedJson(completedAt, 'account_deletion_completed'),
      })
      .eq('id', id)
      .select('*')
      .single()
    const updated = assertNoError<DeletionRequestRow>(updateResult).data

    await safeAction(summary, 'anonymized', 'communication_events de eliminación: payload final', () =>
      supabaseAdminClient.from('communication_events').update({
        user_id: null,
        customer_id: null,
        payload: redactedJson(completedAt, 'account_deletion_completed'),
        updated_at: completedAt,
      }).eq('aggregate_type', 'account_deletion_requests').eq('aggregate_id', id))
    await safeAction(summary, 'anonymized', 'email_outbox de eliminación: destinatario final', () =>
      supabaseAdminClient.from('email_outbox').update({
        recipient_user_id: null,
        recipient_customer_id: null,
        recipient_email: anonymizedEmail,
        payload: redactedJson(completedAt, 'account_deletion_completed'),
        html_body: 'Contenido eliminado por privacidad.',
        text_body: 'Contenido eliminado por privacidad.',
        updated_at: completedAt,
      }).eq('idempotency_key', `account_deletion.completed:${id}`))

    await supabaseAdminClient.from('audit_logs').insert({
      actor_user_id: user.userId,
      action: 'account_deletion_completed',
      entity_type: 'account_deletion_requests',
      entity_id: id,
      after_data: {
        requestNumber: current.request_number,
        originalEmailHash,
        deleted: summary.deleted,
        anonymized: summary.anonymized,
        retained: summary.retained,
        apple: appleState,
        auth: authState,
      },
    })

    return { data: mapRequest(updated) }
  } catch (error) {
    const errorCode = technicalErrorCode(error)
    const failed = assertNoError<DeletionRequestRow>(await supabaseAdminClient
      .from('account_deletion_requests')
      .update({
        status: 'technical_error',
        technical_error_at: new Date().toISOString(),
        technical_error_code: errorCode,
        admin_notes: current.admin_notes || 'Error técnico durante el procesamiento de eliminación.',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.userId,
      })
      .eq('id', id)
      .select('*')
      .single()).data
    await supabaseAdminClient.from('audit_logs').insert({
      actor_user_id: user.userId,
      action: 'account_deletion_technical_error',
      entity_type: 'account_deletion_requests',
      entity_id: id,
      after_data: { requestNumber: current.request_number, errorCode },
    })
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw httpError(500, `La orden quedó en Error técnico: ${failed.technical_error_code ?? errorCode}`)
  }
}
