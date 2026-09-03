import { createHash, createPrivateKey, sign as cryptoSign } from 'crypto'
import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError } from '../operations/operationErrors'
import { decryptServerSecret, encryptServerSecret, sha256 } from '../privacy/privacyCrypto'

type AppleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  token_type?: string
  error?: string
}

type AppleTokenRow = {
  id: string
  user_id: string
  refresh_token_ciphertext?: string | null
  access_token_ciphertext?: string | null
  revocation_status: string
}

function appleConfig() {
  return {
    clientId: env.APPLE_SIGN_IN_CLIENT_ID,
    teamId: env.APPLE_SIGN_IN_TEAM_ID,
    keyId: env.APPLE_SIGN_IN_KEY_ID,
    privateKey: env.APPLE_SIGN_IN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    redirectUri: env.APPLE_SIGN_IN_REDIRECT_URI,
  }
}

function isConfigured() {
  const config = appleConfig()
  return Boolean(config.clientId && config.teamId && config.keyId && config.privateKey)
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url')
}

function createClientSecret() {
  const config = appleConfig()
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: config.keyId }))
  const payload = base64Url(JSON.stringify({
    iss: config.teamId,
    iat: now,
    exp: now + 60 * 60,
    aud: 'https://appleid.apple.com',
    sub: config.clientId,
  }))
  const signingInput = `${header}.${payload}`
  const signature = cryptoSign('sha256', Buffer.from(signingInput), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: 'ieee-p1363',
  })
  return `${signingInput}.${signature.toString('base64url')}`
}

function decodeAppleSubject(identityToken?: string | null) {
  if (!identityToken) return null
  const [, payload] = identityToken.split('.')
  if (!payload) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown }
    return typeof parsed.sub === 'string' && parsed.sub.trim() ? parsed.sub.trim() : null
  } catch {
    return null
  }
}

async function exchangeAuthorizationCode(authorizationCode: string): Promise<AppleTokenResponse> {
  const config = appleConfig()
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: createClientSecret(),
    code: authorizationCode,
    grant_type: 'authorization_code',
  })
  if (config.redirectUri) body.set('redirect_uri', config.redirectUri)

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const parsed = await response.json().catch(() => ({})) as AppleTokenResponse
  if (!response.ok) {
    throw Object.assign(new Error('No fue posible validar el authorizationCode de Apple'), {
      code: parsed.error || `apple_token_${response.status}`,
      statusCode: 502,
      isOperational: true,
    })
  }
  return parsed
}

export async function storeAppleSignInTokens(input: {
  userId: string
  identityToken?: string | null
  authorizationCode?: string | null
}) {
  const authorizationCode = input.authorizationCode?.trim()
  if (!authorizationCode) return { status: 'not_available' as const }
  if (!isConfigured()) {
    await supabaseAdminClient.from('apple_sign_in_tokens').upsert({
      user_id: input.userId,
      provider_user_id: decodeAppleSubject(input.identityToken),
      last_authorization_code_hash: sha256(authorizationCode),
      revocation_status: 'configuration_missing',
      last_error_code: 'apple_configuration_missing',
    })
    return { status: 'configuration_missing' as const }
  }

  const tokenResponse = await exchangeAuthorizationCode(authorizationCode)
  const expiresIn = Number(tokenResponse.expires_in ?? 0)
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  const payload = {
    user_id: input.userId,
    provider_user_id: decodeAppleSubject(tokenResponse.id_token ?? input.identityToken),
    refresh_token_ciphertext: encryptServerSecret(tokenResponse.refresh_token),
    access_token_ciphertext: encryptServerSecret(tokenResponse.access_token),
    last_authorization_code_hash: sha256(authorizationCode),
    token_type: tokenResponse.token_type ?? null,
    expires_at: expiresAt,
    revocation_status: tokenResponse.refresh_token || tokenResponse.access_token ? 'stored' : 'not_available',
    last_error_code: null,
  }

  assertNoError(await supabaseAdminClient.from('apple_sign_in_tokens').upsert(payload))
  return { status: payload.revocation_status as 'stored' | 'not_available' }
}

async function revokeAppleToken(token: string, hint: 'refresh_token' | 'access_token') {
  const config = appleConfig()
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: createClientSecret(),
      token,
      token_type_hint: hint,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: unknown }
    throw Object.assign(new Error('No fue posible revocar el token de Apple'), {
      code: typeof body.error === 'string' ? body.error : `apple_revoke_${response.status}`,
      statusCode: 502,
      isOperational: true,
    })
  }
}

export async function revokeAppleSignInTokensForUser(userId: string) {
  const result = await supabaseAdminClient
    .from('apple_sign_in_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  const row = assertNoError<AppleTokenRow | null>(result).data
  if (!row) return { status: 'not_available' as const }
  if (!isConfigured()) {
    await supabaseAdminClient
      .from('apple_sign_in_tokens')
      .update({ revocation_status: 'configuration_missing', last_error_code: 'apple_configuration_missing' })
      .eq('id', row.id)
    return { status: 'configuration_missing' as const }
  }

  const refreshToken = decryptServerSecret(row.refresh_token_ciphertext)
  const accessToken = decryptServerSecret(row.access_token_ciphertext)
  const token = refreshToken || accessToken
  if (!token) {
    await supabaseAdminClient
      .from('apple_sign_in_tokens')
      .update({ revocation_status: 'not_available', last_error_code: 'apple_token_not_available' })
      .eq('id', row.id)
    return { status: 'not_available' as const }
  }

  try {
    await revokeAppleToken(token, refreshToken ? 'refresh_token' : 'access_token')
    await supabaseAdminClient
      .from('apple_sign_in_tokens')
      .update({ revocation_status: 'revoked', revoked_at: new Date().toISOString(), last_error_code: null })
      .eq('id', row.id)
    return { status: 'revoked' as const }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'apple_revoke_failed'
    await supabaseAdminClient
      .from('apple_sign_in_tokens')
      .update({ revocation_status: 'failed', last_error_code: code })
      .eq('id', row.id)
    return { status: 'failed' as const, errorCode: code }
  }
}

export function appleSignInServerState() {
  const keyFingerprint = env.APPLE_SIGN_IN_PRIVATE_KEY
    ? createHash('sha256').update(env.APPLE_SIGN_IN_PRIVATE_KEY).digest('hex').slice(0, 12)
    : null
  return {
    configured: isConfigured(),
    clientIdConfigured: Boolean(env.APPLE_SIGN_IN_CLIENT_ID),
    teamIdConfigured: Boolean(env.APPLE_SIGN_IN_TEAM_ID),
    keyIdConfigured: Boolean(env.APPLE_SIGN_IN_KEY_ID),
    privateKeyConfigured: Boolean(env.APPLE_SIGN_IN_PRIVATE_KEY),
    privateKeyFingerprint: keyFingerprint,
  }
}
