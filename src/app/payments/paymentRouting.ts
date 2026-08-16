export type PaymentStatusMode = 'processing' | 'success' | 'failed'

type PaymentStatusSnapshot = {
  orderStatus: string
  paymentStatus: string
}

export function isPaymentConfirmed(status: PaymentStatusSnapshot | null) {
  return status?.orderStatus === 'paid' || status?.paymentStatus === 'paid'
}

export function reconcilePaymentMode(
  _routeMode: PaymentStatusMode,
  status: PaymentStatusSnapshot | null,
): PaymentStatusMode {
  if (!status) return 'processing'
  if (isPaymentConfirmed(status)) return 'success'
  if (['failed', 'cancelled'].includes(status.orderStatus) || ['failed', 'cancelled'].includes(status.paymentStatus)) {
    return 'failed'
  }
  return 'processing'
}

export function canRetryPayment(status: (PaymentStatusSnapshot & { canRetry: boolean }) | null) {
  return Boolean(status?.canRetry && !isPaymentConfirmed(status))
}

export function routeAfterStripeConfirmation(paymentIntentStatus: string) {
  return paymentIntentStatus === 'succeeded' ? '/pago/exitoso' : '/pago/procesando'
}

export function shouldRequestPaymentRetry(order: {
  status: string
  paymentStatus: string
  paidAt?: string | null
}) {
  return order.status !== 'paid' && order.paymentStatus !== 'paid' && !order.paidAt
}
