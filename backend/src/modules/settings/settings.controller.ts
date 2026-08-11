import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import { settingsPatchSchema } from './settings.schemas'
import { listAdminSettings, updateAdminSettings } from './settings.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles ?? [],
  }
}

export async function getAdminSettings(req: Request, res: Response): Promise<void> {
  try {
    const result = await listAdminSettings(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchAdminSettings(req: Request, res: Response): Promise<void> {
  try {
    const payload = settingsPatchSchema.parse(req.body)
    const result = await updateAdminSettings(payload.settings, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
