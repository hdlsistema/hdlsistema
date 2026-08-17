import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { executiveAssistantMessageSchema } from './executiveAssistant.schemas'
import { createExecutiveRealtimeSession, getExecutiveAssistantStatus, sendExecutiveAssistantMessage } from './executiveAssistant.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles ?? [] }
}

export async function executiveAssistantStatusController(req: Request, res: Response) {
  try { res.json({ ok: true, data: await getExecutiveAssistantStatus(userContext(req)) }) } catch (error) { sendOperationError(res, error) }
}

export async function executiveAssistantMessageController(req: Request, res: Response) {
  try { res.json({ ok: true, data: await sendExecutiveAssistantMessage(executiveAssistantMessageSchema.parse(req.body), userContext(req)) }) } catch (error) { sendOperationError(res, error) }
}

export async function executiveAssistantRealtimeController(req: Request, res: Response) {
  try { res.json({ ok: true, data: await createExecutiveRealtimeSession(userContext(req)) }) } catch (error) { sendOperationError(res, error) }
}
