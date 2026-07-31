import type { Request, Response } from 'express'

/**
 * GET /api/public/status
 *
 * Endpoint técnico sin autenticación para que Netlify (u otro cliente)
 * compruebe que puede comunicarse con Railway.
 * No expone configuración interna.
 */
export function getPublicStatus(_req: Request, res: Response): void {
  res.status(200).json({
    ok: true,
    frontendConnection: true,
    timestamp: new Date().toISOString(),
  })
}
