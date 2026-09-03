import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto'
import { env } from '../../config/env'

const tokenVersion = 'v1'
const cipherVersion = 'v1'

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url')
}

function signingSecret() {
  return env.ACCOUNT_DELETION_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY
}

function encryptionSecret() {
  return env.APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY || env.ACCOUNT_DELETION_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY
}

function encryptionKey() {
  return createHash('sha256').update(encryptionSecret()).digest()
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createSignedAccountDeletionToken(input: {
  requestId: string
  expiresAt: Date
}) {
  const payload = base64Url(JSON.stringify({
    purpose: 'account_deletion_confirm',
    requestId: input.requestId,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    v: tokenVersion,
  }))
  const nonce = randomBytes(18).toString('base64url')
  const signingInput = `${payload}.${nonce}`
  const signature = createHmac('sha256', signingSecret()).update(signingInput).digest('base64url')
  return `${signingInput}.${signature}`
}

export function verifySignedAccountDeletionToken(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [payloadPart, nonce, signature] = parts
  if (!payloadPart || !nonce || !signature) return null

  const expected = createHmac('sha256', signingSecret()).update(`${payloadPart}.${nonce}`).digest('base64url')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  let payload: { purpose?: unknown; requestId?: unknown; exp?: unknown; v?: unknown }
  try {
    payload = JSON.parse(fromBase64Url(payloadPart).toString('utf8'))
  } catch {
    return null
  }

  if (
    payload.purpose !== 'account_deletion_confirm'
    || payload.v !== tokenVersion
    || typeof payload.requestId !== 'string'
    || typeof payload.exp !== 'number'
  ) {
    return null
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  return {
    requestId: payload.requestId,
    expiresAt: new Date(payload.exp * 1000),
  }
}

export function encryptServerSecret(value: string | null | undefined) {
  if (!value) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${cipherVersion}.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptServerSecret(value: string | null | undefined) {
  if (!value) return null
  const [version, ivValue, tagValue, ciphertextValue] = value.split('.')
  if (version !== cipherVersion || !ivValue || !tagValue || !ciphertextValue) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch {
    return null
  }
}
