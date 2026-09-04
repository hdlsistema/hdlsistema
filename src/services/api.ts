/**
 * Servicio de comunicación con la operación de Hacienda de Letras.
 * Lee VITE_API_BASE_URL del entorno Vite.
 *
 * SEGURIDAD: nunca incluir secretos (service role, OPENAI_API_KEY, etc.) aquí.
 * Solo variables con prefijo VITE_ son expuestas al bundle público.
 */

const RAW_BASE: string = (import.meta.env.VITE_API_BASE_URL as string) ?? ''
const MOBILE_PRODUCTION_API_BASE = 'https://hdlsistema-production.up.railway.app'
const MOBILE_API_FALLBACK: string = import.meta.env.VITE_HDL_APP_TARGET === 'mobile'
  ? MOBILE_PRODUCTION_API_BASE
  : ''

/** URL base del servicio sin slash final. */
const RESOLVED_API_BASE = (RAW_BASE || MOBILE_API_FALLBACK).replace(/\/+$/, '')
export const API_BASE: string = import.meta.env.MODE === 'development' ? '' : RESOLVED_API_BASE

const DEFAULT_TIMEOUT_MS = 10_000

export interface ApiFetchError extends Error {
  status?: number
  body?: unknown
}

function apiErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('error' in body)) return null
  const payload = (body as { error?: unknown }).error
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return null
  const message = (payload as { message?: unknown }).message
  return typeof message === 'string' && message.trim() ? message.trim() : null
}

function isAccountDeletionBlocked(status: number, body: unknown): boolean {
  if (status !== 423 || !body || typeof body !== 'object' || !('error' in body)) return false
  const payload = (body as { error?: unknown }).error
  if (!payload || typeof payload !== 'object') return false
  return (payload as { code?: unknown }).code === 'ACCOUNT_DELETION_IN_PROGRESS'
}

async function clearAccountDeletionSession(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { supabase } = await import('../lib/supabase')
    await supabase.auth.signOut()
  } catch {
    // La navegación también saca al usuario del área autenticada.
  }

  window.dispatchEvent(new CustomEvent('hacienda:account-deletion-blocked'))
  const { pathname, search } = window.location
  const target = pathname.startsWith('/app')
    ? '/app/login?accountDeletion=blocked'
    : pathname.startsWith('/control')
      ? '/login?accountDeletion=blocked'
      : null
  if (target && `${pathname}${search}` !== target) window.location.assign(target)
}

/**
 * Wrapper sobre fetch que:
 * - Construye la URL completa a partir de API_BASE
 * - Aplica timeout configurable
 * - Lanza un error tipado en respuestas HTTP no exitosas
 * - No incluye ningún secreto en las cabeceras
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${API_BASE}${normalizedPath}`

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store', ...fetchOptions, signal: controller.signal })
  } catch (err) {
    clearTimeout(tid)
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutError: ApiFetchError = new Error(
        `Request timeout after ${timeoutMs}ms`,
      )
      timeoutError.status = 408
      throw timeoutError
    }
    throw err
  } finally {
    clearTimeout(tid)
  }

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      // Respuesta sin cuerpo válido: body queda null.
    }
    if (isAccountDeletionBlocked(response.status, body)) {
      await clearAccountDeletionSession()
    }
    const error: ApiFetchError = new Error(
      apiErrorMessage(body) ?? `HTTP ${response.status}: ${response.statusText}`,
    )
    error.status = response.status
    error.body = body
    throw error
  }

  return response.json() as Promise<T>
}

/**
 * Comprueba que la app puede comunicarse con el servicio operativo.
 * Útil para diagnóstico en el panel de control.
 */
export async function checkBackendStatus(): Promise<{
  ok: boolean
  reachable: boolean
  error?: string
}> {
  try {
    const data = await apiFetch<{ ok: boolean; frontendConnection: boolean }>(
      '/api/public/status',
      { timeoutMs: 5000 },
    )
    return { ok: data.ok, reachable: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, reachable: false, error: message }
  }
}
