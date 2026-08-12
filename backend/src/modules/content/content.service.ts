import { createHash, randomBytes, randomUUID } from 'crypto'
import { supabaseAdminClient } from '../../config/supabase'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import type { CampaignAudienceFilters, SendCampaignPayload } from './content.schemas'
import { contentConfigs, getContentConfig } from './content.config'
import { canAccessContent } from './content.permissions'
import {
  createPreviewTokenRecord,
  createPublicationJob,
  getContentById,
  getPreviewToken,
  getPublicContentBySlug,
  getVersion,
  insertContent,
  listContent,
  listPublicContent,
  listVersions,
  markPreviewTokenUsed,
  softDeleteContent,
  updateContent,
  lockDuePublicationJobs,
  completePublicationJob,
  failPublicationJob,
} from './content.repository'
import type {
  ContentAction,
  ContentConfig,
  ContentListQuery,
  ContentRouteEntity,
  PublicationAction,
} from './content.types'

type UserContext = {
  userId?: string
  roles?: string[]
}

type CustomerAudienceRow = {
  id: string
  user_id?: string | null
  customer_number?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  birth_date?: string | null
  source?: string | null
  segment?: string | null
  total_spend?: number | string | null
  total_visits?: number | null
  preferred_language?: string | null
  marketing_email_consent?: boolean | null
  metadata?: Record<string, unknown> | null
  status?: string | null
  created_at?: string | null
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode, isOperational: true })
}

function requirePermission(config: ContentConfig, action: ContentAction, user: UserContext) {
  if (!canAccessContent(user.roles, config.entityType, action)) {
    throw httpError(403, 'Permisos insuficientes')
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function assertEntity(routeEntity: string): ContentConfig {
  const config = getContentConfig(routeEntity)
  if (!config) throw httpError(404, 'Entidad no permitida')
  return config
}

function buildStatusPatch(config: ContentConfig, action: PublicationAction) {
  const now = new Date().toISOString()
	  if (action === 'publish') {
	    return {
	      status: config.publishStatus,
	      visible_in_app: config.publicEnabled,
	      published_at: now,
	      archived_at: null,
      deleted_at: null,
    }
  }
  if (action === 'unpublish') {
    return {
      status: config.unpublishStatus,
      visible_in_app: false,
      unpublish_at: now,
    }
  }
  if (action === 'archive') {
    return {
      status: config.archiveStatus,
      visible_in_app: false,
      archived_at: now,
    }
  }
  return {
    status: config.restoreStatus,
    archived_at: null,
    deleted_at: null,
  }
}

function clonePayload(row: Record<string, unknown>, config: ContentConfig) {
  const blocked = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'published_by',
    'published_at',
    'archived_at',
    'deleted_at',
    'version',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!blocked.has(key)) next[key] = value
  }

  const suffix = `copy-${Date.now()}`
  if (config.slugColumn && typeof next[config.slugColumn] === 'string') {
    next[config.slugColumn] = `${next[config.slugColumn]}-${suffix}`
  }
  if (config.codeColumn && typeof next[config.codeColumn] === 'string') {
    next[config.codeColumn] = `${next[config.codeColumn]}-${suffix}`.toUpperCase()
  }
  next.status = config.restoreStatus
  next.visible_in_app = false
  return next
}

function sanitizeRestorePayload(snapshot: Record<string, unknown>) {
  const blocked = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'published_by',
    'published_at',
    'version',
  ])
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snapshot)) {
    if (!blocked.has(key)) next[key] = value
  }
  next.deleted_at = null
  next.archived_at = null
  return next
}

function campaignHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)
}

function normalizeRecordJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeCustomerEmail(value?: string | null) {
  const email = String(value ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function customerDisplayName(row: CustomerAudienceRow) {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
  return name || row.email || row.customer_number || 'Cliente'
}

function ageFromBirthDate(value?: string | null) {
  if (!value) return null
  const birth = new Date(`${value}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function metadataText(row: CustomerAudienceRow) {
  return JSON.stringify(row.metadata ?? {}).toLowerCase()
}

async function idsFromRelation(table: string, column = 'customer_id') {
  const result = await supabaseAdminClient.from(table).select(column)
  if (result.error) throw httpError(500, 'No fue posible resolver audiencia')
  return new Set((result.data ?? []).map((item) => String((item as unknown as Record<string, unknown>)[column] ?? '')).filter(Boolean))
}

async function resolveCampaignAudience(filters: CampaignAudienceFilters = {}) {
  const limit = Math.min(filters.limit ?? 250, 500)
  let query: any = supabaseAdminClient
    .from('customers')
    .select('id,user_id,customer_number,first_name,last_name,email,birth_date,source,segment,total_spend,total_visits,preferred_language,marketing_email_consent,metadata,status,created_at')
    .eq('marketing_email_consent', true)
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (filters.segment) query = query.eq('segment', filters.segment)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.minTotalSpend !== undefined) query = query.gte('total_spend', filters.minTotalSpend)
  if (filters.maxTotalSpend !== undefined) query = query.lte('total_spend', filters.maxTotalSpend)
  if (filters.minTotalVisits !== undefined) query = query.gte('total_visits', filters.minTotalVisits)
  if (filters.maxTotalVisits !== undefined) query = query.lte('total_visits', filters.maxTotalVisits)
  if (filters.createdFrom) query = query.gte('created_at', filters.createdFrom)
  if (filters.createdTo) query = query.lte('created_at', filters.createdTo)
  if (filters.search) {
    const term = filters.search.replaceAll(',', ' ').trim()
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%`)
  }

  const result = await query
  if (result.error) throw httpError(500, 'No fue posible consultar clientes')
  let rows = (result.data ?? []) as CustomerAudienceRow[]

  if (filters.tagId) {
    const tagResult = await supabaseAdminClient.from('customer_tag_assignments').select('customer_id').eq('tag_id', filters.tagId)
    if (tagResult.error) throw httpError(500, 'No fue posible resolver etiqueta')
    const ids = new Set((tagResult.data ?? []).map((row) => String(row.customer_id)))
    rows = rows.filter((row) => ids.has(row.id))
  }

  if (filters.hasOrders !== undefined) {
    const ids = await idsFromRelation('orders')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasOrders)
  }
  if (filters.hasReservations !== undefined) {
    const ids = await idsFromRelation('reservations')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasReservations)
  }
  if (filters.hasMembership !== undefined) {
    const ids = await idsFromRelation('memberships')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasMembership)
  }
  if (filters.minAge !== undefined || filters.maxAge !== undefined) {
    rows = rows.filter((row) => {
      const age = ageFromBirthDate(row.birth_date)
      if (age === null) return false
      if (filters.minAge !== undefined && age < filters.minAge) return false
      if (filters.maxAge !== undefined && age > filters.maxAge) return false
      return true
    })
  }
  if (filters.location) {
    const value = filters.location.toLowerCase()
    rows = rows.filter((row) => metadataText(row).includes(value))
  }

  const unique = new Map<string, CustomerAudienceRow>()
  for (const row of rows) {
    const email = normalizeCustomerEmail(row.email)
    if (email && row.marketing_email_consent) unique.set(row.id, row)
  }

  return Array.from(unique.values()).slice(0, limit)
}

function publicAudienceRow(row: CustomerAudienceRow) {
  return {
    id: row.id,
    customerNumber: row.customer_number ?? null,
    name: customerDisplayName(row),
    email: row.email ?? null,
    segment: row.segment ?? null,
    source: row.source ?? null,
    preferredLanguage: row.preferred_language ?? null,
    totalSpend: Number(row.total_spend ?? 0),
    totalVisits: row.total_visits ?? 0,
  }
}

export async function listAdminContent(
  routeEntity: string,
  query: ContentListQuery,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return listContent(config, query)
}

export async function getAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return getContentById(config, id)
}

export async function previewCampaignAudience(filters: CampaignAudienceFilters, user: UserContext) {
  const config = assertEntity('campaigns')
  requirePermission(config, 'read', user)
  const recipients = await resolveCampaignAudience(filters)
  return {
    data: {
      total: recipients.length,
      consentRequired: 'marketing_email_consent',
      filters,
      sample: recipients.slice(0, 20).map(publicAudienceRow),
    },
  }
}

