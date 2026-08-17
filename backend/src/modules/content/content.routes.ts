import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
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

adminRouter.use(rateLimit(240, 60_000))
adminRouter.post('/campaigns/audience-preview', ...protectedAdmin, previewCampaignAudienceAdmin)
adminRouter.post('/campaigns/:id/send', ...protectedAdmin, sendCampaignAdmin)
adminRouter.get('/campaigns/:id/metrics', ...protectedAdmin, getCampaignMetricsAdmin)
adminRouter.get('/events/:eventId/ticket-types', ...protectedAdmin, listEventTicketTypesAdmin)
adminRouter.post('/events/:eventId/ticket-types', ...protectedAdmin, createEventTicketTypeAdmin)
adminRouter.patch('/events/:eventId/ticket-types/:ticketId', ...protectedAdmin, patchEventTicketTypeAdmin)
adminRouter.delete('/events/:eventId/ticket-types/:ticketId', ...protectedAdmin, removeEventTicketTypeAdmin)
adminRouter.get('/:entity', ...protectedAdmin, listAdmin)
adminRouter.get('/:entity/:id', ...protectedAdmin, getAdmin)
adminRouter.post('/:entity', ...protectedAdmin, createAdmin)
adminRouter.patch('/:entity/:id', ...protectedAdmin, patchAdmin)
adminRouter.delete('/:entity/:id', ...protectedAdmin, removeAdmin)
adminRouter.post('/:entity/:id/publish', ...protectedAdmin, publishAdmin)
adminRouter.post('/:entity/:id/unpublish', ...protectedAdmin, unpublishAdmin)
adminRouter.post('/:entity/:id/schedule', ...protectedAdmin, scheduleAdmin)
adminRouter.post('/:entity/:id/duplicate', ...protectedAdmin, duplicateAdmin)
adminRouter.post('/:entity/:id/archive', ...protectedAdmin, archiveAdmin)
adminRouter.post('/:entity/:id/restore', ...protectedAdmin, restoreAdmin)
adminRouter.get('/:entity/:id/versions', ...protectedAdmin, versionsAdmin)
adminRouter.post('/:entity/:id/versions/:version/restore', ...protectedAdmin, restoreVersionAdmin)
adminRouter.post('/:entity/:id/preview-token', ...protectedAdmin, previewTokenAdmin)

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
