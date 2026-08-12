import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim()

const stripeLoadOptions = {
  developerTools: {
    assistant: {
      enabled: false,
    },
  },
}

export const stripePromise = publishableKey
  ? loadStripe(publishableKey, stripeLoadOptions as unknown as Parameters<typeof loadStripe>[1])
  : null

export function isStripePublishableKeyConfigured() {
  return Boolean(publishableKey)
}
