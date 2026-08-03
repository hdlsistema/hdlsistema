import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  archiveDistributorAdmin,
  deleteDistributorContactAdmin,
  distributorOrderActionAdmin,
  getDistributorAdmin,
  getDistributorContactsAdmin,
  getDistributorOrderAdmin,
  getDistributorOrderItemsAdmin,
  getDistributorOrdersAdmin,
  getDistributorOrdersExportAdmin,
  getDistributorsAdmin,
  getDistributorsExportAdmin,
  patchDistributorAdmin,
  patchDistributorContactAdmin,
  patchDistributorOrderAdmin,
  postDistributorAdmin,
  postDistributorContactAdmin,
  postDistributorOrderAdmin,
  restoreDistributorAdmin,
} from './distributors.controller'

const router = Router()
const distributorRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const protectedDistributors = [authenticate, authorize(distributorRoles)]

router.use(rateLimit(240, 60_000))
router.get('/distributors/export', ...protectedDistributors, getDistributorsExportAdmin)
router.get('/distributor-orders/export', ...protectedDistributors, getDistributorOrdersExportAdmin)
router.get('/distributors', ...protectedDistributors, getDistributorsAdmin)
router.post('/distributors', ...protectedDistributors, postDistributorAdmin)
router.get('/distributors/:id', ...protectedDistributors, getDistributorAdmin)
router.patch('/distributors/:id', ...protectedDistributors, patchDistributorAdmin)
router.post('/distributors/:id/archive', ...protectedDistributors, archiveDistributorAdmin)
router.post('/distributors/:id/restore', ...protectedDistributors, restoreDistributorAdmin)
router.get('/distributors/:id/contacts', ...protectedDistributors, getDistributorContactsAdmin)
router.post('/distributors/:id/contacts', ...protectedDistributors, postDistributorContactAdmin)
router.patch('/distributors/:id/contacts/:contactId', ...protectedDistributors, patchDistributorContactAdmin)
router.delete('/distributors/:id/contacts/:contactId', ...protectedDistributors, deleteDistributorContactAdmin)
router.get('/distributor-orders', ...protectedDistributors, getDistributorOrdersAdmin)
router.post('/distributor-orders', ...protectedDistributors, postDistributorOrderAdmin)
router.get('/distributor-orders/:id', ...protectedDistributors, getDistributorOrderAdmin)
router.patch('/distributor-orders/:id', ...protectedDistributors, patchDistributorOrderAdmin)
router.get('/distributor-orders/:id/items', ...protectedDistributors, getDistributorOrderItemsAdmin)
router.post('/distributor-orders/:id/:action(approve|reject|prepare|ship|deliver|cancel)', ...protectedDistributors, distributorOrderActionAdmin)

export { router as adminDistributorsRouter }
