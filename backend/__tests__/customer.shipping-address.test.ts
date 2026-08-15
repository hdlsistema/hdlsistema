import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCustomerOrderSchema, customerAddressSchema } from '../src/modules/customer/customer.schemas'

const completeAddress = {
  label: 'Casa',
  recipientName: 'Cliente Hacienda',
  phone: '4491234567',
  email: 'cliente@example.com',
  line1: 'Calle Hacienda 123',
  line2: 'N/A',
  neighborhood: 'Centro',
  city: 'Aguascalientes',
  state: 'Aguascalientes',
  postalCode: '20000',
  country: 'MX',
  references: 'Portón color vino',
  isDefault: true,
}

describe('contrato obligatorio de domicilio de entrega', () => {
  it('acepta un domicilio completo', () => {
    expect(customerAddressSchema.parse(completeAddress)).toEqual(completeAddress)
  })

  it.each([
    'label',
    'recipientName',
    'phone',
    'email',
    'line1',
    'line2',
    'neighborhood',
    'city',
    'state',
    'postalCode',
    'country',
    'references',
  ] as const)('rechaza la compra cuando falta %s', (field) => {
    const address = { ...completeAddress }
    delete (address as Partial<typeof completeAddress>)[field]

    expect(createCustomerOrderSchema.safeParse({
      idempotencyKey: 'checkout-address-test',
      shippingAddress: address,
      saveAddress: true,
    }).success).toBe(false)
  })

  it('incluye RPC atómica y trigger diferido en la migración', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/049_required_shipping_address_checkout.sql'), 'utf8')

    expect(migration).toContain('create_customer_shipping_order_from_cart')
    expect(migration).toContain('create constraint trigger orders_require_complete_shipping_address')
    expect(migration).toContain('deferrable initially deferred')
  })
})
