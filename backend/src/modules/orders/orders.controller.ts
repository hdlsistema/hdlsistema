import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createOrderSchema,
  orderListQuerySchema,
  orderShipSchema,
  orderShippingActionSchema,
  orderStatusActionSchema,
  orderTrackingSchema,
  patchOrderSchema,
} from './orders.schemas'
import {
  assignOrderTracking,
  createOrder,
  deliverOrder,
  exportOrders,
  getOrder,
  listOrderHistory,
  listOrderItems,
  listOrderPayments,
  listOrders,
  patchOrder,
  prepareOrderShipment,
  shipOrder,
  updateOrderStatus,
} from './orders.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function getOrdersAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = orderListQuerySchema.parse(req.query)
    const { data, count } = await listOrders(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getOrder(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createOrderSchema.parse(req.body)
    const { data } = await createOrder(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchOrderSchema.parse(req.body)
    const { data } = await patchOrder(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function cancelOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderStatusActionSchema.parse(req.body)
    const { data } = await updateOrderStatus(req.params.id, 'cancelled', payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function markOrderProcessingAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await updateOrderStatus(req.params.id, 'processing', null, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function fulfillOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await updateOrderStatus(req.params.id, 'fulfilled', null, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function prepareOrderShipmentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderShippingActionSchema.parse(req.body ?? {})
    const { data } = await prepareOrderShipment(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function assignOrderTrackingAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderTrackingSchema.parse(req.body)
    const { data } = await assignOrderTracking(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function shipOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderShipSchema.parse(req.body ?? {})
    const { data } = await shipOrder(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function deliverOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderShippingActionSchema.parse(req.body ?? {})
    const { data } = await deliverOrder(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getOrderItemsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listOrderItems(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getOrderPaymentsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listOrderPayments(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getOrderHistoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listOrderHistory(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getOrdersExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = orderListQuerySchema.parse(req.query)
    const csv = await exportOrders(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ordenes-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
