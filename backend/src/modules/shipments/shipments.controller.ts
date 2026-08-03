import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createCarrierSchema,
  createShipmentSchema,
  patchShipmentSchema,
  shipmentDeliverSchema,
  shipmentIncidentSchema,
  shipmentListQuerySchema,
  shipmentStatusActionSchema,
} from './shipments.schemas'
import {
  createCarrier,
  createShipment,
  deliverShipment,
  exportShipments,
  getShipment,
  listCarriers,
  listShipmentHistory,
  listShipments,
  patchShipment,
  registerShipmentIncident,
  updateShipmentStatus,
} from './shipments.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getShipmentsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = shipmentListQuerySchema.parse(req.query)
    const { data, count } = await listShipments(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getShipmentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getShipment(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postShipmentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createShipmentSchema.parse(req.body)
    const { data } = await createShipment(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchShipmentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchShipmentSchema.parse(req.body)
    const { data } = await patchShipment(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postShipmentStatusAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = shipmentStatusActionSchema.parse(req.body)
    const { data } = await updateShipmentStatus(req.params.id, payload.status, payload.notes, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postShipmentIncidentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = shipmentIncidentSchema.parse(req.body)
    const { data } = await registerShipmentIncident(req.params.id, payload.notes, payload.evidenceStoragePath, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postShipmentDeliverAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = shipmentDeliverSchema.parse(req.body ?? {})
    const { data } = await deliverShipment(req.params.id, payload.notes, payload.evidenceStoragePath, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postShipmentCancelAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = shipmentDeliverSchema.parse(req.body ?? {})
    const { data } = await updateShipmentStatus(req.params.id, 'cancelled', payload.notes, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getShipmentHistoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listShipmentHistory(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getShipmentsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = shipmentListQuerySchema.parse(req.query)
    const csv = await exportShipments(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="envios-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCarriersAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCarriers(userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCarrierAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createCarrierSchema.parse(req.body)
    const { data } = await createCarrier(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
