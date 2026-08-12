import type { Session, User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'
import { requestNativeAppleCredential } from './nativeAppleAuth'

export type UserRole = Database['public']['Enums']['user_role']

export type AuthProfile = Database['public']['Tables']['profiles']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']

export type AuthServiceError = {
  code: string
  message: string
}

export type SignUpCustomerInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  preferredLanguage?: 'es' | 'en'
}

const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).replace(
  /\/+$/,
  '',
)
const NATIVE_AUTH_CALLBACK = 'com.haciendadeletras.app://auth/callback'

export function isNativeAuthCallback(url: string) {
  return url.startsWith(NATIVE_AUTH_CALLBACK)
}

function getOAuthRedirectUrl() {
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_CALLBACK
  return `${APP_URL}/auth/callback`
}

function normalizeError(error: unknown): AuthServiceError {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'apple_cancelled') {
      return { code, message: 'Inicio con Apple cancelado.' }
    }
    if (code.startsWith('apple_')) {
      return { code, message: 'No fue posible completar el acceso con Apple.' }
    }
  }

  const message = error instanceof Error ? error.message : 'No fue posible completar la operación'
  const lower = message.toLowerCase()

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return { code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' }
  }
  if (lower.includes('email not confirmed')) {
    return { code: 'email_not_verified', message: 'Confirma tu correo antes de iniciar sesión.' }
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return { code: 'rate_limited', message: 'Demasiados intentos. Intenta más tarde.' }
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return { code: 'email_exists', message: 'Revisa tu correo para continuar el acceso.' }
  }
  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    return { code: 'provider_not_enabled', message: 'El método de acceso aún no está habilitado.' }
  }

  return { code: 'auth_error', message: 'No fue posible completar la operación.' }
}

function assertNoPrivilegedPayload(input: Record<string, unknown>) {
  for (const key of ['role', 'roles', 'is_admin', 'permissions', 'service_role']) {
    if (key in input) {
      throw new Error('El registro no acepta atributos administrativos.')
    }
  }
}

export async function signUpCustomer(input: SignUpCustomerInput): Promise<{
  user: User | null
  session: Session | null
}> {
  try {
    assertNoPrivilegedPayload(input as unknown as Record<string, unknown>)
    const email = input.email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: `${APP_URL}/app/home`,
        data: {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          display_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          phone: input.phone?.trim() || undefined,
          preferred_language: input.preferredLanguage ?? 'es',
        },
      },
    })

    if (error) throw error
    return { user: data.user, session: data.session }
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
    return data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function signInWithOAuth(provider: 'google' | 'apple') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    })
    if (error) throw error
    if (Capacitor.isNativePlatform() && data.url) {
      await Browser.open({ url: data.url, windowName: '_self' })
    }
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function signInWithAppleNative() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return signInWithOAuth('apple')
  }

  try {
    const credential = await requestNativeAppleCredential()
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: credential.nonce,
    })

    if (error) throw error

    const userData: Record<string, string> = {}
    if (credential.givenName) userData.first_name = credential.givenName
    if (credential.familyName) userData.last_name = credential.familyName
    if (credential.givenName || credential.familyName) {
      userData.display_name = [credential.givenName, credential.familyName].filter(Boolean).join(' ')
    }

    if (Object.keys(userData).length > 0) {
      const { error: updateError } = await supabase.auth.updateUser({ data: userData })
      if (updateError) throw updateError
    }

    return data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function completeNativeOAuthCallback(url: string) {
  const callbackUrl = new URL(url)
  const code = callbackUrl.searchParams.get('code')
  if (!code) throw normalizeError(new Error('No fue posible completar el acceso con Google.'))
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  await Browser.close().catch(() => undefined)
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw normalizeError(error)
}

export async function resetPassword(email: string, redirectPath = '/reset-password') {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${APP_URL}${redirectPath.startsWith('/') ? redirectPath : '/reset-password'}` },
    )
    if (error) throw error
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function updatePassword(password: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function resendVerification(email: string) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${APP_URL}/app/home` },
    })
    if (error) throw error
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw normalizeError(error)
  return data.session
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw normalizeError(error)
  return data.user
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) throw normalizeError(error)
  return data.session
}

export async function getCurrentProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw normalizeError(error)
  return data
}

export async function getCurrentRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', userId)

  if (error) throw normalizeError(error)

  return (data ?? [])
    .map((row) => row.roles?.code)
    .filter((role): role is UserRole => Boolean(role))
}

export async function getCurrentPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw normalizeError(error)
  return data
}

export async function getCurrentCustomer(userId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw normalizeError(error)
  return data
}