export async function sendCampaignEmail(id: string, payload: SendCampaignPayload, user: UserContext) {
  const config = assertEntity('campaigns')
  requirePermission(config, 'publish', user)
  const { data } = await getContentById(config, id)
  if (!data) throw httpError(404, 'Campaña no encontrada')

  const campaign = data as unknown as Record<string, unknown>
  const storedContent = normalizeRecordJson(campaign.content)
  const content = {
    ...storedContent,
    subject: payload.subject ?? storedContent.subject,
    body: payload.body ?? storedContent.body,
    cta_label: payload.ctaLabel ?? storedContent.cta_label,
    cta_url: payload.ctaUrl ?? storedContent.cta_url,
  }
  const subject = typeof content.subject === 'string' ? content.subject.trim() : ''
  const body = typeof content.body === 'string' ? content.body.trim() : ''
  if (!subject || !body) throw httpError(422, 'La campaña requiere asunto y mensaje')

  const storedAudience = normalizeRecordJson(campaign.audience_definition)
  const audience = {
    ...storedAudience,
    ...(payload.audience ?? {}),
    limit: payload.limit ?? payload.audience?.limit ?? storedAudience.limit,
  } as CampaignAudienceFilters
  const recipients = await resolveCampaignAudience(audience)
  if (recipients.length === 0) throw httpError(422, 'No hay destinatarios con consentimiento para esta audiencia')

  const sendHash = campaignHash({ subject, body, cta: content.cta_label, url: content.cta_url, audience })
  const results = []
  for (const recipient of recipients) {
    const email = normalizeCustomerEmail(recipient.email)
    if (!email) continue
    const sent = await enqueueAndProcessTransactionalEmail({
      eventType: 'campaign.marketing',
      aggregateType: 'campaigns',
      aggregateId: id,
      customerId: recipient.id,
      userId: recipient.user_id ?? null,
      recipientEmail: email,
      locale: recipient.preferred_language ?? audience.locale ?? 'es-MX',
      payload: {
        subject,
        title: subject,
        body,
        campaignName: String(campaign.name ?? 'Campaña Hacienda de Letras'),
        customerName: customerDisplayName(recipient),
        ctaLabel: typeof content.cta_label === 'string' ? content.cta_label : undefined,
      },
      idempotencyKey: `campaign.marketing:${id}:${recipient.id}:${sendHash}`,
    })
    const deliveryStatus = sent.outbox.status === 'sent' || sent.outbox.status === 'delivered'
      ? 'sent'
      : sent.outbox.status === 'failed'
        ? 'failed'
        : 'pending'
    await supabaseAdminClient
      .from('campaign_recipients')
      .upsert({
        campaign_id: id,
        customer_id: recipient.id,
        delivery_status: deliveryStatus,
        delivered_at: deliveryStatus === 'sent' ? new Date().toISOString() : null,
        error_code: sent.outbox.status === 'failed' ? sent.outbox.error_code ?? 'provider_error' : null,
      }, { onConflict: 'campaign_id,customer_id' })
    results.push({
      customerId: recipient.id,
      emailStatus: sent.outbox.status,
      outboxId: sent.outbox.id,
      eventId: sent.event.id,
    })
  }

  const sentAt = new Date().toISOString()
  await updateContent(config, id, {
    audience_definition: audience,
    content,
    status: 'completed',
    visible_in_app: false,
    sent_at: sentAt,
    updated_by: user.userId,
  })

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'campaign_email_sent',
    entity_type: 'campaigns',
    entity_id: id,
    before_data: { status: campaign.status },
    after_data: {
      status: 'completed',
      recipients: results.length,
      sendHash,
    },
  })

  return {
    data: {
      campaignId: id,
      sentAt,
      recipients: results.length,
      sent: results.filter((item) => item.emailStatus === 'sent' || item.emailStatus === 'delivered').length,
      pending: results.filter((item) => item.emailStatus !== 'sent' && item.emailStatus !== 'delivered' && item.emailStatus !== 'failed').length,
      failed: results.filter((item) => item.emailStatus === 'failed').length,
    },
  }
}

export async function createAdminContent(
  routeEntity: ContentRouteEntity,
  payload: Record<string, unknown>,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'create', user)
  return insertContent(config, { ...payload, created_by: user.userId, updated_by: user.userId })
}

