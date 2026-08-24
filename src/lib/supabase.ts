import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const AUTH_PERSISTENCE_KEY = 'hdl.auth.persistence'

export type AuthSessionPersistence = 'local' | 'session'

type AuthSessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('La configuración de acceso no está disponible')
}

function getBrowserStorage(kind: AuthSessionPersistence): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function getAuthSessionPersistence(): AuthSessionPersistence {
  try {
    return getBrowserStorage('local')?.getItem(AUTH_PERSISTENCE_KEY) === 'session' ? 'session' : 'local'
  } catch {
    return 'local'
  }
}

export function shouldRememberAuthSession() {
  return getAuthSessionPersistence() === 'local'
}

export function setAuthSessionPersistence(rememberSession: boolean) {
  try {
    getBrowserStorage('local')?.setItem(AUTH_PERSISTENCE_KEY, rememberSession ? 'local' : 'session')
  } catch {
    // Storage can be disabled in private or managed browsers; Supabase will still keep the in-memory session.
  }
}

export const authSessionStorage: AuthSessionStorage = {
  getItem(key) {
    const mode = getAuthSessionPersistence()
    const primary = getBrowserStorage(mode)
    const fallback = mode === 'local' ? getBrowserStorage('session') : null
    return primary?.getItem(key) ?? fallback?.getItem(key) ?? null
  },
  setItem(key, value) {
    const mode = getAuthSessionPersistence()
    const primary = getBrowserStorage(mode)
    const secondary = getBrowserStorage(mode === 'local' ? 'session' : 'local')
    primary?.setItem(key, value)
    secondary?.removeItem(key)
  },
  removeItem(key) {
    getBrowserStorage('local')?.removeItem(key)
    getBrowserStorage('session')?.removeItem(key)
  },
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: authSessionStorage,
  },
})
