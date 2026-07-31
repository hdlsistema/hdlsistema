import { createHash, randomBytes, randomUUID } from 'crypto'
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
      visible_in_app: true,
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
