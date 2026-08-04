import { env } from '../../config/env'

type ProviderMessage = {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
  eventType: string
}

export type ProviderSendResult = {
  id: string
}

export function resendProviderState() {
  return {
    configured: Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
    fromConfigured: Boolean(env.RESEND_FROM_EMAIL),
    webhookConfigured: Boolean(env.RESEND_WEBHOOK_SECRET),
    provider: 'resend',
  }
}

function sanitizeErrorCode(value: unknown) {
  if (!value) return 'provider_error'
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80) || 'provider_error'
}

export async function sendTransactionalEmail(message: ProviderMessage): Promise<ProviderSendResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw Object.assign(new Error('Proveedor no configurado'), {
      code: 'provider_not_configured',
      statusCode: 503,
      isOperational: true,
    })
  }

  const body: Record<string, unknown> = {
    from: `Hacienda de Letras <${env.RESEND_FROM_EMAIL}>`,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    tags: [
      { name: 'system', value: 'hacienda_os' },
      { name: 'event', value: message.eventType.replace(/[^a-zA-Z0-9_-]/g, '_') },
    ],
  }

  if (env.RESEND_REPLY_TO_EMAIL) {
    body.reply_to = env.RESEND_REPLY_TO_EMAIL
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': message.idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }

  if (!response.ok) {
    const providerCode =
      parsed && typeof parsed === 'object' && 'name' in parsed
        ? (parsed as { name?: unknown }).name
        : response.status
    throw Object.assign(new Error('No fue posible enviar el correo'), {
      code: sanitizeErrorCode(providerCode),
      statusCode: response.status,
      isOperational: true,
    })
  }

  const id = parsed && typeof parsed === 'object' && 'id' in parsed
    ? String((parsed as { id?: unknown }).id ?? '')
    : ''

  if (!id) {
    throw Object.assign(new Error('Respuesta inválida del proveedor'), {
      code: 'provider_invalid_response',
      statusCode: 502,
      isOperational: true,
    })
  }

  return { id }
}
