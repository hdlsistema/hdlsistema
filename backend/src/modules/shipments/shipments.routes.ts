import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
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

router.use(rateLimit(240, 60_000))
router.get('/shipments/export', ...protectedShipments, getShipmentsExportAdmin)
router.get('/shipments/carriers', ...protectedShipments, getCarriersAdmin)
router.post('/shipments/carriers', ...protectedShipments, postCarrierAdmin)
router.get('/shipments', ...protectedShipments, getShipmentsAdmin)
router.post('/shipments', ...protectedShipments, postShipmentAdmin)
router.get('/shipments/:id', ...protectedShipments, getShipmentAdmin)
router.patch('/shipments/:id', ...protectedShipments, patchShipmentAdmin)
router.post('/shipments/:id/status', ...protectedShipments, postShipmentStatusAdmin)
router.post('/shipments/:id/incident', ...protectedShipments, postShipmentIncidentAdmin)
router.post('/shipments/:id/deliver', ...protectedShipments, postShipmentDeliverAdmin)
router.post('/shipments/:id/cancel', ...protectedShipments, postShipmentCancelAdmin)
router.get('/shipments/:id/history', ...protectedShipments, getShipmentHistoryAdmin)

export { router as adminShipmentsRouter }
