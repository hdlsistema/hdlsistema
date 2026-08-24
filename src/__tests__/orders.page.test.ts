import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('OrdersPage layout', () => {
  it('presenta órdenes como módulo colapsable compacto', () => {
    const source = readFileSync(resolve(__dirname, '../app/pages/control/OrdersPage.tsx'), 'utf8')

    expect(source).toContain('control-orders-collapsible')
    expect(source).toContain('control-orders-expanded')
    expect(source).toContain('ChevronDown')
    expect(source).toContain("current === order.id ? null : order.id")
    expect(source).toContain('OrderItemImage')
    expect(source).toContain('paymentChipClass')
    expect(source).toContain('control-order-payment-chip')
    expect(source).toContain('text-[11px]')
    expect(source).not.toContain('control-master-detail')
  })
})
