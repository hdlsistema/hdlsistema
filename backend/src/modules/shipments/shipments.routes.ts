import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getCarriersAdmin,
  getShipmentAdmin,
  getShipmentHistoryAdmin,
  getShipmentsAdmin,
  getShipmentsExportAdmin,
  patchShipmentAdmin,
  postCarrierAdmin,
  postShipmentAdmin,
  postShipmentCancelAdmin,
  postShipmentDeliverAdmin,
  postShipmentIncidentAdmin,
  postShipmentStatusAdmin,
} from './shipments.controller'

const router = Router()
const shipmentRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const protectedShipments = [authenticate, authorize(shipmentRoles)]
const viewShipments = [...protectedShipments, requireControlPermission('logistics.view')]
const manageShipments = [...protectedShipments, requireControlPermission('logistics.manage')]

router.use(rateLimit(240, 60_000))
router.get('/shipments/export', ...viewShipments, getShipmentsExportAdmin)
router.get('/shipments/carriers', ...viewShipments, getCarriersAdmin)
router.post('/shipments/carriers', ...manageShipments, postCarrierAdmin)
router.get('/shipments', ...viewShipments, getShipmentsAdmin)
router.post('/shipments', ...manageShipments, postShipmentAdmin)
router.get('/shipments/:id', ...viewShipments, getShipmentAdmin)
router.patch('/shipments/:id', ...manageShipments, patchShipmentAdmin)
router.post('/shipments/:id/status', ...manageShipments, postShipmentStatusAdmin)
router.post('/shipments/:id/incident', ...manageShipments, postShipmentIncidentAdmin)
router.post('/shipments/:id/deliver', ...manageShipments, postShipmentDeliverAdmin)
router.post('/shipments/:id/cancel', ...manageShipments, postShipmentCancelAdmin)
router.get('/shipments/:id/history', ...viewShipments, getShipmentHistoryAdmin)

export { router as adminShipmentsRouter }
