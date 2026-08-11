import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { sommelierMessageSchema } from './sommelier.schemas'
import { sendSommelierMessage } from './sommelier.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles ?? [],
  }
}

export async function sendSommelierMessageController(req: Request, res: Response): Promise<void> {
  try {
    const payload = sommelierMessageSchema.parse(req.body)
    const result = await sendSommelierMessage(payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
