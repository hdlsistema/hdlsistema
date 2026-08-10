import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { activityListQuerySchema, appActivityEventSchema, cartsListQuerySchema } from './activity.schemas'
import { getCustomerCartActivity, listAppActivity, listCustomerCarts, recordAppActivity } from './activity.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function postCustomerAppActivity(req: Request, res: Response): Promise<void> {
  try {
    const payload = appActivityEventSchema.parse(req.body)
    const data = await recordAppActivity(payload, { userId: req.authUser?.id })
    res.status(202).json({ ok: true, data: { accepted: data.accepted, duplicate: data.duplicate } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getAppActivityAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = activityListQuerySchema.parse(req.query)
    const { data, count } = await listAppActivity(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerCartsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = cartsListQuerySchema.parse(req.query)
    const { data, count, thresholdMinutes } = await listCustomerCarts(query, userContext(req))
    res.json({ ok: true, data, configuration: { abandonmentThresholdMinutes: thresholdMinutes }, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerCartAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getCustomerCartActivity(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
