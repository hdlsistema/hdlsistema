import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import {
  createCustomerAccountDeletion,
  createPublicAccountDeletion,
  confirmPublicAccountDeletion,
  getAccountDeletionAdmin,
  listAccountDeletionAdmin,
  patchAccountDeletionAdmin,
  processAccountDeletionAdmin,
} from './privacy.controller'

const publicRouter = Router()
const customerRouter = Router()
const adminRouter = Router()

const customerRoles = ['customer', 'super_admin', 'admin']
const privacyReadRoles = ['super_admin', 'admin', 'operations', 'finance']
const privacyWriteRoles = ['super_admin', 'admin', 'operations']

publicRouter.post('/account-deletion-requests', rateLimit(6, 60 * 60_000), createPublicAccountDeletion)
publicRouter.post('/account-deletion-requests/confirm', rateLimit(12, 60 * 60_000), confirmPublicAccountDeletion)
customerRouter.post(
  '/account-deletion-requests',
  rateLimit(12, 60 * 60_000),
  authenticate,
  authorize(customerRoles),
  createCustomerAccountDeletion,
)
adminRouter.get(
  '/account-deletion-requests',
  rateLimit(240, 60_000),
  authenticate,
  authorize(privacyReadRoles),
  requireControlPermission('privacy.manage'),
  listAccountDeletionAdmin,
)
adminRouter.get(
  '/account-deletion-requests/:id',
  rateLimit(240, 60_000),
  authenticate,
  authorize(privacyReadRoles),
  requireControlPermission('privacy.manage'),
  getAccountDeletionAdmin,
)
adminRouter.patch(
  '/account-deletion-requests/:id',
  rateLimit(120, 60_000),
  authenticate,
  authorize(privacyWriteRoles),
  requireControlPermission('privacy.manage'),
  patchAccountDeletionAdmin,
)
adminRouter.post(
  '/account-deletion-requests/:id/process',
  rateLimit(60, 60_000),
  authenticate,
  authorize(privacyWriteRoles),
  requireControlPermission('privacy.manage'),
  processAccountDeletionAdmin,
)

export {
  publicRouter as publicPrivacyRouter,
  customerRouter as customerPrivacyRouter,
  adminRouter as adminPrivacyRouter,
}
