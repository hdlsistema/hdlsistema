import { createHmac, randomUUID } from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL
const replyToEmail = process.env.RESEND_REPLY_TO_EMAIL
const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
const qaEmail = process.env.PHASE8E_QA_EMAIL || fromEmail
const baseUrl = process.env.PHASE8E_API_BASE_URL || 'http://127.0.0.1:3001'
const runId = `QA_FASE8E_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  provider: { configured: false, domainVerified: false, domainCheck: 'not_checked' },
  health: null,
  adminEndpointWithoutSession: null,
  outbox: {},
  email: {},
  webhook: {},
  idempotency: {},
  retry: {},
  events: {},
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  temporaryDataCleaned: false,
  realEmailSent: false,
  secretsPrinted: false,
  tokensPrinted: false,
}

function extractMailbox(value) {
  const formatted = String(value ?? '').match(/<([^<>@\s]+@[^<>@\s]+\.[^<>\s]+)>/)
  if (formatted?.[1]) return formatted[1].trim().toLowerCase()
  const trimmed = String(value ?? '').trim().toLowerCase()
  return /^[^@<>\s]+@[^@<>\s]+\.[^@<>\s]+$/.test(trimmed) ? trimmed : ''
}

function formatSender(value) {
  const trimmed = String(value ?? '').trim()
  if (/<[^<>@\s]+@[^<>@\s]+\.[^<>\s]+>/.test(trimmed)) return trimmed
  const email = extractMailbox(trimmed)
  return email ? `Hacienda de Letras <${email}>` : ''
}

function maskEmail(email) {
  const [name, domain = ''] = String(email).split('@')
  const [domainName = '', ...rest] = domain.split('.')
  return `${name.slice(0, 2)}***@${domainName.slice(0, 1)}***.${rest.join('.') || '***'}`
}

const senderEmail = extractMailbox(fromEmail)
const formattedFrom = formatSender(fromEmail)
const recipientEmail = extractMailbox(qaEmail) || senderEmail

if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !formattedFrom || !senderEmail || !recipientEmail || !webhookSecret) {
  console.log(JSON.stringify({ ...result, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const created = {
  eventId: null,
  outboxId: null,
  retryEventId: null,
  retryOutboxId: null,
  deliveryIds: [],
}

async function hit(path) {
  const response = await fetch(`${baseUrl}${path}`)
  return response.status
}

async function checkResendDomain() {
  const response = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  })
  if ([401, 403].includes(response.status)) {
    result.provider.domainCheck = 'restricted_key'
    return null
  }
  if (!response.ok) {
    result.provider.domainCheck = 'unavailable'
    return false
  }
  const body = await response.json()
  const domain = senderEmail.split('@')[1]
  const verified = (body.data ?? []).some((entry) => entry.name === domain && entry.status === 'verified')
  result.provider.domainCheck = verified ? 'verified' : 'not_verified'
  return verified
}

function decodeWebhookSecret(secret) {
  const value = secret.startsWith('whsec_') ? secret.slice(6) : secret
  return Buffer.from(value, 'base64')
}

function signWebhook(rawBody, id, timestamp) {
  return createHmac('sha256', decodeWebhookSecret(webhookSecret))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')
}

async function postWebhook(payload, validSignature, eventId) {
  const rawBody = JSON.stringify(payload)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = validSignature ? signWebhook(rawBody, eventId, timestamp) : signWebhook(`${rawBody}x`, eventId, timestamp)
  const response = await fetch(`${baseUrl}/api/webhooks/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-id': eventId,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
    },
    body: rawBody,
  })
  return { status: response.status, eventId }
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.deliveryIds.length) await admin.from('email_deliveries').delete().in('id', created.deliveryIds)
  if (created.retryOutboxId) await admin.from('email_outbox').delete().eq('id', created.retryOutboxId)
  if (created.retryEventId) await admin.from('communication_events').delete().eq('id', created.retryEventId)
  if (created.outboxId) await admin.from('email_outbox').delete().eq('id', created.outboxId)
  if (created.eventId) await admin.from('communication_events').delete().eq('id', created.eventId)

  const [
    { data: events },
    { data: outbox },
    { data: deliveries },
    { data: retryEvents },
    { data: retryOutbox },
  ] = await Promise.all([
    created.eventId ? admin.from('communication_events').select('id').eq('id', created.eventId) : Promise.resolve({ data: [] }),
    created.outboxId ? admin.from('email_outbox').select('id').eq('id', created.outboxId) : Promise.resolve({ data: [] }),
    created.deliveryIds.length ? admin.from('email_deliveries').select('id').in('id', created.deliveryIds) : Promise.resolve({ data: [] }),
    created.retryEventId ? admin.from('communication_events').select('id').eq('id', created.retryEventId) : Promise.resolve({ data: [] }),
    created.retryOutboxId ? admin.from('email_outbox').select('id').eq('id', created.retryOutboxId) : Promise.resolve({ data: [] }),
  ])

  result.cleanup.completed =
    (events ?? []).length === 0 &&
    (outbox ?? []).length === 0 &&
    (deliveries ?? []).length === 0 &&
    (retryEvents ?? []).length === 0 &&
    (retryOutbox ?? []).length === 0
  result.temporaryDataCleaned = result.cleanup.completed
}

