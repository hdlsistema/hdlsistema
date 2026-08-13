import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  lodgingBlockPayloadSchema,
  lodgingCalendarQuerySchema,
  lodgingCheckInPayloadSchema,
  lodgingCheckOutPayloadSchema,
  lodgingReservationPayloadSchema,
  lodgingReschedulePayloadSchema,
  lodgingUnitPatchSchema,
  lodgingUnitPayloadSchema,
} from './lodging.schemas'
import {
  blockLodgingUnit,
  checkInLodging,
  checkOutLodging,
  createLodgingReservation,
  createLodgingUnit,
  getLodgingCalendar,
  listLodgingStays,
  listLodgingPackages,
  listLodgingUnits,
  releaseLodgingEntry,
  rescheduleLodging,
  updateLodgingUnit,
} from './lodging.service'

function user(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getUnits(req: Request, res: Response) { try { res.json({ ok: true, ...(await listLodgingUnits(user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function getPackages(req: Request, res: Response) { try { res.json({ ok: true, ...(await listLodgingPackages(user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postUnit(req: Request, res: Response) { try { res.status(201).json({ ok: true, ...(await createLodgingUnit(lodgingUnitPayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function patchUnit(req: Request, res: Response) { try { res.json({ ok: true, ...(await updateLodgingUnit(req.params.id, lodgingUnitPatchSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function getCalendar(req: Request, res: Response) { try { res.json({ ok: true, ...(await getLodgingCalendar(lodgingCalendarQuerySchema.parse(req.query), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function getStays(req: Request, res: Response) { try { res.json({ ok: true, ...(await listLodgingStays(user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postReservation(req: Request, res: Response) { try { res.status(201).json({ ok: true, ...(await createLodgingReservation(lodgingReservationPayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postReschedule(req: Request, res: Response) { try { res.json({ ok: true, ...(await rescheduleLodging(req.params.reservationId, lodgingReschedulePayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postBlock(req: Request, res: Response) { try { res.status(201).json({ ok: true, ...(await blockLodgingUnit(lodgingBlockPayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function deleteBlock(req: Request, res: Response) { try { res.json({ ok: true, ...(await releaseLodgingEntry(req.params.id, user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postCheckIn(req: Request, res: Response) { try { res.json({ ok: true, ...(await checkInLodging(req.params.reservationId, lodgingCheckInPayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
export async function postCheckOut(req: Request, res: Response) { try { res.json({ ok: true, ...(await checkOutLodging(req.params.reservationId, lodgingCheckOutPayloadSchema.parse(req.body), user(req))) }) } catch (error) { sendOperationError(res, error) } }
