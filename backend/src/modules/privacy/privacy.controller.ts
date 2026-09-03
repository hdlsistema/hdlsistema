import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  accountDeletionListQuerySchema,
  authenticatedAccountDeletionRequestSchema,
  confirmAccountDeletionSchema,
  patchAccountDeletionRequestSchema,
  publicAccountDeletionRequestSchema,
} from './privacy.schemas'
import {
  confirmAccountDeletion,
  createAuthenticatedAccountDeletionRequest,
  createPublicAccountDeletionRequest,
  getAccountDeletionRequest,
  listAccountDeletionRequests,
  patchAccountDeletionRequest,
  processAccountDeletionRequest,
} from './privacy.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    email: req.authUser?.email,
    displayName: typeof req.authUser?.user_metadata?.display_name === 'string'
      ? req.authUser.user_metadata.display_name
      : typeof req.authUser?.user_metadata?.full_name === 'string'
        ? req.authUser.user_metadata.full_name
        : null,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function createPublicAccountDeletion(req: Request, res: Response): Promise<void> {
  try {
    const payload = publicAccountDeletionRequestSchema.parse(req.body)
    const data = await createPublicAccountDeletionRequest(payload, res.locals.requestId)
    res.status(202).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCustomerAccountDeletion(req: Request, res: Response): Promise<void> {
  try {
    const payload = authenticatedAccountDeletionRequestSchema.parse(req.body)
    const result = await createAuthenticatedAccountDeletionRequest(payload, userContext(req), res.locals.requestId)
    res.status(result.duplicate ? 200 : 202).json({ ok: true, ...result })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function confirmPublicAccountDeletion(req: Request, res: Response): Promise<void> {
  try {
    const payload = confirmAccountDeletionSchema.parse(req.body)
    res.status(200).json({ ok: true, ...(await confirmAccountDeletion(payload)) })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listAccountDeletionAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = accountDeletionListQuerySchema.parse(req.query)
    const { data, count } = await listAccountDeletionRequests(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getAccountDeletionAdmin(req: Request, res: Response): Promise<void> {
  try {
    res.json({ ok: true, ...(await getAccountDeletionRequest(req.params.id, userContext(req))) })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchAccountDeletionAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchAccountDeletionRequestSchema.parse(req.body)
    res.json({ ok: true, ...(await patchAccountDeletionRequest(req.params.id, payload, userContext(req))) })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function processAccountDeletionAdmin(req: Request, res: Response): Promise<void> {
  try {
    res.json({ ok: true, ...(await processAccountDeletionRequest(req.params.id, userContext(req))) })
  } catch (error) {
    sendOperationError(res, error)
  }
}
