import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  cancelReservationSchema,
  changePartySizeSchema,
  createReservationSchema,
  noteReservationSchema,
  patchReservationSchema,
  reservationListQuerySchema,
  rescheduleReservationSchema,
} from './reservations.schemas'
import {
  addReservationNote,
  cancelReservation,
  changeReservationPartySize,
  confirmReservation,
  createReservation,
  exportReservations,
  getReservation,
  listReservationHistory,
  listReservations,
  rescheduleReservation,
  updateReservation,
} from './reservations.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function listReservationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = reservationListQuerySchema.parse(req.query)
    const { data, count } = await listReservations(query, userContext(req))
    res.json({
      ok: true,
      data,
      pagination: { page: query.page, perPage: query.perPage, total: count ?? 0 },
    })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getReservation(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createReservationSchema.parse(req.body)
    const { data } = await createReservation(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchReservationSchema.parse(req.body)
    const { data } = await updateReservation(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function confirmReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await confirmReservation(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function cancelReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = cancelReservationSchema.parse(req.body)
    const { data } = await cancelReservation(req.params.id, payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function rescheduleReservationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = rescheduleReservationSchema.parse(req.body)
    const { data } = await rescheduleReservation(req.params.id, payload.experienceSlotId, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function changePartySizeAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = changePartySizeSchema.parse(req.body)
    const { data } = await changeReservationPartySize(req.params.id, payload.peopleCount, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function addReservationNoteAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = noteReservationSchema.parse(req.body)
    const { data } = await addReservationNote(req.params.id, payload.note, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function reservationHistoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listReservationHistory(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function exportReservationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = reservationListQuerySchema.parse(req.query)
    const csv = await exportReservations(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reservaciones-hacienda-de-letras.csv"')
    res.send(csv)
  } catch (error) {
    sendOperationError(res, error)
  }
}
