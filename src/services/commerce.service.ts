import { API_BASE, apiFetch } from './api'

function assertToken(token: string | null | undefined): string {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return token
}

function adminHeaders(token: string | null | undefined): HeadersInit {
  return {
    Authorization: `Bearer ${assertToken(token)}`,
    'Content-Type': 'application/json',
  }
}

function queryString(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const value = params.toString()
  return value ? `?${value}` : ''
}

export type OrderRecord = {
  id: string
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  reservationNumber?: string | null
  subtotal: number | null
  discountTotal: number | null
  taxTotal: number | null
  shippingTotal: number | null
  total: number | null
  paidAmount: number | null
  financialRestricted?: boolean
  currency: string
  status: string
  source: string
  paidAt?: string | null
  cancelledAt?: string | null
  fulfilledAt?: string | null
  requiresShipping?: boolean
  shippingStatus?: string | null
  shippingAddress?: {
    recipientName: string
    phone?: string | null
    email?: string | null
    line1: string
    line2?: string | null
    neighborhood?: string | null
    city: string
    state: string
    postalCode: string
    country: string
    references?: string | null
  } | null
  shipment?: {
    id: string
    carrier?: string | null
    trackingNumber?: string | null
    trackingUrl?: string | null
    status?: string | null
    shippingCost?: number | null
    shippedAt?: string | null
    deliveredAt?: string | null
  } | null
  createdAt: string
  updatedAt: string
}

export type OrderItemRecord = {
  id: string
  itemId?: string | null
  itemType: string
  nameSnapshot: string
  skuSnapshot?: string | null
  imageUrl?: string | null
  quantity: number
  unitPrice: number | null
  subtotal: number | null
  financialRestricted?: boolean
}

export type PaymentRecord = {
  id: string
  orderId: string
  orderNumber?: string | null
  customerName?: string | null
  provider: string
  providerEnvironment: string
  status: string
  amount: number
  refundedAmount: number
  currency: string
  method?: string | null
  paymentReference?: string | null
  hasReceipt: boolean
  paidAt?: string | null
  refundedAt?: string | null
  refundReason?: string | null
  notes?: string | null
  createdAt: string
}

export type AccessPassRecord = {
  id: string
  reservationId?: string | null
  orderId?: string | null
  eventTicketTypeId?: string | null
  accessType?: string | null
  passNumber?: string | null
  reservationNumber?: string | null
  orderNumber?: string | null
  guestName?: string | null
  eventOrExperience?: string | null
  peopleCount?: number | null
  status: string
  validFrom?: string | null
  validUntil?: string | null
  usedAt?: string | null
  issuedAt: string
  revokedAt?: string | null
  revocationReason?: string | null
  qrToken?: string
  qrPayload?: string
}

export type CheckinRecord = {
  id: string
  accessPassId: string
  passNumber?: string | null
  reservationNumber?: string | null
  eventOrExperience?: string | null
  checkedInAt: string
  reversedAt?: string | null
  reversalReason?: string | null
  notes?: string | null
  status: 'active' | 'reversed'
}

export type AccessPassValidation = {
  valid: boolean
  reason?: string | null
  accessPassId: string
  passNumber?: string | null
  reservationNumber?: string | null
  orderNumber?: string | null
  accessType?: string | null
  guestName?: string | null
  peopleCount?: number | null
  status?: string | null
  reservationStatus?: string | null
  experienceTitle?: string | null
  ticketTypeName?: string | null
  usedAt?: string | null
}

export const ordersClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: OrderRecord[]; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/orders${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  get(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: OrderRecord }>('/api/admin/orders', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  update(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  cancel(token: string | null | undefined, id: string, reason?: string) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  markProcessing(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/mark-processing`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  fulfill(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/fulfill`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  prepareShipping(token: string | null | undefined, id: string, payload: Record<string, unknown> = {}) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/shipping/prepare`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  assignTracking(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/shipping/tracking`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  ship(token: string | null | undefined, id: string, payload: Record<string, unknown> = {}) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/shipping/ship`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  deliver(token: string | null | undefined, id: string, payload: Record<string, unknown> = {}) {
    return apiFetch<{ ok: true; data: OrderRecord }>(`/api/admin/orders/${encodeURIComponent(id)}/shipping/deliver`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  items(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: OrderItemRecord[] }>(`/api/admin/orders/${encodeURIComponent(id)}/items`, {
      headers: adminHeaders(token),
    })
  },
  payments(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: PaymentRecord[] }>(`/api/admin/orders/${encodeURIComponent(id)}/payments`, {
      headers: adminHeaders(token),
    })
  },
  history(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: Array<{ id: string; action: string; entityType: string; createdAt: string }> }>(
      `/api/admin/orders/${encodeURIComponent(id)}/history`,
      { headers: adminHeaders(token) },
    )
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/orders/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}

export const paymentsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: PaymentRecord[]; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/payments${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  manual(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: PaymentRecord }>('/api/admin/payments/manual', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  refund(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: PaymentRecord }>(`/api/admin/payments/${encodeURIComponent(id)}/refund`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  receipt(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: { url: string; expiresIn: number } }>(
      `/api/admin/payments/${encodeURIComponent(id)}/receipt`,
      { headers: adminHeaders(token) },
    )
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/payments/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}

export const accessPassClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AccessPassRecord[]; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/access-passes${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  issue(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AccessPassRecord }>('/api/admin/access-passes', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  revoke(token: string | null | undefined, id: string, reason?: string) {
    return apiFetch<{ ok: true; data: AccessPassRecord }>(`/api/admin/access-passes/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  validate(token: string | null | undefined, code: string) {
    return apiFetch<{ ok: true; data: AccessPassValidation }>('/api/admin/access-passes/validate', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ code }),
    })
  },
}

export const checkinsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CheckinRecord[]; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/checkins${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  register(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CheckinRecord }>('/api/admin/checkins', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  reverse(token: string | null | undefined, id: string, reason: string) {
    return apiFetch<{ ok: true; data: CheckinRecord }>(`/api/admin/checkins/${encodeURIComponent(id)}/reverse`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/checkins/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}
