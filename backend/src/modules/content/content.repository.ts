import { supabaseAdminClient } from '../../config/supabase'
import type { ContentConfig, ContentListQuery, PublicationAction } from './content.types'

type QueryResult<T = unknown> = {
  data: T
  count?: number | null
}

type ContentRow = Record<string, unknown> & { id?: string; locale?: string | null }

type TranslationRow = Record<string, unknown> & {
  entity_id?: string
  locale?: string | null
  slug?: string | null
  title?: string | null
  subtitle?: string | null
  short_description?: string | null
  description?: string | null
  notes?: string | null
  benefits?: unknown
  promotional_message?: string | null
}

const baseLocales = ['es-MX', 'es']
const liveTranslationStatuses = ['ready', 'published_es', 'published_bilingual']
const translationSelect =
  'id,entity_type,entity_id,locale,slug,title,subtitle,short_description,description,notes,benefits,promotional_message,translation_status,publication_status,visible_in_app,publish_at,unpublish_at,published_at,version,metadata'

function assertNoError<T>(result: { data: T; error: unknown; count?: number | null }): QueryResult<T> {
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : 'Error de base de datos'
    throw Object.assign(new Error(message), { statusCode: 500, isOperational: true })
  }
  return { data: result.data, count: result.count }
}

function normalizePublicLocale(locale: string) {
  return locale === 'en' || locale === 'en-US' ? 'en-US' : 'es-MX'
}

function translationLocales(locale: string) {
  return normalizePublicLocale(locale) === 'en-US' ? ['en-US', 'en'] : baseLocales
}

function selectPreferredTranslation(rows: TranslationRow[], locale: string) {
  const locales = translationLocales(locale)
  return rows
    .filter((row) => row.locale && locales.includes(row.locale))
    .sort((left, right) => locales.indexOf(String(left.locale)) - locales.indexOf(String(right.locale)))[0]
}

function applyTranslation(row: ContentRow, translation?: TranslationRow) {
  if (!translation) return row

  const translated: ContentRow = { ...row, locale: translation.locale ?? row.locale }

  if (translation.slug) translated.slug = translation.slug
  if (translation.subtitle) translated.subtitle = translation.subtitle
  if (translation.short_description) translated.short_description = translation.short_description
  if (translation.description) translated.description = translation.description
  if (translation.notes) translated.notes = translation.notes
  if (translation.benefits !== null && translation.benefits !== undefined) translated.benefits = translation.benefits
  if (translation.promotional_message) translated.promotional_message = translation.promotional_message

  if (translation.title) {
    if ('title' in translated) translated.title = translation.title
    if ('name' in translated) translated.name = translation.title
  }

  return translated
}

function livePublicQuery(config: ContentConfig) {
  let query: any = supabaseAdminClient
    .from(config.table)
    .select(config.publicSelect)
    .eq('visible_in_app', true)
    .eq('status', config.publishStatus)
    .in('locale', baseLocales)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${new Date().toISOString()}`)

  if (config.table === 'promotions') {
    query = query
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
      .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
  }

  return query
}

async function getLiveTranslations(config: ContentConfig, entityIds: string[], locale: string) {
  if (entityIds.length === 0) return []

  const result = await supabaseAdminClient
    .from('content_translations')
    .select(translationSelect)
    .eq('entity_type', config.entityType)
    .in('entity_id', entityIds)
    .in('locale', translationLocales(locale))
    .eq('publication_status', config.publishStatus)
    .eq('visible_in_app', true)
    .in('translation_status', liveTranslationStatuses)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${new Date().toISOString()}`)

  return assertNoError(result).data as TranslationRow[]
}

