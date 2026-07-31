import type { Request, Response } from 'express'
import { env } from '../../config/env'
import { checkSupabaseReachable } from '../../config/supabase'

/**
 * GET /api/health
 *
 * Verifica el estado del servicio y la conectividad con Supabase.
 * No expone URLs, keys, IPs, versiones sensibles ni configuración interna.
 */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
  const reachable = configured ? await checkSupabaseReachable() : false

  res.status(200).json({
    ok: true,
    service: 'Hacienda de Letras API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    supabase: { configured, reachable },
  })
}
