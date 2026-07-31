import { supabaseAdminClient } from '../../config/supabase'
import type { ContentConfig, ContentListQuery, PublicationAction } from './content.types'

type QueryResult<T = unknown> = {
  data: T
  count?: number | null
}

function assertNoError<T>(result: { data: T; error: unknown; count?: number | null }): QueryResult<T> {
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : 'Error de base de datos'
    throw Object.assign(new Error(message), { statusCode: 500, isOperational: true })
  }
  return { data: result.data, count: result.count }
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
  let query: any = supabaseAdminClient
    .from(config.table)
    .select(config.publicSelect)
    .eq('visible_in_app', true)
    .eq('status', config.publishStatus)
    .eq('locale', locale)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${new Date().toISOString()}`)
    .order('sort_order', { ascending: true })

  if (config.table === 'promotions') {
    query = query
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
      .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
  }

  const result = await query
  return assertNoError(result)
}

export async function getPublicContentBySlug(config: ContentConfig, slug: string, locale: string) {
  if (!config.slugColumn) return { data: null }

  const result = await supabaseAdminClient
    .from(config.table)
    .select(config.publicSelect)
    .eq(config.slugColumn, slug)
    .eq('visible_in_app', true)
    .eq('status', config.publishStatus)
    .eq('locale', locale)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${new Date().toISOString()}`)
    .maybeSingle()

  return assertNoError(result)
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
