import type { NextFunction, Request, Response } from 'express'
import type { User } from '@supabase/supabase-js'
import { supabaseUserClient } from '../config/supabase'

declare global {
  namespace Express {
    interface Request {
      authUser?: User
      authToken?: string
      authRoles?: string[]
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('Authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Token requerido' },
    })
    return
  }

  const { data, error } = await supabaseUserClient.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesión inválida o expirada' },
    })
    return
  }

  req.authUser = data.user
  req.authToken = token
  next()
}

/**
 * Telemetría de la App puede ser anónima antes del registro. Si llega un Bearer
 * válido, se adjunta la identidad; un token inválido no convierte un evento en
 * otra identidad ni bloquea la experiencia de navegación.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('Authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    next()
    return
  }

  const { data, error } = await supabaseUserClient.auth.getUser(token)
  if (!error && data.user) {
    req.authUser = data.user
    req.authToken = token
  }
  next()
}
