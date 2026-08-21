import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewOrders = [...protectedOrders, requireControlPermission('orders.view')]
const manageOrders = [...protectedOrders, requireControlPermission('orders.manage')]
const financialOrders = [...protectedOrders, requireControlPermission('orders.financial')]

router.use(rateLimit(240, 60_000))
router.get('/orders/export', ...financialOrders, getOrdersExportAdmin)
router.get('/orders', ...viewOrders, getOrdersAdmin)
router.post('/orders', ...financialOrders, postOrderAdmin)
router.get('/orders/:id', ...viewOrders, getOrderAdmin)
router.patch('/orders/:id', ...financialOrders, patchOrderAdmin)
router.post('/orders/:id/cancel', ...manageOrders, cancelOrderAdmin)
router.post('/orders/:id/mark-processing', ...manageOrders, markOrderProcessingAdmin)
router.post('/orders/:id/fulfill', ...manageOrders, fulfillOrderAdmin)
router.post('/orders/:id/shipping/prepare', ...manageOrders, prepareOrderShipmentAdmin)
router.post('/orders/:id/shipping/tracking', ...manageOrders, assignOrderTrackingAdmin)
router.post('/orders/:id/shipping/ship', ...manageOrders, shipOrderAdmin)
router.post('/orders/:id/shipping/deliver', ...manageOrders, deliverOrderAdmin)
router.get('/orders/:id/items', ...viewOrders, getOrderItemsAdmin)
router.get('/orders/:id/payments', ...financialOrders, getOrderPaymentsAdmin)
router.get('/orders/:id/history', ...viewOrders, getOrderHistoryAdmin)

export { router as adminOrdersRouter }
