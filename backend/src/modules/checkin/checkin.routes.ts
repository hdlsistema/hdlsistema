import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
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
const checkinRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const protectedCheckin = [authenticate, authorize(checkinRoles)]

router.use(rateLimit(240, 60_000))
router.get('/checkins/export', ...protectedCheckin, getCheckinsExportAdmin)
router.get('/access-passes', ...protectedCheckin, getAccessPassesAdmin)
router.post('/access-passes', ...protectedCheckin, postAccessPassAdmin)
router.post('/access-passes/validate', ...protectedCheckin, postValidateAccessPassAdmin)
router.get('/access-passes/:id', ...protectedCheckin, getAccessPassAdmin)
router.post('/access-passes/:id/revoke', ...protectedCheckin, postRevokeAccessPassAdmin)
router.get('/checkins', ...protectedCheckin, getCheckinsAdmin)
router.post('/checkins', ...protectedCheckin, postCheckinAdmin)
router.get('/checkins/:id', ...protectedCheckin, getCheckinAdmin)
router.post('/checkins/:id/reverse', ...protectedCheckin, postReverseCheckinAdmin)

export { router as adminCheckinRouter }
