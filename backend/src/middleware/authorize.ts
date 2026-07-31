import type { NextFunction, Request, Response } from 'express'
import { supabaseAdminClient } from '../config/supabase'

function extractRoleCode(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { code?: unknown } | undefined
    return typeof first?.code === 'string' ? first.code : null
  }
  if (value && typeof value === 'object') {
    const code = (value as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

export function authorize(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.authUser?.id
    if (!userId) {
      res.status(401).json({
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' },
      })
      return
    }

    const { data, error } = await supabaseAdminClient
      .from('user_roles')
      .select('roles(code)')
      .eq('user_id', userId)

    if (error) {
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'No fue posible validar permisos' },
      })
      return
    }

    const roles = (data ?? [])
      .map((row) => extractRoleCode(row.roles))
      .filter((role): role is string => Boolean(role))

    req.authRoles = roles

    if (!roles.some((role) => allowedRoles.includes(role))) {
      res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' },
      })
      return
    }

    next()
  }
}
