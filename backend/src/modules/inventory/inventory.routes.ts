import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getInventoryAdmin,
  getInventoryExportAdmin,
  getInventoryItemAdmin,
  getInventoryItemsAdmin,
  getInventoryLocationsAdmin,
  getInventoryMovementsAdmin,
  getInventoryMovementsExportAdmin,
  patchInventoryItemAdmin,
  patchInventoryLocationAdmin,
  postAdjustInventoryAdmin,
  postFulfillInventoryAdmin,
  postInventoryItemAdmin,
  postInventoryLocationAdmin,
  postReceiveInventoryAdmin,
  postReleaseInventoryAdmin,
  postReserveInventoryAdmin,
  postTransferInventoryAdmin,
} from './inventory.controller'

const router = Router()
const inventoryRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const protectedInventory = [authenticate, authorize(inventoryRoles)]
const viewInventory = [...protectedInventory, requireControlPermission('inventory.view')]
const manageInventory = [...protectedInventory, requireControlPermission('inventory.manage')]

router.use(rateLimit(240, 60_000))
router.get('/inventory/export', ...viewInventory, getInventoryExportAdmin)
router.get('/inventory/movements/export', ...viewInventory, getInventoryMovementsExportAdmin)
router.get('/inventory', ...viewInventory, getInventoryAdmin)
router.get('/inventory/items', ...viewInventory, getInventoryItemsAdmin)
router.post('/inventory/items', ...manageInventory, postInventoryItemAdmin)
router.get('/inventory/items/:id', ...viewInventory, getInventoryItemAdmin)
router.patch('/inventory/items/:id', ...manageInventory, patchInventoryItemAdmin)
router.get('/inventory/locations', ...viewInventory, getInventoryLocationsAdmin)
router.post('/inventory/locations', ...manageInventory, postInventoryLocationAdmin)
router.patch('/inventory/locations/:id', ...manageInventory, patchInventoryLocationAdmin)
router.get('/inventory/movements', ...viewInventory, getInventoryMovementsAdmin)
router.post('/inventory/receive', ...manageInventory, postReceiveInventoryAdmin)
router.post('/inventory/reserve', ...manageInventory, postReserveInventoryAdmin)
router.post('/inventory/release', ...manageInventory, postReleaseInventoryAdmin)
router.post('/inventory/fulfill', ...manageInventory, postFulfillInventoryAdmin)
router.post('/inventory/transfer', ...manageInventory, postTransferInventoryAdmin)
router.post('/inventory/adjust', ...manageInventory, postAdjustInventoryAdmin)

export { router as adminInventoryRouter }
