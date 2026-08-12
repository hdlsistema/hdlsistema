import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  assignOrderTrackingAdmin,
  cancelOrderAdmin,
  deliverOrderAdmin,
  fulfillOrderAdmin,
  getOrderAdmin,
  getOrderHistoryAdmin,
  getOrderItemsAdmin,
  getOrderPaymentsAdmin,
  getOrdersAdmin,
  getOrdersExportAdmin,
  markOrderProcessingAdmin,
  patchOrderAdmin,
  postOrderAdmin,
  prepareOrderShipmentAdmin,
  shipOrderAdmin,
} from './orders.controller'

const router = Router()
const orderRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer', 'marketing']
const protectedOrders = [authenticate, authorize(orderRoles)]

router.use(rateLimit(240, 60_000))
router.get('/orders/export', ...protectedOrders, getOrdersExportAdmin)
router.get('/orders', ...protectedOrders, getOrdersAdmin)
router.post('/orders', ...protectedOrders, postOrderAdmin)
router.get('/orders/:id', ...protectedOrders, getOrderAdmin)
router.patch('/orders/:id', ...protectedOrders, patchOrderAdmin)
router.post('/orders/:id/cancel', ...protectedOrders, cancelOrderAdmin)
router.post('/orders/:id/mark-processing', ...protectedOrders, markOrderProcessingAdmin)
router.post('/orders/:id/fulfill', ...protectedOrders, fulfillOrderAdmin)
router.post('/orders/:id/shipping/prepare', ...protectedOrders, prepareOrderShipmentAdmin)
router.post('/orders/:id/shipping/tracking', ...protectedOrders, assignOrderTrackingAdmin)
router.post('/orders/:id/shipping/ship', ...protectedOrders, shipOrderAdmin)
router.post('/orders/:id/shipping/deliver', ...protectedOrders, deliverOrderAdmin)
router.get('/orders/:id/items', ...protectedOrders, getOrderItemsAdmin)
router.get('/orders/:id/payments', ...protectedOrders, getOrderPaymentsAdmin)
router.get('/orders/:id/history', ...protectedOrders, getOrderHistoryAdmin)

export { router as adminOrdersRouter }
