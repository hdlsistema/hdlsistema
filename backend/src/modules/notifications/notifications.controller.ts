import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { notificationListQuerySchema } from './notifications.schemas'
import { listAdminNotifications, markAdminNotificationRead } from './notifications.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getNotificationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = notificationListQuerySchema.parse(req.query)
    const { data, unreadCount, count } = await listAdminNotifications(query, userContext(req))
    res.json({ ok: true, data, unreadCount, pagination: { total: count, limit: query.limit } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function readNotificationAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await markAdminNotificationRead(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
