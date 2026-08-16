import { describe, expect, it } from 'vitest'
import {
  canRetryPayment,
  reconcilePaymentMode,
  routeAfterStripeConfirmation,
  shouldRequestPaymentRetry,
} from '../app/payments/paymentRouting'

describe('payment status reconciliation', () => {
  it('A) failed route + backend paid resolves to success', () => {
    expect(reconcilePaymentMode('failed', {
      orderStatus: 'pending_payment',
      paymentStatus: 'paid',
    })).toBe('success')
  })

  it('B) processing route + backend paid resolves to success', () => {
    expect(reconcilePaymentMode('processing', {
      orderStatus: 'paid',
      paymentStatus: 'pending',
    })).toBe('success')
  })

  it('C) backend failed resolves to failed', () => {
    expect(reconcilePaymentMode('processing', {
      orderStatus: 'pending_payment',
      paymentStatus: 'failed',
    })).toBe('failed')
  })

  it('D) paid disables canRetry and therefore does not render Reintentar', () => {
    expect(canRetryPayment({
      orderStatus: 'pending_payment',
      paymentStatus: 'paid',
      canRetry: true,
    })).toBe(false)
  })

  it('E) a paid order never requests another payment retry', () => {
    expect(shouldRequestPaymentRetry({
      status: 'paid',
      paymentStatus: 'pending',
      paidAt: null,
    })).toBe(false)
    expect(shouldRequestPaymentRetry({
      status: 'pending_payment',
      paymentStatus: 'paid',
      paidAt: null,
    })).toBe(false)
  })

  it('sends a Stripe succeeded result directly to the success route', () => {
    expect(routeAfterStripeConfirmation('succeeded')).toBe('/pago/exitoso')
    expect(routeAfterStripeConfirmation('processing')).toBe('/pago/procesando')
  })
})
