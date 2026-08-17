import { createSign, sign } from 'crypto'
import { connect } from 'http2'
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
let cachedAppleToken: CachedAccessToken | null = null

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

function applePrivateKey() {
  return env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n').trim()
}

export function apnsProviderState() {
  return {
    provider: 'apns',
    configured: Boolean(env.APNS_TEAM_ID && env.APNS_KEY_ID && applePrivateKey() && env.APNS_BUNDLE_ID),
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

function appleAccessToken() {
  if (cachedAppleToken && cachedAppleToken.expiresAt > Date.now() + 60_000) return cachedAppleToken.value
  if (!apnsProviderState().configured) throw providerError('apns_provider_not_configured', 503)
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: env.APNS_KEY_ID }))
  const claims = base64Url(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: now }))
  const unsigned = `${header}.${claims}`
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: applePrivateKey(),
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url')
  const value = `${unsigned}.${signature}`
  cachedAppleToken = { value, expiresAt: Date.now() + 50 * 60_000 }
  return value
}

export async function sendApplePushNotification(message: PushMessage) {
  const authorization = appleAccessToken()
  const origin = env.APNS_ENVIRONMENT === 'sandbox'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com'

  return new Promise<{ id: string }>((resolve, reject) => {
    const client = connect(origin)
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      client.close()
      callback()
    }
    client.once('error', () => finish(() => reject(providerError('apns_connection_failed'))))

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${encodeURIComponent(message.token)}`,
      authorization: `bearer ${authorization}`,
      'apns-topic': env.APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    })
    let status = 0
    let responseBody = ''
    let responseId = ''
    request.setEncoding('utf8')
    request.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0)
      responseId = String(headers['apns-id'] ?? '')
    })
    request.on('data', (chunk) => { responseBody += chunk.slice(0, 2000) })
    request.once('error', () => finish(() => reject(providerError('apns_request_failed'))))
    request.on('end', () => {
      if (status === 200) {
        finish(() => resolve({ id: responseId }))
        return
      }
      let reason = `apns_${status || 'failed'}`
      try {
        const parsed = responseBody ? JSON.parse(responseBody) as { reason?: unknown } : null
        if (parsed?.reason) reason = String(parsed.reason)
      } catch {
        // APNs puede cerrar sin cuerpo; conservamos un código seguro y breve.
      }
      finish(() => reject(providerError(reason, status || 502)))
    })
    request.end(JSON.stringify({
      aps: {
        alert: { title: message.title, body: message.body },
        sound: 'default',
      },
      ...pushData(message.data),
    }))
  })
}

export function resetPushProviderCacheForTests() {
  cachedAccessToken = null
  cachedAppleToken = null
}
