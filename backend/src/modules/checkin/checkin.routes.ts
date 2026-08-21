import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getPublicAccessPass,
  getAccessPassAdmin,
  getAccessPassesAdmin,
  getCheckinAdmin,
  getCheckinsAdmin,
  getCheckinsExportAdmin,
  postAccessPassAdmin,
  postCheckinAdmin,
  postReverseCheckinAdmin,
  postRevokeAccessPassAdmin,
  postValidateAccessPassAdmin,
} from './checkin.controller'

const router = Router()
const publicRouter = Router()
const checkinRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const protectedCheckin = [authenticate, authorize(checkinRoles)]
const viewEntries = [...protectedCheckin, requireControlPermission('entries.view')]
const scanEntries = [...protectedCheckin, requireControlPermission('entries.scan')]
const reverseEntries = [...protectedCheckin, requireControlPermission('entries.reverse')]
const countEntries = [...protectedCheckin, requireControlPermission('entries.counts')]

router.use(rateLimit(240, 60_000))
publicRouter.use(rateLimit(120, 60_000))
publicRouter.get('/access/:token', getPublicAccessPass)
router.get('/checkins/export', ...countEntries, getCheckinsExportAdmin)
router.get('/access-passes', ...viewEntries, getAccessPassesAdmin)
router.post('/access-passes', ...viewEntries, postAccessPassAdmin)
router.post('/access-passes/validate', ...scanEntries, postValidateAccessPassAdmin)
router.get('/access-passes/:id', ...viewEntries, getAccessPassAdmin)
router.post('/access-passes/:id/revoke', ...reverseEntries, postRevokeAccessPassAdmin)
router.get('/checkins', ...countEntries, getCheckinsAdmin)
router.post('/checkins', ...scanEntries, postCheckinAdmin)
router.get('/checkins/:id', ...viewEntries, getCheckinAdmin)
router.post('/checkins/:id/reverse', ...reverseEntries, postReverseCheckinAdmin)

export { router as adminCheckinRouter, publicRouter as publicAccessPassRouter }
