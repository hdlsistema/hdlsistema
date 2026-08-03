import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  adjustInventorySchema,
  createInventoryItemSchema,
  createInventoryLocationSchema,
  inventoryListQuerySchema,
  movementListQuerySchema,
  patchInventoryItemSchema,
  patchInventoryLocationSchema,
  receiveInventorySchema,
  releaseInventorySchema,
  reserveInventorySchema,
  transferInventorySchema,
} from './inventory.schemas'
import {
  createInventoryItem,
  createInventoryLocation,
  exportInventory,
  exportInventoryMovements,
  getInventoryItem,
  listInventory,
  listInventoryItems,
  listInventoryLocations,
  listInventoryMovements,
  patchInventoryItem,
  patchInventoryLocation,
  runInventoryRpc,
} from './inventory.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = inventoryListQuerySchema.parse(req.query)
    const { data } = await listInventory(query, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryItemsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = inventoryListQuerySchema.parse(req.query)
    const { data, count } = await listInventoryItems(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryItemAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getInventoryItem(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postInventoryItemAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createInventoryItemSchema.parse(req.body)
    const { data } = await createInventoryItem(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchInventoryItemAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchInventoryItemSchema.parse(req.body)
    const { data } = await patchInventoryItem(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryLocationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listInventoryLocations(userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postInventoryLocationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createInventoryLocationSchema.parse(req.body)
    const { data } = await createInventoryLocation(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchInventoryLocationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchInventoryLocationSchema.parse(req.body)
    const { data } = await patchInventoryLocation(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryMovementsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = movementListQuerySchema.parse(req.query)
    const { data, count } = await listInventoryMovements(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postReceiveInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = receiveInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('receive', {
      p_inventory_item_id: payload.inventoryItemId,
      p_quantity: payload.quantity,
      p_reason: payload.reason,
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postReserveInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = reserveInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('reserve', {
      p_inventory_item_id: payload.inventoryItemId,
      p_quantity: payload.quantity,
      p_reference_type: payload.referenceType ?? null,
      p_reference_id: payload.referenceId ?? null,
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postReleaseInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = releaseInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('release', {
      p_inventory_item_id: payload.inventoryItemId,
      p_quantity: payload.quantity,
      p_reason: payload.reason ?? 'Liberación de inventario',
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postFulfillInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = releaseInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('fulfill', {
      p_inventory_item_id: payload.inventoryItemId,
      p_quantity: payload.quantity,
      p_reason: payload.reason ?? 'Salida por cumplimiento',
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postTransferInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = transferInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('transfer', {
      p_inventory_item_id: payload.inventoryItemId,
      p_to_location_id: payload.toLocationId,
      p_quantity: payload.quantity,
      p_reason: payload.reason,
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postAdjustInventoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = adjustInventorySchema.parse(req.body)
    const { data } = await runInventoryRpc('adjust', {
      p_inventory_item_id: payload.inventoryItemId,
      p_quantity_delta: payload.quantityDelta,
      p_reason: payload.reason,
      p_idempotency_key: payload.idempotencyKey,
    }, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = inventoryListQuerySchema.parse(req.query)
    const csv = await exportInventory(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="inventario-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getInventoryMovementsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = movementListQuerySchema.parse(req.query)
    const csv = await exportInventoryMovements(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="movimientos-inventario-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
