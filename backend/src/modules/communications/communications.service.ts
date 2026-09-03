import { supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  httpError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { resendProviderState, sendTransactionalEmail } from './email-provider.service'
import { renderEmailTemplate, normalizeLocale } from './template.service'
import type {
  CommunicationEventType,
  CommunicationPayload,
  EnqueueTransactionalEmailInput,
} from './communications.types'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const retryRoles = ['super_admin', 'admin', 'operations', 'marketing']
const maxAttempts = 3

type ListQuery = {
  status?: string
  eventType?: CommunicationEventType
  page: number
  perPage: number
}

type CommunicationEventRow = {
  id: string
  event_type: CommunicationEventType
  aggregate_type: string
  aggregate_id?: string | null
  customer_id?: string | null
  user_id?: string | null
  locale: string
  payload: CommunicationPayload
  status: string
  idempotency_key: string
  created_at: string
  updated_at: string
}

type EmailOutboxRow = {
  id: string
  communication_event_id: string
  template_key: CommunicationEventType
  recipient_customer_id?: string | null
  recipient_user_id?: string | null
  recipient_email: string
  locale: string
  subject: string
  preheader?: string | null
  html_body: string
  text_body: string
  payload: CommunicationPayload
  status: string
  attempts: number
  max_attempts: number
  scheduled_at: string
  sent_at?: string | null
  delivered_at?: string | null
  failed_at?: string | null
  provider: string
  provider_message_id?: string | null
  error_code?: string | null
  idempotency_key: string
  created_at: string
  updated_at: string
}

function safePayload(payload: CommunicationPayload = {}): CommunicationPayload {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !/(token|secret|password|authorization|header|key)/i.test(key))
      .map(([key, value]) => [
        key,
        typeof value === 'string' && /([?&]token=|account_deletion_confirm)/i.test(value)
          ? '[redacted]'
          : typeof value === 'string' ? value.slice(0, 500) : value,
      ]),
  )
}

