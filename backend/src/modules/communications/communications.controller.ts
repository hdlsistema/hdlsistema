import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { communicationListQuerySchema } from './communications.schemas'
import {
  getCommunication,
  getCommunicationsProviderState,
  listCommunications,
  recordResendWebhookEvent,
  retryCommunication,
} from './communications.service'
import { verifyResendWebhook } from './webhook-verifier'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getCommunicationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = communicationListQuerySchema.parse(req.query)
    const { data, count } = await listCommunications(query, userContext(req))
    res.json({
      ok: true,
      provider: getCommunicationsProviderState(),
      data,
      pagination: { page: query.page, perPage: query.perPage, total: count },
    })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCommunicationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getCommunication(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCommunicationRetryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await retryCommunication(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postResendWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {})
    const verification = verifyResendWebhook(rawBody, req.headers)
    const payload = JSON.parse(rawBody) as Record<string, unknown>
    const data = payload.data && typeof payload.data === 'object'
      ? payload.data as Record<string, unknown>
      : {}
    const providerMessageId = String(data.email_id ?? data.id ?? '')
    await recordResendWebhookEvent({
      providerEventId: verification.id,
      eventType: String(payload.type ?? payload.event ?? 'email.event'),
      providerMessageId: providerMessageId || null,
      payload,
      providerCreatedAt: typeof payload.created_at === 'string' ? payload.created_at : null,
    })
    res.status(202).json({ ok: true })
  } catch (error) {
    sendOperationError(res, error)
  }
}
