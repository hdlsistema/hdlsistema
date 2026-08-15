import { describe, expect, it } from 'vitest'
import {
  emptyCustomerAddress,
  invalidCustomerAddressFields,
  isCustomerAddressComplete,
  normalizeCustomerAddress,
} from '../app/utils/customerAddress'

const completeAddress = {
  label: 'Casa',
  recipientName: 'Patricia García',
  phone: '4491234567',
  email: 'patricia@example.com',
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

describe('domicilio obligatorio para compras físicas', () => {
  it('considera obligatorios todos los campos visibles del domicilio', () => {
    const invalid = invalidCustomerAddressFields(emptyCustomerAddress())

    expect(invalid).toEqual(expect.arrayContaining([
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
      'references',
    ]))
  })

  it('sólo habilita el avance con un domicilio completo y válido', () => {
    expect(isCustomerAddressComplete(completeAddress)).toBe(true)
    expect(isCustomerAddressComplete({ ...completeAddress, references: '' })).toBe(false)
    expect(isCustomerAddressComplete({ ...completeAddress, email: 'correo-invalido' })).toBe(false)
  })

  it('normaliza a strings y nunca convierte campos vacíos en null', () => {
    const normalized = normalizeCustomerAddress({ ...completeAddress, email: ' PATRICIA@EXAMPLE.COM ' })

    expect(normalized.email).toBe('patricia@example.com')
    expect(Object.values(normalized)).not.toContain(null)
  })
})
