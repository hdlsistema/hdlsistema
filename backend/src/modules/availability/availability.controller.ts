import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  availabilityQuerySchema,
  blockSlotSchema,
  blockoutPatchSchema,
  blockoutPayloadSchema,
  duplicateSlotsSchema,
  slotPatchSchema,
  slotPayloadSchema,
} from './availability.schemas'
import {
  blockSlot,
  createBlockout,
  createSlot,
  deleteBlockout,
  duplicateSlots,
  listAvailability,
  listBlockouts,
  listCalendar,
  listSlots,
  unblockSlot,
  updateBlockout,
  updateSlot,
} from './availability.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  try {
    const query = availabilityQuerySchema.parse(req.query)
    const { data } = await listAvailability(query, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getAvailabilityCalendar(req: Request, res: Response): Promise<void> {
  try {
    const query = availabilityQuerySchema.parse(req.query)
    const { data } = await listCalendar(query, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getSlots(req: Request, res: Response): Promise<void> {
  try {
    const query = availabilityQuerySchema.parse(req.query)
    const { data } = await listSlots(query, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postSlot(req: Request, res: Response): Promise<void> {
  try {
    const payload = slotPayloadSchema.parse(req.body)
    const { data } = await createSlot(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchSlot(req: Request, res: Response): Promise<void> {
  try {
    const payload = slotPatchSchema.parse(req.body)
    const { data } = await updateSlot(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postBlockSlot(req: Request, res: Response): Promise<void> {
  try {
    const payload = blockSlotSchema.parse(req.body)
    const { data } = await blockSlot(req.params.id, payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postUnblockSlot(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await unblockSlot(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getBlockouts(req: Request, res: Response): Promise<void> {
  try {
    const query = availabilityQuerySchema.parse(req.query)
    const { data } = await listBlockouts(query, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postBlockout(req: Request, res: Response): Promise<void> {
  try {
    const payload = blockoutPayloadSchema.parse(req.body)
    const { data } = await createBlockout(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchBlockout(req: Request, res: Response): Promise<void> {
  try {
    const payload = blockoutPatchSchema.parse(req.body)
    const { data } = await updateBlockout(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function removeBlockout(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await deleteBlockout(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postDuplicateSlots(req: Request, res: Response): Promise<void> {
  try {
    const payload = duplicateSlotsSchema.parse(req.body)
    const { data } = await duplicateSlots(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
