import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../../config/env'

const toleranceSeconds = 5 * 60

function decodeSecret(secret: string) {
  const value = secret.startsWith('whsec_') ? secret.slice(6) : secret
  return Buffer.from(value, 'base64')
}

function signatures(header: string) {
  return header
    .split(' ')
    .map((part) => part.trim())
    .map((part) => {
      if (part.startsWith('v1,')) return part.slice(3)
      if (part.startsWith('v1=')) return part.slice(3)
      return ''
    })
    .filter(Boolean)
}

export function verifyResendWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    throw Object.assign(new Error('Webhook no configurado'), { statusCode: 503, isOperational: true })
  }

  const id = String(headers['svix-id'] ?? '')
  const timestamp = String(headers['svix-timestamp'] ?? '')
  const signatureHeader = String(headers['svix-signature'] ?? '')
  if (!id || !timestamp || !signatureHeader) {
    throw Object.assign(new Error('Firma requerida'), { statusCode: 400, isOperational: true })
  }

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > toleranceSeconds) {
    throw Object.assign(new Error('Firma expirada'), { statusCode: 400, isOperational: true })
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', decodeSecret(env.RESEND_WEBHOOK_SECRET))
    .update(signedContent)
    .digest('base64')

  const expectedBuffer = Buffer.from(expected)
  const valid = signatures(signatureHeader).some((signature) => {
    const received = Buffer.from(signature)
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer)
  })

  if (!valid) {
    throw Object.assign(new Error('Firma inválida'), { statusCode: 400, isOperational: true })
  }

  return { id, timestamp: timestampNumber }
}
