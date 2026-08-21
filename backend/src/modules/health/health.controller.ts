import type { Request, Response } from 'express'
import { env } from '../../config/env'
import { checkSupabaseReachable } from '../../config/supabase'
import { isStripeConfigured, isStripeWebhookConfigured, stripeEnvironment } from '../../config/stripe'
import { apnsProviderState, pushProviderState } from '../notifications/push-provider.service'

/**
 * GET /api/health
 *
 * Verifica el estado del servicio y la conectividad con Supabase.
 * No expone URLs, keys, IPs, versiones sensibles ni configuración interna.
 */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  const firebasePush = pushProviderState()
  const directApns = apnsProviderState()
  const supabase = configured
    ? await checkSupabaseReachable()
    : {
        reachable: false,
        healthy: false,
        status: 'missing_configuration' as const,
      }

  res.status(200).json({
    ok: true,
    service: 'Hacienda de Letras API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    supabase: { configured, ...supabase },
    push: {
      android: {
        ...firebasePush,
        transport: 'fcm_http_v1',
      },
      ios: {
        provider: 'firebase',
        transport: 'fcm_on_apns',
        configured: firebasePush.configured,
        directApnsConfigured: directApns.configured,
      },
      directApns: {
        ...directApns,
        enabled: false,
      },
    },
    payments: {
      stripe: {
        provider: 'stripe',
        configured: isStripeConfigured(),
        webhookConfigured: isStripeWebhookConfigured(),
        environment: stripeEnvironment(),
      },
    },
  })
}
