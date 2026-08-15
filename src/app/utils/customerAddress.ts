import type { CustomerAddress, CustomerAddressPayload } from '../../services/customer.service'

export const REQUIRED_CUSTOMER_ADDRESS_FIELDS = [
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
] as const

export type RequiredCustomerAddressField = typeof REQUIRED_CUSTOMER_ADDRESS_FIELDS[number]

export function emptyCustomerAddress(): CustomerAddressPayload {
  return {
    label: '',
    recipientName: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'MX',
    references: '',
    isDefault: false,
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeCustomerAddress(address: CustomerAddressPayload | CustomerAddress): CustomerAddressPayload {
  return {
    label: text(address.label),
    recipientName: text(address.recipientName),
    phone: text(address.phone),
    email: text(address.email).toLowerCase(),
    line1: text(address.line1),
    line2: text(address.line2),
    neighborhood: text(address.neighborhood),
    city: text(address.city),
    state: text(address.state),
    postalCode: text(address.postalCode),
    country: text(address.country).toUpperCase() || 'MX',
    references: text(address.references),
    isDefault: Boolean(address.isDefault),
  }
}

export function invalidCustomerAddressFields(address: CustomerAddressPayload | CustomerAddress): RequiredCustomerAddressField[] {
  const value = normalizeCustomerAddress(address)
  const invalid = REQUIRED_CUSTOMER_ADDRESS_FIELDS.filter((field) => !value[field])

  if (value.recipientName.length < 2 && !invalid.includes('recipientName')) invalid.push('recipientName')
  if (value.phone.length < 7 && !invalid.includes('phone')) invalid.push('phone')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) && !invalid.includes('email')) invalid.push('email')
  if (value.line1.length < 4 && !invalid.includes('line1')) invalid.push('line1')
  if (value.city.length < 2 && !invalid.includes('city')) invalid.push('city')
  if (value.state.length < 2 && !invalid.includes('state')) invalid.push('state')
  if (value.postalCode.length < 4 && !invalid.includes('postalCode')) invalid.push('postalCode')
  if (value.country.length < 2 && !invalid.includes('country')) invalid.push('country')

  return invalid
}

export function isCustomerAddressComplete(address: CustomerAddressPayload | CustomerAddress) {
  return invalidCustomerAddressFields(address).length === 0
}
