import type { NextFunction, Request, Response } from 'express'
import { userHasFinancialAccess } from '../modules/admin/controlPermissions'

export function requireFinancialAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.authUser?.id
    if (!userId) {
      res.status(401).json({
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' },
      })
      return
    }

    const allowed = await userHasFinancialAccess({ userId, roles: req.authRoles })
    if (!allowed) {
      res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Acceso financiero restringido' },
      })
      return
    }

    next()
  }
}
