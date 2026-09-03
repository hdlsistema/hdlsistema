import type { NextFunction, Request, Response } from 'express'
import type { User } from '@supabase/supabase-js'
import { supabaseUserClient } from '../config/supabase'
import { assertAccountDeletionAccessAllowed } from '../modules/privacy/accountDeletionAccess.service'

declare global {
  namespace Express {
    interface Request {
      authUser?: User
      authToken?: string
      authRoles?: string[]
    }
  }
}

async function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  options: { enforceAccountDeletionBlock: boolean },
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

  if (options.enforceAccountDeletionBlock) {
    try {
      await assertAccountDeletionAccessAllowed({
        userId: data.user.id,
        email: data.user.email,
      })
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : 423
      res.status(statusCode).json({
        ok: false,
        error: {
          code: 'ACCOUNT_DELETION_IN_PROGRESS',
          message: error instanceof Error
            ? error.message
            : 'La eliminación de esta cuenta está en proceso.',
        },
      })
      return
    }
  }

  req.authUser = data.user
  req.authToken = token
  next()
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return authenticateRequest(req, res, next, { enforceAccountDeletionBlock: true })
}

export async function authenticateSessionOnly(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return authenticateRequest(req, res, next, { enforceAccountDeletionBlock: false })
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
