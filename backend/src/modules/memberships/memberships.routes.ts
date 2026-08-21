import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewMemberships = [...protectedMemberships, requireControlPermission('wineclub.view')]
const manageMemberships = [...protectedMemberships, requireControlPermission('wineclub.manage')]
const financialMemberships = [...protectedMemberships, requireControlPermission('wineclub.financial')]

router.use(rateLimit(240, 60_000))
router.get('/memberships/export', ...financialMemberships, getMembershipsExportAdmin)
router.get('/memberships', ...viewMemberships, getMembershipsAdmin)
router.post('/memberships', ...manageMemberships, postMembershipAdmin)
router.get('/memberships/:id', ...viewMemberships, getMembershipAdmin)
router.patch('/memberships/:id', ...manageMemberships, patchMembershipAdmin)
router.post('/memberships/:id/:action(activate|pause|resume|cancel|renew)', ...manageMemberships, membershipActionAdmin)
router.get('/memberships/:id/history', ...viewMemberships, getMembershipHistoryAdmin)
router.get('/memberships/:id/benefits', ...viewMemberships, getMembershipBenefitsAdmin)
router.get('/memberships/:id/loyalty', ...viewMemberships, getMembershipLoyaltyAdmin)
router.post('/memberships/:id/loyalty-adjustment', ...manageMemberships, postMembershipLoyaltyAdjustmentAdmin)
router.post('/memberships/:id/order-loyalty', ...manageMemberships, postMembershipOrderLoyaltyAdmin)

export { router as adminMembershipsRouter }
