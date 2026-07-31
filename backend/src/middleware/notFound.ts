import type { Request, Response } from 'express'

/**
 * Responde 404 JSON uniforme para rutas no encontradas.
 * Debe registrarse como último middleware antes de errorHandler.
 */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Ruta no encontrada',
      requestId: (res.locals.requestId as string | undefined) ?? null,
    },
  })
}
