import { createHash, randomBytes } from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(JSON.stringify({ ok: false, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const runId = `phase4b-${Date.now()}`
const isoNow = new Date().toISOString()
const future = new Date(Date.now() + 15 * 60_000).toISOString()
const past = new Date(Date.now() - 60_000).toISOString()

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function must(label, promise) {
  const result = await promise
  if (result.error) {
    console.error(JSON.stringify({ ok: false, step: label, status: 'database_error' }))
    process.exit(1)
  }
  return result.data
}

async function insertRows() {
  const wine = await must(
    'insert_wine',
    admin
      .from('wines')
      .insert({
        sku: `${runId}-wine`,
        slug: `${runId}-wine`,
        name: 'Prueba editorial 4B vino',
        price: 1,
        stock_quantity: 1,
        status: 'draft',
        visible_in_app: true,
        locale: 'es-MX',
      })
      .select('id,slug')
      .single(),
  )

  const experience = await must(
    'insert_experience',
    admin
      .from('experiences')
      .insert({
        slug: `${runId}-experience`,
        title: 'Prueba editorial 4B experiencia',
        duration_minutes: 60,
        base_price: 1,
        capacity: 1,
        status: 'draft',
        visible_in_app: true,
        locale: 'es-MX',
      })
      .select('id,slug')
      .single(),
  )

  const event = await must(
    'insert_event',
    admin
      .from('events')
      .insert({
        slug: `${runId}-event`,
        title: 'Prueba editorial 4B evento',
        start_at: future,
        end_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        capacity: 1,
        status: 'draft',
        visible_in_app: true,
        locale: 'es-MX',
      })
      .select('id,slug')
      .single(),
  )

  return { wine, experience, event }
}

async function anonCount(table, slug) {
  const { data, error } = await anon.from(table).select('id,slug').eq('slug', slug)
  if (error) return -1
  return data?.length ?? 0
}

async function publish(table, id, status = 'published') {
  return must(
    `publish_${table}`,
    admin
      .from(table)
      .update({
        status,
        visible_in_app: true,
        published_at: isoNow,
        publish_at: past,
        archived_at: null,
        deleted_at: null,
      })
      .eq('id', id)
      .select('id,version')
      .single(),
  )
}

async function validateEntity(table, row) {
  const draftHidden = (await anonCount(table, row.slug)) === 0
  await publish(table, row.id)
  const publishedVisible = (await anonCount(table, row.slug)) === 1

  const beforeEdit = await must(
    `edit_${table}`,
    admin.from(table).update({ sort_order: 1 }).eq('id', row.id).select('id,version').single(),
  )

  const job = await must(
    `schedule_${table}`,
    admin
      .from('content_publication_jobs')
      .insert({
        entity_type: table === 'membership_plans' ? 'membership_plan' : table.slice(0, -1),
        entity_id: row.id,
        action: 'unpublish',
        run_at: past,
        timezone: 'America/Mexico_City',
        status: 'pending',
      })
      .select('id,status')
      .single(),
  )

  await must(
    `unpublish_${table}`,
    admin
      .from(table)
      .update({ status: table === 'events' ? 'inactive' : 'inactive', visible_in_app: false, unpublish_at: isoNow })
      .eq('id', row.id)
      .select('id')
      .single(),
  )
  const unpublishedHidden = (await anonCount(table, row.slug)) === 0

  const versionRows = await must(
    `versions_${table}`,
    admin.from('content_versions').select('version').eq('entity_type', table).eq('entity_id', row.id),
  )
  const versioned = Array.isArray(versionRows) && versionRows.length > 0 && Number(beforeEdit.version) > 1

  await must(
    `restore_${table}`,
    admin
      .from(table)
      .update({
        status: 'published',
        visible_in_app: true,
        archived_at: null,
        deleted_at: null,
        publish_at: past,
        unpublish_at: null,
      })
      .eq('id', row.id)
      .select('id')
      .single(),
  )
  const restoredVisible = (await anonCount(table, row.slug)) === 1

  await must(
    `archive_${table}`,
    admin
      .from(table)
      .update({ status: 'archived', visible_in_app: false, archived_at: isoNow })
      .eq('id', row.id)
      .select('id')
      .single(),
  )
  const archivedHidden = (await anonCount(table, row.slug)) === 0

  return {
    draftHidden,
    publishedVisible,
    versioned,
    jobCreated: Boolean(job?.id),
    unpublishedHidden,
    restoredVisible,
    archivedHidden,
  }
}

async function validatePreview(entityType, entityId) {
  const token = randomBytes(32).toString('base64url')
  const record = await must(
    'preview_token',
    admin
      .from('content_preview_tokens')
      .insert({
        token_hash: hashToken(token),
        entity_type: entityType,
        entity_id: entityId,
        locale: 'es-MX',
        expires_at: future,
      })
      .select('id,revoked_at,expires_at')
      .single(),
  )

  const found = await must(
    'preview_lookup',
    admin.from('content_preview_tokens').select('id').eq('token_hash', hashToken(token)).maybeSingle(),
  )

  await must(
    'preview_revoke',
    admin.from('content_preview_tokens').update({ revoked_at: isoNow }).eq('id', record.id).select('id').single(),
  )

  const revoked = await must(
    'preview_revoked_lookup',
    admin.from('content_preview_tokens').select('revoked_at').eq('id', record.id).single(),
  )

  return {
    tokenStoredAsHash: Boolean(found?.id),
    tokenPrinted: false,
    revokeWorks: Boolean(revoked?.revoked_at),
  }
}

async function validateTranslations(entityType, entityId) {
  await must(
    'insert_translation_es',
    admin
      .from('content_translations')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        locale: 'es',
        slug: `${runId}-${entityType}-es`,
        title: 'Prueba editorial 4B',
        translation_status: 'ready',
        publication_status: 'published',
        publish_at: past,
      })
      .select('id')
      .single(),
  )

  const state = await must(
    'translation_state',
    admin.rpc('translation_publication_state', {
      target_entity_type: entityType,
      target_entity_id: entityId,
    }),
  )

  return { state }
}

const rows = await insertRows()
const [wine, experience, event] = await Promise.all([
  validateEntity('wines', rows.wine),
  validateEntity('experiences', rows.experience),
  validateEntity('events', rows.event),
])
const preview = await validatePreview('wine', rows.wine.id)
const translations = await validateTranslations('wine', rows.wine.id)

console.log(
  JSON.stringify({
    ok: true,
    runId,
    wine,
    experience,
    event,
    preview,
    translations,
    secretsPrinted: false,
  }),
)