async function getLiveTranslationBySlug(config: ContentConfig, slug: string, locale: string) {
  const result = await supabaseAdminClient
    .from('content_translations')
    .select(translationSelect)
    .eq('entity_type', config.entityType)
    .eq('slug', slug)
    .in('locale', translationLocales(locale))
    .eq('publication_status', config.publishStatus)
    .eq('visible_in_app', true)
    .in('translation_status', liveTranslationStatuses)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${new Date().toISOString()}`)

  const rows = assertNoError(result).data as TranslationRow[]
  return selectPreferredTranslation(rows, locale)
}

export async function listContent(config: ContentConfig, queryParams: ContentListQuery) {
  const from = (queryParams.page - 1) * queryParams.perPage
  const to = from + queryParams.perPage - 1
  let query: any = supabaseAdminClient
    .from(config.table)
    .select(config.adminSelect, { count: 'exact' })
    .is('deleted_at', null)
    .eq('locale', queryParams.locale)

  if (queryParams.status) query = query.eq('status', queryParams.status)

  if (queryParams.search && config.searchColumns.length > 0) {
    const term = queryParams.search.replace(/[%(),]/g, '').trim()
    if (term) {
      query = query.or(config.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(','))
    }
  }

  const result = await query
    .order(queryParams.orderBy, { ascending: queryParams.orderDirection === 'asc' })
    .range(from, to)

  return assertNoError(result)
}

export async function getContentById(config: ContentConfig, id: string) {
  const result = await supabaseAdminClient
    .from(config.table)
    .select(config.adminSelect)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  return assertNoError(result)
}

export async function insertContent(config: ContentConfig, payload: Record<string, unknown>) {
  const result = await supabaseAdminClient.from(config.table).insert(payload).select(config.adminSelect).single()
  return assertNoError(result)
}

export async function updateContent(
  config: ContentConfig,
  id: string,
  payload: Record<string, unknown>,
) {
  const result = await supabaseAdminClient
    .from(config.table)
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select(config.adminSelect)
    .single()

  return assertNoError(result)
}

export async function softDeleteContent(config: ContentConfig, id: string) {
  return updateContent(config, id, {
    deleted_at: new Date().toISOString(),
    visible_in_app: false,
  })
}

export async function listVersions(config: ContentConfig, id: string) {
  const result = await supabaseAdminClient
    .from('content_versions')
    .select('id,entity_type,entity_id,version,action,reason,request_id,created_by,created_at,restored_from_version_id')
    .eq('entity_type', config.table)
    .eq('entity_id', id)
    .order('version', { ascending: false })

  return assertNoError(result)
}

export async function getVersion(config: ContentConfig, id: string, version: number) {
  const result = await supabaseAdminClient
    .from('content_versions')
    .select('*')
    .eq('entity_type', config.table)
    .eq('entity_id', id)
    .eq('version', version)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return assertNoError(result)
}

export async function createPublicationJob(
  config: ContentConfig,
  id: string,
  action: PublicationAction,
  runAt: string,
  timezone: string,
  userId: string | undefined,
) {
  const existing = await supabaseAdminClient
    .from('content_publication_jobs')
    .select('id,entity_type,entity_id,action,run_at,timezone,status,attempts,max_attempts,created_at,updated_at')
    .eq('entity_type', config.entityType)
    .eq('entity_id', id)
    .eq('action', action)
    .in('status', ['pending', 'processing'])
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return { data: existing.data }

  const result = await supabaseAdminClient
    .from('content_publication_jobs')
    .insert({
        entity_type: config.entityType,
        entity_id: id,
        action,
        run_at: runAt,
        timezone,
        status: 'pending',
        created_by: userId ?? null,
        updated_at: new Date().toISOString(),
      })
    .select('id,entity_type,entity_id,action,run_at,timezone,status,attempts,max_attempts,created_at,updated_at')
    .single()

  return assertNoError(result)
}

export async function createPreviewTokenRecord(input: {
  tokenHash: string
  entityType: string
  entityId: string
  locale: string
  expiresAt: string
  userId?: string
}) {
  const result = await supabaseAdminClient
    .from('content_preview_tokens')
    .insert({
      token_hash: input.tokenHash,
      entity_type: input.entityType,
      entity_id: input.entityId,
      locale: input.locale,
      expires_at: input.expiresAt,
      created_by: input.userId ?? null,
    })
    .select('id,entity_type,entity_id,locale,expires_at,created_at')
    .single()

  return assertNoError(result)
}

export async function getPreviewToken(tokenHash: string) {
  const result = await supabaseAdminClient
    .from('content_preview_tokens')
    .select('id,entity_type,entity_id,locale,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  return assertNoError(result)
}

export async function markPreviewTokenUsed(id: string) {
  await supabaseAdminClient
    .from('content_preview_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
}

export async function listPublicContent(config: ContentConfig, locale: string) {
  const result = await livePublicQuery(config).order('sort_order', { ascending: true })
  const baseRows = (assertNoError(result).data ?? []) as ContentRow[]
  const translations = await getLiveTranslations(
    config,
    baseRows.map((row) => row.id).filter((id): id is string => typeof id === 'string' && id.length > 0),
    locale,
  )
  const translationsByEntity = new Map<string, TranslationRow[]>()

  for (const translation of translations) {
    if (!translation.entity_id) continue
    const existing = translationsByEntity.get(translation.entity_id) ?? []
    existing.push(translation)
    translationsByEntity.set(translation.entity_id, existing)
  }

  return {
    data: baseRows.map((row) => applyTranslation(row, selectPreferredTranslation(translationsByEntity.get(String(row.id)) ?? [], locale))),
  }
}

export async function getPublicContentBySlug(config: ContentConfig, slug: string, locale: string) {
  if (!config.slugColumn) return { data: null }

  const slugTranslation = await getLiveTranslationBySlug(config, slug, locale)
  if (slugTranslation?.entity_id) {
    const byTranslation = await livePublicQuery(config)
      .eq('id', slugTranslation.entity_id)
      .maybeSingle()
    const { data } = assertNoError(byTranslation)
    return { data: data ? applyTranslation(data as ContentRow, slugTranslation) : null }
  }

  const result = await livePublicQuery(config)
    .eq(config.slugColumn, slug)
    .order('locale', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data } = assertNoError(result)
  if (!data) return { data: null }

  const translations = await getLiveTranslations(config, [String((data as ContentRow).id)], locale)
  return { data: applyTranslation(data as ContentRow, selectPreferredTranslation(translations, locale)) }
}

export async function lockDuePublicationJobs(limit: number, workerId: string) {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdminClient
    .from('content_publication_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', now)
    .order('run_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  const jobs = data ?? []
  if (jobs.length === 0) return []

  const ids = jobs.map((job: { id: string }) => job.id)
  const result = await supabaseAdminClient
    .from('content_publication_jobs')
    .update({
      status: 'processing',
      locked_at: now,
      locked_by: workerId,
      updated_at: now,
    })
    .in('id', ids)
    .eq('status', 'pending')
    .select('*')

  return assertNoError(result).data ?? []
}

export async function completePublicationJob(id: string) {
  const now = new Date().toISOString()
  await supabaseAdminClient
    .from('content_publication_jobs')
    .update({ status: 'completed', processed_at: now, updated_at: now })
    .eq('id', id)
}

export async function failPublicationJob(id: string, attempts: number, maxAttempts: number) {
  const now = new Date().toISOString()
  await supabaseAdminClient
    .from('content_publication_jobs')
    .update({
      status: attempts + 1 >= maxAttempts ? 'failed' : 'pending',
      attempts: attempts + 1,
      last_error_code: 'JOB_FAILED',
      last_error: 'No fue posible procesar el job.',
      locked_at: null,
      locked_by: null,
      updated_at: now,
    })
    .eq('id', id)
}
