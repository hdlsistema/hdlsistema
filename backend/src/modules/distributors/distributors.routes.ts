import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewDistributors = [...protectedDistributors, requireControlPermission('distributors.view')]
const manageDistributors = [...protectedDistributors, requireControlPermission('distributors.manage')]
const financialDistributors = [...protectedDistributors, requireControlPermission('distributors.financial')]

router.use(rateLimit(240, 60_000))
router.get('/distributors/export', ...financialDistributors, getDistributorsExportAdmin)
router.get('/distributor-orders/export', ...financialDistributors, getDistributorOrdersExportAdmin)
router.get('/distributors', ...viewDistributors, getDistributorsAdmin)
router.post('/distributors', ...manageDistributors, postDistributorAdmin)
router.get('/distributors/:id', ...viewDistributors, getDistributorAdmin)
router.patch('/distributors/:id', ...manageDistributors, patchDistributorAdmin)
router.post('/distributors/:id/archive', ...manageDistributors, archiveDistributorAdmin)
router.post('/distributors/:id/restore', ...manageDistributors, restoreDistributorAdmin)
router.get('/distributors/:id/contacts', ...viewDistributors, getDistributorContactsAdmin)
router.post('/distributors/:id/contacts', ...manageDistributors, postDistributorContactAdmin)
router.patch('/distributors/:id/contacts/:contactId', ...manageDistributors, patchDistributorContactAdmin)
router.delete('/distributors/:id/contacts/:contactId', ...manageDistributors, deleteDistributorContactAdmin)
router.get('/distributor-orders', ...financialDistributors, getDistributorOrdersAdmin)
router.post('/distributor-orders', ...financialDistributors, postDistributorOrderAdmin)
router.get('/distributor-orders/:id', ...financialDistributors, getDistributorOrderAdmin)
router.patch('/distributor-orders/:id', ...financialDistributors, patchDistributorOrderAdmin)
router.get('/distributor-orders/:id/items', ...financialDistributors, getDistributorOrderItemsAdmin)
router.post('/distributor-orders/:id/:action(approve|reject|prepare|ship|deliver|cancel)', ...financialDistributors, distributorOrderActionAdmin)

export { router as adminDistributorsRouter }
