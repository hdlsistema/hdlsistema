import Stripe from 'stripe'
import { env } from './env'

let stripeClient: Stripe | null = null

export type StripeEnvironment = 'test' | 'live'

export function stripeEnvironment(): StripeEnvironment {
  return env.STRIPE_ENVIRONMENT === 'live' ? 'live' : 'test'
}

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY)
}

export function isStripeWebhookConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) return null
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      appInfo: {
        name: 'Hacienda de Letras OS',
        version: '1.0.0',
      },
    })
  }
  return stripeClient
}
