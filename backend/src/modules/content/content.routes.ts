import { Router, type Request } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import { contentAdminRoles } from './content.permissions'
import {
  createEventTicketTypeAdmin,
  listEventTicketTypesAdmin,
  patchEventTicketTypeAdmin,
  removeEventTicketTypeAdmin,
} from './eventTickets.controller'
import {
  archiveAdmin,
  createAdmin,
  duplicateAdmin,
  getAdmin,
	  getPreview,
	  getCampaignMetricsAdmin,
  getPublicBySlug,
  listAdmin,
	  listPublic,
	  patchAdmin,
	  previewTokenAdmin,
	  previewCampaignAudienceAdmin,
	  publishAdmin,
	  removeAdmin,
	  restoreAdmin,
	  restoreVersionAdmin,
	  scheduleAdmin,
	  sendCampaignAdmin,
	  unpublishAdmin,
	  versionsAdmin,
	} from './content.controller'

const adminRouter = Router()
const publicRouter = Router()
const previewRouter = Router()
const protectedAdmin = [authenticate, authorize(contentAdminRoles)]
const contentPermissionByEntity: Record<string, string> = {
  wines: 'content.wines.manage',
  experiences: 'content.experiences.manage',
  events: 'content.events.manage',
  services: 'content.services.manage',
  promotions: 'content.promotions.manage',
  'membership-plans': 'content.memberships.manage',
  campaigns: 'content.campaigns.manage',
}
const allContentPermissions = Object.values(contentPermissionByEntity)
const contentPermissionForRequest = (req: Request) => contentPermissionByEntity[req.params.entity] ?? allContentPermissions

adminRouter.use(rateLimit(240, 60_000))
adminRouter.post('/campaigns/audience-preview', ...protectedAdmin, requireControlPermission('content.campaigns.manage'), previewCampaignAudienceAdmin)
adminRouter.post('/campaigns/:id/send', ...protectedAdmin, requireControlPermission('content.campaigns.manage'), sendCampaignAdmin)
adminRouter.get('/campaigns/:id/metrics', ...protectedAdmin, requireControlPermission('content.campaigns.manage'), getCampaignMetricsAdmin)
adminRouter.get('/events/:eventId/ticket-types', ...protectedAdmin, requireControlPermission('content.events.manage'), listEventTicketTypesAdmin)
adminRouter.post('/events/:eventId/ticket-types', ...protectedAdmin, requireControlPermission('content.events.manage'), createEventTicketTypeAdmin)
adminRouter.patch('/events/:eventId/ticket-types/:ticketId', ...protectedAdmin, requireControlPermission('content.events.manage'), patchEventTicketTypeAdmin)
adminRouter.delete('/events/:eventId/ticket-types/:ticketId', ...protectedAdmin, requireControlPermission('content.events.manage'), removeEventTicketTypeAdmin)
adminRouter.get('/:entity', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), listAdmin)
adminRouter.get('/:entity/:id', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), getAdmin)
adminRouter.post('/:entity', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), createAdmin)
adminRouter.patch('/:entity/:id', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), patchAdmin)
adminRouter.delete('/:entity/:id', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), removeAdmin)
adminRouter.post('/:entity/:id/publish', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), publishAdmin)
adminRouter.post('/:entity/:id/unpublish', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), unpublishAdmin)
adminRouter.post('/:entity/:id/schedule', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), scheduleAdmin)
adminRouter.post('/:entity/:id/duplicate', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), duplicateAdmin)
adminRouter.post('/:entity/:id/archive', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), archiveAdmin)
adminRouter.post('/:entity/:id/restore', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), restoreAdmin)
adminRouter.get('/:entity/:id/versions', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), versionsAdmin)
adminRouter.post('/:entity/:id/versions/:version/restore', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), restoreVersionAdmin)
adminRouter.post('/:entity/:id/preview-token', ...protectedAdmin, requireControlPermission(contentPermissionForRequest), previewTokenAdmin)

publicRouter.use(rateLimit(300, 60_000))
publicRouter.get('/:entity', listPublic)
publicRouter.get('/:entity/:slug', getPublicBySlug)

previewRouter.use(rateLimit(60, 60_000))
previewRouter.get('/:token', getPreview)

export {
  adminRouter as adminContentRouter,
  publicRouter as publicContentRouter,
  previewRouter as previewContentRouter,
}
