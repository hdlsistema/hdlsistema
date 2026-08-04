import { randomUUID } from 'crypto'
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
const qaEmail = process.env.PHASE8E_QA_EMAIL || fromEmail
const baseUrl = process.env.PHASE8E_API_BASE_URL || 'http://127.0.0.1:3001'
const runId = `QA_FASE8E_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  provider: { configured: false, domainVerified: false },
  health: null,
  adminEndpointWithoutSession: null,
  outbox: {},
  email: {},
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  temporaryDataCleaned: false,
  realEmailSent: false,
  secretsPrinted: false,
  tokensPrinted: false,
}

if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail || !qaEmail) {
  console.log(JSON.stringify({ ...result, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const created = {
  eventId: null,
  outboxId: null,
  deliveryIds: [],
}

function maskEmail(email) {
  const [name, domain = ''] = String(email).split('@')
  const [domainName = '', ...rest] = domain.split('.')
  return `${name.slice(0, 2)}***@${domainName.slice(0, 1)}***.${rest.join('.') || '***'}`
}

async function hit(path) {
  const response = await fetch(`${baseUrl}${path}`)
  return response.status
}

async function checkResendDomain() {
  const response = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  })
  if (!response.ok) return false
  const body = await response.json()
  const domain = String(fromEmail).split('@')[1]
  return (body.data ?? []).some((entry) => entry.name === domain && entry.status === 'verified')
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.deliveryIds.length) await admin.from('email_deliveries').delete().in('id', created.deliveryIds)
  if (created.outboxId) await admin.from('email_outbox').delete().eq('id', created.outboxId)
  if (created.eventId) await admin.from('communication_events').delete().eq('id', created.eventId)

  const [{ data: events }, { data: outbox }, { data: deliveries }] = await Promise.all([
    created.eventId
      ? admin.from('communication_events').select('id').eq('id', created.eventId)
      : Promise.resolve({ data: [] }),
    created.outboxId
      ? admin.from('email_outbox').select('id').eq('id', created.outboxId)
      : Promise.resolve({ data: [] }),
    created.deliveryIds.length
      ? admin.from('email_deliveries').select('id').in('id', created.deliveryIds)
      : Promise.resolve({ data: [] }),
  ])

  result.cleanup.completed =
    (events ?? []).length === 0 &&
    (outbox ?? []).length === 0 &&
    (deliveries ?? []).length === 0
  result.temporaryDataCleaned = result.cleanup.completed
}

try {
  result.health = await hit('/api/health')
  result.adminEndpointWithoutSession = await hit('/api/admin/communications')
  result.provider.configured = true
  result.provider.domainVerified = await checkResendDomain()
  if (!result.provider.domainVerified) throw new Error('resend_domain_not_verified')

  const idempotencyKey = `${runId}:${randomUUID()}`
  const payload = {
    customerName: 'QA Fase 8E',
    reservationNumber: runId,
    status: 'qa',
    supportEmail: fromEmail,
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
      recipient_email: qaEmail,
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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: `Hacienda de Letras <${fromEmail}>`,
      to: [qaEmail],
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
  result.email.sentTo = maskEmail(qaEmail)

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

  const { data: delivery, error: deliveryError } = await admin
    .from('email_deliveries')
    .insert({
      email_outbox_id: created.outboxId,
      provider: 'resend',
      provider_message_id: body.id,
      provider_event_id: `qa:${body.id}`,
      event_type: 'email.sent',
      status: 'sent',
      payload: {},
    })
    .select('id')
    .single()
  if (deliveryError || !delivery?.id) throw new Error('delivery_log_failed')
  created.deliveryIds.push(delivery.id)
  result.outbox.deliveryLogged = true

  await cleanup()

  result.ok =
    result.health === 200 &&
    result.adminEndpointWithoutSession === 401 &&
    result.provider.configured &&
    result.provider.domainVerified &&
    result.outbox.eventCreated === true &&
    result.outbox.outboxCreated === true &&
    result.outbox.deliveryLogged === true &&
    result.email.providerStatus === 200 &&
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
