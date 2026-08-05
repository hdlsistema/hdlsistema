import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Stripe embedded checkout UX', () => {
  it('monta Payment Element dentro de /app/checkout y no usa Checkout hospedado', () => {
    const checkout = readFileSync(resolve(__dirname, '../app/pages/mobile/CheckoutScreen.tsx'), 'utf8')
    const router = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')

    expect(checkout).toContain('PaymentElement')
    expect(checkout).toContain('stripe.confirmPayment')
    expect(checkout).toContain("redirect: 'if_required'")
    expect(checkout).not.toContain('checkout.stripe.com')
    expect(checkout).not.toContain('Payment Link')
    expect(router).toContain('path="checkout"')
    expect(router).toContain('path="pago/procesando"')
    expect(router).toContain('path="pago/exitoso"')
    expect(router).toContain('path="pago/fallido"')
  })
})
