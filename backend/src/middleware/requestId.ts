import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

/**
 * Genera un identificador único por request.
 * Lo adjunta en res.locals.requestId y en el header X-Request-ID.
 * Debe registrarse como primer middleware para que esté disponible
 * en el error handler y en todos los controladores.
 */
export function requestId(_req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID()
  res.locals.requestId = id
  res.setHeader('X-Request-ID', id)
  next()
}