function normalizeEmail(email?: string | null) {
  const value = String(email ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ''
}

function publicEmail(row: EmailOutboxRow) {
  return {
    id: row.id,
    eventId: row.communication_event_id,
    templateKey: row.template_key,
    recipientCustomerId: row.recipient_customer_id ?? null,
    recipientUserId: row.recipient_user_id ?? null,
    recipientEmail: row.recipient_email,
    locale: row.locale,
    subject: row.subject,
    preheader: row.preheader ?? null,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    failedAt: row.failed_at ?? null,
    provider: row.provider,
    providerMessageId: row.provider_message_id ?? null,
    errorCode: row.error_code ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function publicEvent(row: CommunicationEventRow, email?: EmailOutboxRow | null) {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id ?? null,
    customerId: row.customer_id ?? null,
    userId: row.user_id ?? null,
    locale: row.locale,
    status: row.status,
    payload: safePayload(row.payload),
    email: email ? publicEmail(email) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function errorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'provider_error').slice(0, 80)
  }
  return 'provider_error'
}

async function findEventByKey(idempotencyKey: string) {
  const result = await supabaseAdminClient
    .from('communication_events')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  return assertNoError<CommunicationEventRow | null>(result).data
}

async function findOutboxByKey(idempotencyKey: string) {
  const result = await supabaseAdminClient
    .from('email_outbox')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  return assertNoError<EmailOutboxRow | null>(result).data
}

async function findOutboxById(id: string) {
  const result = await supabaseAdminClient
    .from('email_outbox')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return assertNoError<EmailOutboxRow | null>(result).data
}

export async function enqueueTransactionalEmail(input: EnqueueTransactionalEmailInput) {
  const recipientEmail = normalizeEmail(input.recipientEmail)
  const locale = normalizeLocale(input.locale)
  const template = renderEmailTemplate(input.eventType, input.payload, locale)
  const payload = safePayload(input.payload)
  const idempotencyKey = input.idempotencyKey ??
    `${input.eventType}:${input.aggregateType}:${input.aggregateId ?? 'none'}:${recipientEmail || 'no-recipient'}`

  let event = await findEventByKey(idempotencyKey)
  if (!event) {
    const result = await supabaseAdminClient
      .from('communication_events')
      .insert({
        event_type: input.eventType,
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId ?? null,
        customer_id: input.customerId ?? null,
        user_id: input.userId ?? null,
        locale,
        payload,
        status: recipientEmail ? 'queued' : 'blocked',
        idempotency_key: idempotencyKey,
      })
      .select('*')
      .single()
    event = assertNoError<CommunicationEventRow>(result).data
  }

  let outbox = await findOutboxByKey(idempotencyKey)
  if (!outbox) {
    const state = resendProviderState()
    const status = recipientEmail ? state.configured ? 'queued' : 'pending_configuration' : 'blocked'
    const result = await supabaseAdminClient
      .from('email_outbox')
      .insert({
        communication_event_id: event.id,
        template_key: template.templateKey,
        recipient_customer_id: input.customerId ?? null,
        recipient_user_id: input.userId ?? null,
        recipient_email: recipientEmail || 'no-recipient@example.invalid',
        locale,
        subject: template.subject,
        preheader: template.preheader,
        html_body: template.html,
        text_body: template.text,
        payload,
        status,
        attempts: 0,
        max_attempts: maxAttempts,
        provider: 'resend',
        idempotency_key: idempotencyKey,
      })
      .select('*')
      .single()
    outbox = assertNoError<EmailOutboxRow>(result).data
  }

  return { event, outbox }
}

export async function enqueueAndProcessTransactionalEmail(input: EnqueueTransactionalEmailInput) {
  const { event, outbox } = await enqueueTransactionalEmail(input)
  if (outbox.status === 'queued') {
    await processOutboxItem(outbox.id).catch(() => undefined)
    const refreshed = await findOutboxById(outbox.id)
    return { event, outbox: refreshed ?? outbox }
  }
  return { event, outbox }
}

async function updateCampaignEmailDeliveryFromWebhook(outboxId: string, normalizedStatus: string, eventType: string) {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now }

  if (eventType.includes('clicked')) {
    patch.status = 'delivered'
    patch.delivered_at = now
    patch.opened_at = now
    patch.clicked_at = now
  } else if (eventType.includes('opened')) {
    patch.status = 'delivered'
    patch.delivered_at = now
    patch.opened_at = now
  } else if (normalizedStatus === 'delivered') {
    patch.status = 'delivered'
    patch.delivered_at = now
    patch.error_code = null
  } else if (['bounced', 'complained', 'failed'].includes(normalizedStatus)) {
    patch.status = 'failed'
    patch.delivered_at = null
    patch.error_code = `email.${normalizedStatus}`
  } else {
    patch.status = 'sent'
  }

  await supabaseAdminClient
    .from('campaign_recipient_deliveries')
    .update(patch)
    .eq('channel', 'email')
    .eq('provider_reference', outboxId)
}

