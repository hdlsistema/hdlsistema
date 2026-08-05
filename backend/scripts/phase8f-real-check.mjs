import { randomUUID } from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE8F_API_BASE_URL || 'http://127.0.0.1:3001'
const runId = `QA_FASE8F_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  health: null,
  publicContent: {},
  detailSlugs: {},
  translations: { enRecords: 0, esRecords: 0 },
  communications: { esEvent: false, enEvent: false, esOutbox: false, enOutbox: false },
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  temporaryDataCleaned: false,
  secretsPrinted: false,
  tokensPrinted: false,
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log(JSON.stringify({ ...result, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const created = {
  eventIds: [],
  outboxIds: [],
}

const entities = ['wines', 'experiences', 'events', 'promotions', 'membership-plans']

async function hit(path) {
  const response = await fetch(`${baseUrl}${path}`)
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text.slice(0, 80) }
    }
  }
  return { status: response.status, body }
}

async function countTranslations(locales) {
  const { count, error } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .in('locale', locales)
    .is('deleted_at', null)
  if (error) throw new Error('content_translations_count_failed')
  return count ?? 0
}

async function createCommunicationFixture(locale) {
  const idempotencyKey = `${runId}:${locale}:${randomUUID()}`
  const { data: event, error: eventError } = await admin
    .from('communication_events')
    .insert({
      event_type: 'reservation.created',
      aggregate_type: 'qa_i18n',
      payload: {
        customerName: 'QA Fase 8F',
        reservationNumber: `${runId}_${locale}`,
        status: 'qa',
      },
      status: 'queued',
      locale,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (eventError || !event?.id) throw new Error(`communication_event_${locale}_failed`)
  created.eventIds.push(event.id)

  const subject = locale === 'en-US' ? `QA Phase 8F ${runId}` : `QA Fase 8F ${runId}`
  const { data: outbox, error: outboxError } = await admin
    .from('email_outbox')
    .insert({
      communication_event_id: event.id,
      template_key: 'reservation.created',
      recipient_email: 'qa_fase8f@example.invalid',
      locale,
      subject,
      preheader: locale === 'en-US' ? 'Controlled bilingual QA.' : 'QA bilingüe controlado.',
      html_body: `<p>${subject}</p>`,
      text_body: subject,
      payload: { runId, locale },
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      provider: 'resend',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (outboxError || !outbox?.id) throw new Error(`email_outbox_${locale}_failed`)
  created.outboxIds.push(outbox.id)
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.outboxIds.length) await admin.from('email_outbox').delete().in('id', created.outboxIds)
  if (created.eventIds.length) await admin.from('communication_events').delete().in('id', created.eventIds)

  const [{ data: outbox }, { data: events }] = await Promise.all([
    created.outboxIds.length
      ? admin.from('email_outbox').select('id').in('id', created.outboxIds)
      : Promise.resolve({ data: [] }),
    created.eventIds.length
      ? admin.from('communication_events').select('id').in('id', created.eventIds)
      : Promise.resolve({ data: [] }),
  ])

  result.cleanup.completed = (outbox ?? []).length === 0 && (events ?? []).length === 0
  result.temporaryDataCleaned = result.cleanup.completed
}

try {
  const health = await hit('/api/health')
  result.health = {
    status: health.status,
    ok: health.body?.ok === true,
    supabase: {
      configured: health.body?.supabase?.configured === true,
      reachable: health.body?.supabase?.reachable === true,
      healthy: health.body?.supabase?.healthy === true,
      status: health.body?.supabase?.status ?? null,
    },
  }

  if (result.health.status !== 200 || result.health.supabase.status !== 'ok') {
    throw new Error('health_not_ok')
  }

  for (const entity of entities) {
    const es = await hit(`/api/public/${entity}?locale=es-MX`)
    const en = await hit(`/api/public/${entity}?locale=en-US`)
    const esRows = Array.isArray(es.body?.data) ? es.body.data : []
    const enRows = Array.isArray(en.body?.data) ? en.body.data : []
    result.publicContent[entity] = {
      esStatus: es.status,
      enStatus: en.status,
      esCount: esRows.length,
      enCount: enRows.length,
    }

    const candidate = enRows.find((row) => typeof row?.slug === 'string' && row.slug) ?? esRows.find((row) => typeof row?.slug === 'string' && row.slug)
    if (candidate?.slug) {
      const detail = await hit(`/api/public/${entity}/${encodeURIComponent(candidate.slug)}?locale=en-US`)
      result.detailSlugs[entity] = {
        status: detail.status,
        locale: detail.body?.data?.locale ?? null,
      }
    }
  }

  result.translations.enRecords = await countTranslations(['en', 'en-US'])
  result.translations.esRecords = await countTranslations(['es', 'es-MX'])

  await createCommunicationFixture('es-MX')
  result.communications.esEvent = created.eventIds.length >= 1
  result.communications.esOutbox = created.outboxIds.length >= 1
  await createCommunicationFixture('en-US')
  result.communications.enEvent = created.eventIds.length >= 2
  result.communications.enOutbox = created.outboxIds.length >= 2
  result.temporaryDataCreated = true

  const contentOk = Object.values(result.publicContent).every((entry) => entry.esStatus === 200 && entry.enStatus === 200)
  const detailsOk = Object.values(result.detailSlugs).every((entry) => entry.status === 200)
  const communicationsOk = Object.values(result.communications).every(Boolean)

  await cleanup()

  result.ok = contentOk && detailsOk && communicationsOk && result.cleanup.completed
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  try {
    await cleanup()
  } catch {
    result.cleanup.completed = false
  }
  console.log(JSON.stringify({
    ...result,
    ok: false,
    status: error instanceof Error ? error.message : 'phase8f_failed',
  }, null, 2))
  process.exit(1)
}
