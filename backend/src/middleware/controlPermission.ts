import type { NextFunction, Request, Response } from 'express'
import { resolveControlAccess } from '../modules/admin/controlPermissions'

type PermissionInput = string | string[] | ((req: Request) => string | string[])

function values(input: PermissionInput, req: Request) {
  const resolved = typeof input === 'function' ? input(req) : input
  return Array.isArray(resolved) ? resolved : [resolved]
}

export function requireControlPermission(permission: PermissionInput) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.authUser?.id
    if (!userId) {
      res.status(401).json({
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' },
      })
      return
    }

    const required = values(permission, req)
    const access = await resolveControlAccess({ userId, accessToken: req.authToken, roles: req.authRoles })
    if (!required.some((code) => access.permissions.includes(code))) {
      res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Permisos insuficientes para este módulo' },
      })
      return
    }

    next()
  }
}
