import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
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

router.use(rateLimit(240, 60_000))
router.get('/inventory/export', ...protectedInventory, getInventoryExportAdmin)
router.get('/inventory/movements/export', ...protectedInventory, getInventoryMovementsExportAdmin)
router.get('/inventory', ...protectedInventory, getInventoryAdmin)
router.get('/inventory/items', ...protectedInventory, getInventoryItemsAdmin)
router.post('/inventory/items', ...protectedInventory, postInventoryItemAdmin)
router.get('/inventory/items/:id', ...protectedInventory, getInventoryItemAdmin)
router.patch('/inventory/items/:id', ...protectedInventory, patchInventoryItemAdmin)
router.get('/inventory/locations', ...protectedInventory, getInventoryLocationsAdmin)
router.post('/inventory/locations', ...protectedInventory, postInventoryLocationAdmin)
router.patch('/inventory/locations/:id', ...protectedInventory, patchInventoryLocationAdmin)
router.get('/inventory/movements', ...protectedInventory, getInventoryMovementsAdmin)
router.post('/inventory/receive', ...protectedInventory, postReceiveInventoryAdmin)
router.post('/inventory/reserve', ...protectedInventory, postReserveInventoryAdmin)
router.post('/inventory/release', ...protectedInventory, postReleaseInventoryAdmin)
router.post('/inventory/fulfill', ...protectedInventory, postFulfillInventoryAdmin)
router.post('/inventory/transfer', ...protectedInventory, postTransferInventoryAdmin)
router.post('/inventory/adjust', ...protectedInventory, postAdjustInventoryAdmin)

export { router as adminInventoryRouter }
