import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export type SupabaseHealthStatus =
  | 'ok'
  | 'missing_configuration'
  | 'authentication_failed'
  | 'table_missing'
  | 'permission_denied'
  | 'timeout'
  | 'network_error'
  | 'database_error'

export type SupabaseHealthResult = {
  reachable: boolean
  healthy: boolean
  status: SupabaseHealthStatus
}

/**
 * Cliente Supabase con anon key.
 * Usar para operaciones autenticadas de usuario — respeta RLS.
 */
export const supabaseUserClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

export function createSupabaseUserRequestClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

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
export async function checkSupabaseReachable(): Promise<SupabaseHealthResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      reachable: false,
      healthy: false,
      status: 'missing_configuration',
    }
  }

  try {
    const query = supabaseAdminClient
      .from('system_health')
      .select('id')
      .limit(1)

    const { error } = await query.abortSignal(AbortSignal.timeout(5000))

    if (!error) {
      return {
        reachable: true,
        healthy: true,
        status: 'ok',
      }
    }

    return classifySupabaseError(error)
  } catch (error) {
    return classifySupabaseError(error)
  }
}

function classifySupabaseError(error: unknown): SupabaseHealthResult {
  const code = readString(error, 'code')
  const status = readNumber(error, 'status') ?? readNumber(error, 'statusCode')
  const name = readString(error, 'name').toLowerCase()
  const message = readString(error, 'message').toLowerCase()

  if (isTimeoutError(name, message, code)) {
    return {
      reachable: false,
      healthy: false,
      status: 'timeout',
    }
  }

  if (isNetworkError(name, message, code)) {
    return {
      reachable: false,
      healthy: false,
      status: 'network_error',
    }
  }

  if (status === 401 || isAuthenticationError(message, code)) {
    return {
      reachable: true,
      healthy: false,
      status: 'authentication_failed',
    }
  }

  if (code === '42P01') {
    return {
      reachable: true,
      healthy: false,
      status: 'table_missing',
    }
  }

  if (code === '42501') {
    return {
      reachable: true,
      healthy: false,
      status: 'permission_denied',
    }
  }

  return {
    reachable: true,
    healthy: false,
    status: 'database_error',
  }
}

function readString(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return ''
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' ? field : ''
}

function readNumber(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'number' ? field : undefined
}

function isAuthenticationError(message: string, code: string): boolean {
  return (
    code === '401' ||
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('auth')
  )
}

function isTimeoutError(name: string, message: string, code: string): boolean {
  return (
    name.includes('timeout') ||
    code === 'ETIMEDOUT' ||
    message.includes('timeout') ||
    message.includes('timed out')
  )
}

function isNetworkError(name: string, message: string, code: string): boolean {
  return (
    name === 'typeerror' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('dns') ||
    message.includes('getaddrinfo')
  )
}
