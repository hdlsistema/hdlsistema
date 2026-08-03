import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  accessPassListQuerySchema,
  checkinListQuerySchema,
  issueAccessPassSchema,
  registerCheckinSchema,
  reverseCheckinSchema,
  revokeAccessPassSchema,
  validateAccessPassSchema,
} from './checkin.schemas'
import {
  exportCheckins,
  getAccessPass,
  getCheckin,
  issueAccessPass,
  listAccessPasses,
  listCheckins,
  registerCheckin,
  reverseCheckin,
  revokeAccessPass,
  validateAccessPass,
} from './checkin.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function getAccessPassesAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = accessPassListQuerySchema.parse(req.query)
    const { data, count } = await listAccessPasses(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getAccessPassAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getAccessPass(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postAccessPassAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = issueAccessPassSchema.parse(req.body)
    const { data } = await issueAccessPass(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postRevokeAccessPassAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = revokeAccessPassSchema.parse(req.body)
    const { data } = await revokeAccessPass(req.params.id, payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postValidateAccessPassAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = validateAccessPassSchema.parse(req.body)
    const { data } = await validateAccessPass(payload.code, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCheckinsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = checkinListQuerySchema.parse(req.query)
    const { data, count } = await listCheckins(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCheckinAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getCheckin(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCheckinAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = registerCheckinSchema.parse(req.body)
    const { data } = await registerCheckin(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postReverseCheckinAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = reverseCheckinSchema.parse(req.body)
    const { data } = await reverseCheckin(req.params.id, payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCheckinsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = checkinListQuerySchema.parse(req.query)
    const csv = await exportCheckins(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="check-in-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