export async function processOutboxItem(id: string) {
  const result = await supabaseAdminClient
    .from('email_outbox')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<EmailOutboxRow | null>(result).data
  if (!row) throw httpError(404, 'Comunicación no encontrada')
  if (['sent', 'delivered', 'bounced', 'complained'].includes(row.status)) return { data: publicEmail(row) }
  if (row.attempts >= row.max_attempts) throw httpError(409, 'Intentos agotados')

  if (!resendProviderState().configured) {
    const pending = assertNoError<EmailOutboxRow>(await supabaseAdminClient
      .from('email_outbox')
      .update({ status: 'pending_configuration', error_code: 'provider_not_configured', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()).data
    await supabaseAdminClient.from('communication_events').update({ status: 'pending_configuration', updated_at: new Date().toISOString() }).eq('id', row.communication_event_id)
    return { data: publicEmail(pending) }
  }

  const attempts = row.attempts + 1
  await supabaseAdminClient
    .from('email_outbox')
    .update({ status: 'processing', attempts, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  try {
    const sent = await sendTransactionalEmail({
      to: row.recipient_email,
      subject: row.subject,
      html: row.html_body,
      text: row.text_body,
      idempotencyKey: row.idempotency_key,
      eventType: row.template_key,
    })
    const updated = assertNoError<EmailOutboxRow>(await supabaseAdminClient
      .from('email_outbox')
      .update({
        status: 'sent',
        provider_message_id: sent.id,
        sent_at: new Date().toISOString(),
        locked_at: null,
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()).data
    await supabaseAdminClient
      .from('communication_events')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', row.communication_event_id)
    await supabaseAdminClient.from('email_deliveries').insert({
      email_outbox_id: id,
      provider: 'resend',
      provider_message_id: sent.id,
      provider_event_id: `accepted:${sent.id}`,
      event_type: 'email.sent',
      status: 'sent',
      payload: {},
    })
    return { data: publicEmail(updated) }
  } catch (error) {
    const exhausted = attempts >= row.max_attempts
    const status = exhausted ? 'failed' : 'queued'
    const updated = assertNoError<EmailOutboxRow>(await supabaseAdminClient
      .from('email_outbox')
      .update({
        status,
        error_code: errorCode(error),
        failed_at: exhausted ? new Date().toISOString() : null,
        scheduled_at: new Date(Date.now() + attempts * 60_000).toISOString(),
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()).data
    await supabaseAdminClient
      .from('communication_events')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', row.communication_event_id)
    return { data: publicEmail(updated) }
  }
}

export async function listCommunications(query: ListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  let request: any = supabaseAdminClient
    .from('communication_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (query.status) request = request.eq('status', query.status)
  if (query.eventType) request = request.eq('event_type', query.eventType)
  const result = await request.range(from, to)
  const events = assertNoError<CommunicationEventRow[]>(result).data ?? []
  return { data: events.map((event) => publicEvent(event)), count: result.count ?? 0 }
}

export async function getCommunication(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const eventResult = await supabaseAdminClient.from('communication_events').select('*').eq('id', id).maybeSingle()
  const event = assertNoError<CommunicationEventRow | null>(eventResult).data
  if (!event) throw httpError(404, 'Comunicación no encontrada')
  const emailResult = await supabaseAdminClient.from('email_outbox').select('*').eq('communication_event_id', id).maybeSingle()
  const email = assertNoError<EmailOutboxRow | null>(emailResult).data
  return { data: publicEvent(event, email) }
}

export async function retryCommunication(id: string, user: UserContext) {
  requireOperationRole(user, retryRoles)
  const emailResult = await supabaseAdminClient.from('email_outbox').select('*').eq('communication_event_id', id).maybeSingle()
  const email = assertNoError<EmailOutboxRow | null>(emailResult).data
  if (!email) throw httpError(404, 'Correo no encontrado')
  if (!['queued', 'failed', 'pending_configuration'].includes(email.status)) {
    throw httpError(409, 'La comunicación no admite reintento')
  }
  return processOutboxItem(email.id)
}

export async function recordResendWebhookEvent(input: {
  providerEventId: string
  eventType: string
  providerMessageId?: string | null
  payload: Record<string, unknown>
  providerCreatedAt?: string | null
}) {
  let outboxId: string | null = null
  if (input.providerMessageId) {
    const outbox = assertNoError<EmailOutboxRow | null>(await supabaseAdminClient
      .from('email_outbox')
      .select('*')
      .eq('provider_message_id', input.providerMessageId)
      .maybeSingle()).data
    outboxId = outbox?.id ?? null
  }

  const normalizedStatus = input.eventType.includes('delivered')
    ? 'delivered'
    : input.eventType.includes('bounced')
      ? 'bounced'
      : input.eventType.includes('complained')
        ? 'complained'
        : input.eventType.includes('failed')
          ? 'failed'
          : 'sent'

  const existing = assertNoError<{ id: string } | null>(await supabaseAdminClient
    .from('email_deliveries')
    .select('id')
    .eq('provider_event_id', input.providerEventId)
    .maybeSingle()).data
  if (!existing) {
    await supabaseAdminClient.from('email_deliveries').insert({
      email_outbox_id: outboxId,
      provider: 'resend',
      provider_message_id: input.providerMessageId ?? null,
      provider_event_id: input.providerEventId,
      event_type: input.eventType,
      status: normalizedStatus,
      payload: safePayload(input.payload as CommunicationPayload),
      provider_created_at: input.providerCreatedAt ?? null,
    })
  }

  if (outboxId && ['delivered', 'bounced', 'complained', 'failed'].includes(normalizedStatus)) {
    const patch: Record<string, unknown> = {
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    }
    if (normalizedStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    if (normalizedStatus === 'failed') patch.failed_at = new Date().toISOString()
    await supabaseAdminClient.from('email_outbox').update(patch).eq('id', outboxId)
  }
  if (outboxId) {
    await updateCampaignEmailDeliveryFromWebhook(outboxId, normalizedStatus, input.eventType)
  }

  return { ok: true }
}

export function getCommunicationsProviderState() {
  return resendProviderState()
}