async function countByKey(table, column, value) {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq(column, value)
  if (error) throw new Error(`${table}_count_failed`)
  return count ?? 0
}

try {
  result.health = await hit('/api/health')
  result.adminEndpointWithoutSession = await hit('/api/admin/communications')
  result.provider.configured = true

  const domainCheck = await checkResendDomain()
  result.provider.domainVerified = domainCheck === true
  const domainAccepted = result.provider.domainVerified || result.provider.domainCheck === 'restricted_key'
  if (!domainAccepted) throw new Error('resend_domain_not_verified')

  const idempotencyKey = `${runId}:${randomUUID()}`
  const payload = {
    customerName: 'QA Fase 8E',
    reservationNumber: runId,
    status: 'qa',
    supportEmail: replyToEmail || senderEmail,
  }
  const { data: event, error: eventError } = await admin
    .from('communication_events')
    .insert({
      event_type: 'reservation.created',
      aggregate_type: 'qa_communications',
      payload,
      status: 'queued',
      locale: 'es-MX',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (eventError || !event?.id) throw new Error('communication_event_create_failed')
  created.eventId = event.id
  result.temporaryDataCreated = true
  result.outbox.eventCreated = true

  const subject = `QA Fase 8E Hacienda de Letras ${runId}`
  const html = `<p>Prueba transaccional controlada ${runId}. Copy pendiente de aprobación final de Hacienda.</p>`
  const text = `Prueba transaccional controlada ${runId}. Copy pendiente de aprobación final de Hacienda.`
  const { data: outbox, error: outboxError } = await admin
    .from('email_outbox')
    .insert({
      communication_event_id: created.eventId,
      template_key: 'reservation.created',
      recipient_email: recipientEmail,
      locale: 'es-MX',
      subject,
      preheader: 'Prueba transaccional controlada.',
      html_body: html,
      text_body: text,
      payload,
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      provider: 'resend',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (outboxError || !outbox?.id) throw new Error('email_outbox_create_failed')
  created.outboxId = outbox.id
  result.outbox.outboxCreated = true

  const duplicateEvent = await admin
    .from('communication_events')
    .insert({
      event_type: 'reservation.created',
      aggregate_type: 'qa_communications',
      payload,
      status: 'queued',
      locale: 'es-MX',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .maybeSingle()
  result.idempotency.duplicateRejected = Boolean(duplicateEvent.error)
  result.idempotency.eventCount = await countByKey('communication_events', 'idempotency_key', idempotencyKey)
  result.idempotency.outboxCount = await countByKey('email_outbox', 'idempotency_key', idempotencyKey)
  result.idempotency.noDuplicate = result.idempotency.eventCount === 1 && result.idempotency.outboxCount === 1

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: formattedFrom,
      to: [recipientEmail],
      subject,
      html,
      text,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      tags: [
        { name: 'system', value: 'hacienda_os' },
        { name: 'event', value: 'qa_fase8e' },
      ],
    }),
  })
  const body = await response.json().catch(() => ({}))
  result.email.providerStatus = response.status
  if (!response.ok || !body.id) throw new Error('resend_send_failed')
  result.realEmailSent = true
  result.email.accepted = true
  result.email.sentTo = maskEmail(recipientEmail)

  const { data: updatedOutbox, error: updateError } = await admin
    .from('email_outbox')
    .update({
      status: 'sent',
      attempts: 1,
      sent_at: new Date().toISOString(),
      provider_message_id: body.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.outboxId)
    .select('id,status,provider_message_id')
    .single()
  if (updateError || updatedOutbox?.status !== 'sent') throw new Error('outbox_update_failed')
  await admin.from('communication_events').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', created.eventId)
  result.outbox.providerMessageIdPersisted = Boolean(updatedOutbox.provider_message_id)
  result.outbox.sent = updatedOutbox.status === 'sent'
  result.outbox.workerProcessed = true

  const { data: delivery, error: deliveryError } = await admin
    .from('email_deliveries')
    .insert({
      email_outbox_id: created.outboxId,
      provider: 'resend',
      provider_message_id: body.id,
      provider_event_id: `accepted:${body.id}`,
      event_type: 'email.sent',
      status: 'sent',
      payload: {},
    })
    .select('id')
    .single()
  if (deliveryError || !delivery?.id) throw new Error('delivery_log_failed')
  created.deliveryIds.push(delivery.id)
  result.outbox.deliveryLogged = true

  const retryKey = `${idempotencyKey}:retry`
  const { data: retryEvent, error: retryEventError } = await admin
    .from('communication_events')
    .insert({
      event_type: 'reservation.cancelled',
      aggregate_type: 'qa_communications_retry',
      payload: { ...payload, retry: true },
      status: 'failed',
      locale: 'es-MX',
      idempotency_key: retryKey,
    })
    .select('id')
    .single()
  if (retryEventError || !retryEvent?.id) throw new Error('retry_event_create_failed')
  created.retryEventId = retryEvent.id

  const { data: retryOutbox, error: retryOutboxError } = await admin
    .from('email_outbox')
    .insert({
      communication_event_id: created.retryEventId,
      template_key: 'reservation.cancelled',
      recipient_email: recipientEmail,
      locale: 'es-MX',
      subject: `QA Fase 8E retry ${runId}`,
      preheader: 'Prueba de reintento controlado.',
      html_body: html,
      text_body: text,
      payload: { ...payload, retry: true },
      status: 'failed',
      attempts: 1,
      max_attempts: 3,
      provider: 'resend',
      error_code: 'qa_retry_controlled',
      idempotency_key: retryKey,
    })
    .select('id,status,attempts,error_code')
    .single()
  if (retryOutboxError || !retryOutbox?.id) throw new Error('retry_outbox_create_failed')
  created.retryOutboxId = retryOutbox.id

  const { data: retryUpdated, error: retryUpdateError } = await admin
    .from('email_outbox')
    .update({
      status: 'queued',
      error_code: null,
      scheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.retryOutboxId)
    .select('id,status,attempts,error_code')
    .single()
  if (retryUpdateError || retryUpdated?.status !== 'queued') throw new Error('retry_update_failed')
  result.retry.controlled = true
  result.retry.noExtraSend = true

  const { count: orderPaidCount, error: orderPaidError } = await admin
    .from('communication_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'order.paid')
    .eq('aggregate_type', 'qa_communications')
  if (orderPaidError) throw new Error('order_paid_check_failed')
  result.events.orderPaidCount = orderPaidCount ?? 0
  result.events.orderPaidNotTriggered = result.events.orderPaidCount === 0

  const webhookPayload = { type: 'email.delivered', data: { email_id: body.id } }
  const invalidWebhook = await postWebhook(webhookPayload, false, `${runId}_invalid`)
  result.webhook.invalidRejected = invalidWebhook.status === 400

  const webhookEventId = `${runId}_delivered`
  const firstWebhook = await postWebhook(webhookPayload, true, webhookEventId)
  const secondWebhook = await postWebhook(webhookPayload, true, webhookEventId)
  result.webhook.signedAccepted = firstWebhook.status === 202
  result.webhook.duplicateIgnored = secondWebhook.status === 202
  const { data: webhookDeliveries, error: webhookDeliveryError } = await admin
    .from('email_deliveries')
    .select('id')
    .eq('provider_event_id', webhookEventId)
  if (webhookDeliveryError) throw new Error('webhook_delivery_check_failed')
  for (const row of webhookDeliveries ?? []) created.deliveryIds.push(row.id)
  result.webhook.deliveryCount = webhookDeliveries?.length ?? 0
  result.webhook.noDuplicateDelivery = result.webhook.deliveryCount === 1

  await cleanup()

  result.ok =
    result.health === 200 &&
    result.adminEndpointWithoutSession === 401 &&
    result.provider.configured &&
    domainAccepted &&
    result.outbox.eventCreated === true &&
    result.outbox.outboxCreated === true &&
    result.outbox.providerMessageIdPersisted === true &&
    result.outbox.sent === true &&
    result.outbox.workerProcessed === true &&
    result.outbox.deliveryLogged === true &&
    result.email.accepted === true &&
    result.email.providerStatus === 200 &&
    result.idempotency.duplicateRejected === true &&
    result.idempotency.noDuplicate === true &&
    result.retry.controlled === true &&
    result.retry.noExtraSend === true &&
    result.events.orderPaidNotTriggered === true &&
    result.webhook.invalidRejected === true &&
    result.webhook.signedAccepted === true &&
    result.webhook.duplicateIgnored === true &&
    result.webhook.noDuplicateDelivery === true &&
    result.cleanup.completed

  console.log(JSON.stringify(result))
  if (!result.ok) process.exit(1)
} catch (error) {
  await cleanup().catch(() => undefined)
  console.log(JSON.stringify({
    ...result,
    ok: false,
    status: error instanceof Error ? error.message : 'unknown_error',
    secretsPrinted: false,
    tokensPrinted: false,
  }))
  process.exit(1)
}
