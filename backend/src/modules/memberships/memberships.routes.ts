import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getMembershipAdmin,
  getMembershipBenefitsAdmin,
  getMembershipHistoryAdmin,
  getMembershipLoyaltyAdmin,
  getMembershipsAdmin,
  getMembershipsExportAdmin,
  membershipActionAdmin,
  patchMembershipAdmin,
  postMembershipAdmin,
  postMembershipLoyaltyAdjustmentAdmin,
  postMembershipOrderLoyaltyAdmin,
} from './memberships.controller'

const router = Router()
const membershipRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const protectedMemberships = [authenticate, authorize(membershipRoles)]

router.use(rateLimit(240, 60_000))
router.get('/memberships/export', ...protectedMemberships, getMembershipsExportAdmin)
router.get('/memberships', ...protectedMemberships, getMembershipsAdmin)
router.post('/memberships', ...protectedMemberships, postMembershipAdmin)
router.get('/memberships/:id', ...protectedMemberships, getMembershipAdmin)
router.patch('/memberships/:id', ...protectedMemberships, patchMembershipAdmin)
router.post('/memberships/:id/:action(activate|pause|resume|cancel|renew)', ...protectedMemberships, membershipActionAdmin)
router.get('/memberships/:id/history', ...protectedMemberships, getMembershipHistoryAdmin)
router.get('/memberships/:id/benefits', ...protectedMemberships, getMembershipBenefitsAdmin)
router.get('/memberships/:id/loyalty', ...protectedMemberships, getMembershipLoyaltyAdmin)
router.post('/memberships/:id/loyalty-adjustment', ...protectedMemberships, postMembershipLoyaltyAdjustmentAdmin)
router.post('/memberships/:id/order-loyalty', ...protectedMemberships, postMembershipOrderLoyaltyAdmin)

export { router as adminMembershipsRouter }
