import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PaymentsPage cash flow', () => {
  it('presenta pagos como flujo financiero con transacciones clicables y detalle real', () => {
    const source = readFileSync(resolve(__dirname, '../app/pages/control/PaymentsPage.tsx'), 'utf8')
    const service = readFileSync(resolve(__dirname, '../services/commerce.service.ts'), 'utf8')

    expect(source).toContain('Cash flow')
    expect(source).toContain('Transacciones recientes')
    expect(source).toContain('PaymentDetailDialog')
    expect(source).toContain('Qué compró')
    expect(source).toContain('Stripe intent')
    expect(source).toContain('Origen de compra')
    expect(source).toContain('payment.items')
    expect(source).toContain('paymentSource')
    expect(source).toContain('control-payment-row')
    expect(service).toContain('orderSource?: string | null')
    expect(service).toContain('providerPaymentId?: string | null')
    expect(service).toContain('items?: Array')
    expect(source).not.toContain('mock')
  })
})
