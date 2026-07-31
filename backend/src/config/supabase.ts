import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Cliente Supabase con anon key.
 * Usar para operaciones autenticadas de usuario — respeta RLS.
 */
export const supabaseUserClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

/**
 * Cliente Supabase con service role key.
 *
 * SEGURIDAD CRÍTICA:
 * - NUNCA exponer este cliente ni su key al frontend.
 * - Usar únicamente en operaciones administrativas del servidor.
 * - Bypasa Row Level Security (RLS) — usar con deliberación.
 */
export const supabaseAdminClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)

/**
 * Verifica conectividad real con Supabase mediante una petición HTTP.
 * No depende de tablas específicas — válido antes de correr migraciones.
 * Respuesta < 500 indica que el servicio está en pie.
 */
export async function checkSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: env.SUPABASE_ANON_KEY },
      signal: controller.signal,
    })
    clearTimeout(tid)
    return res.status < 500
  } catch {
    return false
  }
}