export async function updateAdminContent(
  routeEntity: ContentRouteEntity,
  id: string,
  payload: Record<string, unknown>,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'update', user)
  return updateContent(config, id, { ...payload, updated_by: user.userId })
}

export async function deleteAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'delete', user)
  return softDeleteContent(config, id)
}

export async function applyPublicationAction(
  routeEntity: string,
  id: string,
  action: PublicationAction,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, action, user)
  return updateContent(config, id, { ...buildStatusPatch(config, action), updated_by: user.userId })
}

export async function schedulePublicationAction(
  routeEntity: string,
  id: string,
  action: PublicationAction,
  runAt: string,
  timezone: string,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'schedule', user)
  return createPublicationJob(config, id, action, runAt, timezone, user.userId)
}

export async function duplicateAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'duplicate', user)
  const { data } = await getContentById(config, id)
  if (!data) throw httpError(404, 'Contenido no encontrado')
  return insertContent(config, clonePayload(data as unknown as Record<string, unknown>, config))
}

export async function listAdminContentVersions(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return listVersions(config, id)
}

export async function restoreAdminContentVersion(
  routeEntity: string,
  id: string,
  version: number,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'restore', user)
  const { data } = await getVersion(config, id, version)
  if (!data || typeof data !== 'object') throw httpError(404, 'Versión no encontrada')
  const snapshot = (data as { snapshot?: unknown }).snapshot
  if (!snapshot || typeof snapshot !== 'object') throw httpError(422, 'Versión no restaurable')
  return updateContent(config, id, sanitizeRestorePayload(snapshot as Record<string, unknown>))
}

export async function generatePreviewToken(
  routeEntity: string,
  id: string,
  expiresInMinutes: number,
  locale: string,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'preview', user)
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  const { data } = await createPreviewTokenRecord({
    tokenHash: hashToken(token),
    entityType: config.entityType,
    entityId: id,
    locale,
    expiresAt,
    userId: user.userId,
  })
  return { ...data, token }
}

export async function getPreviewContent(token: string) {
  const { data } = await getPreviewToken(hashToken(token))
  if (!data || typeof data !== 'object') throw httpError(404, 'Preview no encontrado')

  const row = data as {
    id: string
    entity_type: string
    entity_id: string
    expires_at: string
    revoked_at: string | null
  }

  if (row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw httpError(404, 'Preview no encontrado')
  }

  const config = Object.values(contentConfigs).find((item) => item.entityType === row.entity_type)
  if (!config) throw httpError(404, 'Preview no encontrado')

  await markPreviewTokenUsed(row.id)
  const content = await getContentById(config, row.entity_id)
  if (!content.data) throw httpError(404, 'Preview no encontrado')
  return {
    entity: config.entityType,
    data: content.data,
  }
}

export async function listPublicEntity(routeEntity: string, locale: string) {
  const config = assertEntity(routeEntity)
  if (!config.publicEnabled) throw httpError(404, 'Entidad no permitida')
  return listPublicContent(config, locale)
}

export async function getPublicEntityBySlug(routeEntity: string, slug: string, locale: string) {
  const config = assertEntity(routeEntity)
  if (!config.publicEnabled || !config.slugColumn) throw httpError(404, 'Entidad no permitida')
  return getPublicContentBySlug(config, slug, locale)
}

export async function processDuePublicationJobs(limit = 10) {
  const workerId = `api-${randomUUID()}`
  const jobs = (await lockDuePublicationJobs(limit, workerId)) as Array<{
    id: string
    entity_type: string
    entity_id: string
    action: PublicationAction
    attempts: number
    max_attempts: number
  }>

  for (const job of jobs) {
    const config = Object.values(contentConfigs).find((item) => item.entityType === job.entity_type)
    if (!config) {
      await failPublicationJob(job.id, job.attempts, job.max_attempts)
      continue
    }

    try {
      await updateContent(config, job.entity_id, buildStatusPatch(config, job.action))
      await completePublicationJob(job.id)
    } catch {
      await failPublicationJob(job.id, job.attempts, job.max_attempts)
    }
  }

  return { processed: jobs.length }
}
