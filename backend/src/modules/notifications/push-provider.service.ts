import { createSign } from 'crypto'
import { env } from '../../config/env'

type PushMessage = {
  token: string
  title: string
  body: string
  data?: Record<string, string | number | boolean | null | undefined>
}

type CachedAccessToken = {
  value: string
  expiresAt: number
}

let cachedAccessToken: CachedAccessToken | null = null

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function privateKey() {
  return env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim()
}

export function pushProviderState() {
  return {
    provider: 'firebase',
    configured: Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && privateKey()),
  }
}

function providerError(code: string, statusCode = 502) {
  return Object.assign(new Error('No fue posible entregar la notificación push'), {
    code: code.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100),
    statusCode,
    isOperational: true,
  })
}

function errorCodeFromBody(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback
  const error = 'error' in body && body.error && typeof body.error === 'object'
    ? body.error as Record<string, unknown>
    : body as Record<string, unknown>
  const details = Array.isArray(error.details) ? error.details : []
  const fcmError = details.find((item) => item && typeof item === 'object' && 'errorCode' in item) as { errorCode?: unknown } | undefined
  return String(fcmError?.errorCode ?? error.status ?? fallback)
}

async function firebaseAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value
  if (!pushProviderState().configured) throw providerError('provider_not_configured', 503)

  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const assertion = `${unsigned}.${signer.sign(privateKey()).toString('base64url')}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const text = await response.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = null }
  const token = body && typeof body === 'object' && 'access_token' in body
    ? String((body as { access_token?: unknown }).access_token ?? '')
    : ''
  if (!response.ok || !token) throw providerError(errorCodeFromBody(body, 'oauth_failed'), response.status || 502)

  const expiresIn = body && typeof body === 'object' && 'expires_in' in body
    ? Number((body as { expires_in?: unknown }).expires_in ?? 3600)
    : 3600
  cachedAccessToken = { value: token, expiresAt: Date.now() + Math.max(300, expiresIn) * 1000 }
  return token
}

function pushData(data: PushMessage['data']) {
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value).slice(0, 1000)]),
  )
}

export async function sendPushNotification(message: PushMessage) {
  const accessToken = await firebaseAccessToken()
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: { title: message.title, body: message.body },
          data: pushData(message.data),
          android: {
            priority: 'high',
            notification: { channel_id: 'orders', sound: 'default' },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default', 'content-available': 1 } },
          },
        },
      }),
    },
  )
  const text = await response.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = null }
  if (!response.ok) throw providerError(errorCodeFromBody(body, `fcm_${response.status}`), response.status)
  return {
    id: body && typeof body === 'object' && 'name' in body ? String((body as { name?: unknown }).name ?? '') : '',
  }
}

export function resetPushProviderCacheForTests() {
  cachedAccessToken = null
}
