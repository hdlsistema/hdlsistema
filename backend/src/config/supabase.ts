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
 * Verifica conectividad real con Supabase mediante una consulta al
 * cliente administrativo. Usa la tabla system_health creada en la migración.
 * Cualquier respuesta válida (datos o array vacío) indica que Supabase
 * está activo y responde correctamente.
 */
export async function checkSupabaseReachable(): Promise<boolean> {
  try {
    const { error } = await supabaseAdminClient
      .from('system_health')
      .select('id')
      .limit(1)
    // error de tipo PGRST (PostgREST) = Supabase responde — sigue siendo reachable
    // error de tipo de red = Supabase no responde — not reachable
    if (error && error.code?.startsWith('PGRST')) return true
    return !error
  } catch {
    return false
  }
}
