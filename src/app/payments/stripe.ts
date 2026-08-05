import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim()

export const stripePromise = publishableKey ? loadStripe(publishableKey) : null

export function isStripePublishableKeyConfigured() {
  return Boolean(publishableKey)
}
