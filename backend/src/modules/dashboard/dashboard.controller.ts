import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { getDashboardSummary } from './dashboard.service'

export async function getDashboardAdmin(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDashboardSummary({
      userId: req.authUser?.id,
      accessToken: req.authToken,
      roles: req.authRoles,
    })
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
