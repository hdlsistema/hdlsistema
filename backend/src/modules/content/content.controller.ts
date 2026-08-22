import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import { getContentConfig } from './content.config'
import {
  applyPublicationAction,
  createAdminContent,
  decideEditorialApproval,
  deleteAdminContent,
  duplicateAdminContent,
  generatePreviewToken,
  getAdminContent,
  getCampaignMetrics,
  getPreviewContent,
  getPublicEntityBySlug,
  listEditorialApprovers,
  listAdminContent,
  listAdminContentVersions,
  listPublicEntity,
  previewCampaignAudience,
  requestEditorialApproval,
  restoreAdminContentVersion,
  schedulePublicationAction,
  sendCampaignEmail,
  updateAdminContent,
} from './content.service'
import {
  approvalDecisionSchema,
  approvalRequestSchema,
  campaignAudiencePreviewSchema,
  listQuerySchema,
  parseContentPatch,
  parseContentPayload,
  previewTokenSchema,
  scheduleSchema,
  sendCampaignSchema,
} from './content.schemas'
import type { ContentRouteEntity, PublicationAction } from './content.types'

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(422).json({
      ok: false,
      error: { code: 'UNPROCESSABLE', message: 'Payload inválido' },
    })
    return
  }

  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : 500
  const safeStatus = Number.isInteger(statusCode) && statusCode >= 400 ? statusCode : 500
  const message = error instanceof Error && safeStatus < 500 ? error.message : 'No fue posible completar la operación'

  res.status(safeStatus).json({
    ok: false,
    error: {
      code: safeStatus === 404 ? 'NOT_FOUND' : safeStatus === 403 ? 'FORBIDDEN' : safeStatus === 422 ? 'UNPROCESSABLE' : 'INTERNAL_ERROR',
      message,
      requestId: (res.locals.requestId as string | undefined) ?? null,
    },
  })
}

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    roles: req.authRoles,
  }
}

function routeEntity(req: Request): ContentRouteEntity {
  const entity = req.params.entity
  const config = getContentConfig(entity)
  if (!config) throw Object.assign(new Error('Entidad no permitida'), { statusCode: 404 })
  return config.route
}

export async function listAdmin(req: Request, res: Response): Promise<void> {
  try {
    const entity = routeEntity(req)
    const query = listQuerySchema.parse(req.query)
    const { data, count } = await listAdminContent(entity, query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count ?? 0 } })
  } catch (error) {
    sendError(res, error)
  }
}

export async function getAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getAdminContent(routeEntity(req), req.params.id, userContext(req))
    if (!data) {
      res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Contenido no encontrado' } })
      return
    }
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function previewCampaignAudienceAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = campaignAudiencePreviewSchema.parse(req.body)
    const { data } = await previewCampaignAudience(payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function sendCampaignAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = sendCampaignSchema.parse(req.body)
    const { data } = await sendCampaignEmail(req.params.id, payload, userContext(req))
    res.status(202).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function listApproversAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listEditorialApprovers(routeEntity(req), userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function requestApprovalAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = approvalRequestSchema.parse(req.body)
    const { data } = await requestEditorialApproval(routeEntity(req), req.params.id, payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function decideApprovalAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = approvalDecisionSchema.parse(req.body)
    const { data } = await decideEditorialApproval(routeEntity(req), req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function getCampaignMetricsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getCampaignMetrics(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const entity = routeEntity(req)
    const payload = parseContentPayload(entity, req.body)
    const { data } = await createAdminContent(entity, payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function patchAdmin(req: Request, res: Response): Promise<void> {
  try {
    const entity = routeEntity(req)
    const payload = parseContentPatch(entity, req.body)
    const { data } = await updateAdminContent(entity, req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function removeAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await deleteAdminContent(routeEntity(req), req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function publishAdmin(req: Request, res: Response): Promise<void> {
  return publicationAction(req, res, 'publish')
}

export async function unpublishAdmin(req: Request, res: Response): Promise<void> {
  return publicationAction(req, res, 'unpublish')
}

export async function archiveAdmin(req: Request, res: Response): Promise<void> {
  return publicationAction(req, res, 'archive')
}

export async function restoreAdmin(req: Request, res: Response): Promise<void> {
  return publicationAction(req, res, 'restore')
}

async function publicationAction(req: Request, res: Response, action: PublicationAction) {
  try {
    const { data } = await applyPublicationAction(routeEntity(req), req.params.id, action, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function scheduleAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = scheduleSchema.parse(req.body)
    const { data } = await schedulePublicationAction(
      routeEntity(req),
      req.params.id,
      payload.action,
      payload.run_at,
      payload.timezone,
      userContext(req),
    )
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function duplicateAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await duplicateAdminContent(routeEntity(req), req.params.id, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function versionsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listAdminContentVersions(routeEntity(req), req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function restoreVersionAdmin(req: Request, res: Response): Promise<void> {
  try {
    const version = Number(req.params.version)
    if (!Number.isInteger(version) || version < 1) {
    res.status(422).json({ ok: false, error: { code: 'UNPROCESSABLE', message: 'Versión inválida' } })
      return
    }
    const { data } = await restoreAdminContentVersion(routeEntity(req), req.params.id, version, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function previewTokenAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = previewTokenSchema.parse(req.body)
    const data = await generatePreviewToken(
      routeEntity(req),
      req.params.id,
      payload.expiresInMinutes,
      payload.locale,
      userContext(req),
    )
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function getPreview(req: Request, res: Response): Promise<void> {
  try {
    const data = await getPreviewContent(req.params.token)
    res.set('Cache-Control', 'no-store')
    res.json({ ok: true, ...data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function listPublic(req: Request, res: Response): Promise<void> {
  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : 'es-MX'
    const { data } = await listPublicEntity(req.params.entity, locale)
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}

export async function getPublicBySlug(req: Request, res: Response): Promise<void> {
  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : 'es-MX'
    const { data } = await getPublicEntityBySlug(req.params.entity, req.params.slug, locale)
    if (!data) {
      res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Contenido no encontrado' } })
      return
    }
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    res.json({ ok: true, data })
  } catch (error) {
    sendError(res, error)
  }
}
