import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import { createEventTicketTypeSchema, patchEventTicketTypeSchema } from './eventTickets.schemas'
import { createEventTicketType, listEventTicketTypes, removeEventTicketType, updateEventTicketType } from './eventTickets.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, roles: req.authRoles }
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(422).json({ ok: false, error: { code: 'UNPROCESSABLE', message: 'Revisa los datos del boleto', details: error.issues } })
    return
  }
  const status = error && typeof error === 'object' && 'statusCode' in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : 500
  res.status(Number.isInteger(status) && status >= 400 ? status : 500).json({
    ok: false,
    error: {
      code: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 422 ? 'UNPROCESSABLE' : 'INTERNAL_ERROR',
      message: error instanceof Error && status < 500 ? error.message : 'No fue posible completar la operación',
    },
  })
}

export async function listEventTicketTypesAdmin(req: Request, res: Response) {
  try {
    const result = await listEventTicketTypes(req.params.eventId, userContext(req))
    res.json({ ok: true, ...result })
  } catch (error) { sendError(res, error) }
}

export async function createEventTicketTypeAdmin(req: Request, res: Response) {
  try {
    const payload = createEventTicketTypeSchema.parse(req.body)
    const result = await createEventTicketType(req.params.eventId, payload, userContext(req))
    res.status(201).json({ ok: true, ...result })
  } catch (error) { sendError(res, error) }
}

export async function patchEventTicketTypeAdmin(req: Request, res: Response) {
  try {
    const payload = patchEventTicketTypeSchema.parse(req.body)
    const result = await updateEventTicketType(req.params.eventId, req.params.ticketId, payload, userContext(req))
    res.json({ ok: true, ...result })
  } catch (error) { sendError(res, error) }
}

export async function removeEventTicketTypeAdmin(req: Request, res: Response) {
  try {
    const result = await removeEventTicketType(req.params.eventId, req.params.ticketId, userContext(req))
    res.json({ ok: true, ...result })
  } catch (error) { sendError(res, error) }
}
