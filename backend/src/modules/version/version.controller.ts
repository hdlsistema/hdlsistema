import type { Request, Response } from 'express'
import { env } from '../../config/env'

/**
 * GET /api/version
 * Devuelve la versión del servicio leída de package.json en tiempo de ejecución.
 * No expone rutas internas ni configuración de infraestructura.
 */
export function getVersion(_req: Request, res: Response): void {
  // npm_package_version es inyectado automáticamente por npm al ejecutar scripts.
  // Si el proceso se inicia directamente con node, cae al fallback '0.0.0'.
  const version = process.env.npm_package_version ?? '0.0.0'

  res.status(200).json({
    service: 'Hacienda de Letras API',
    version,
    environment: env.NODE_ENV,
  })
}
