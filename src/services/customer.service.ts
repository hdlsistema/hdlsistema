import { apiFetch } from './api'

export type CustomerMe = {
  profile: {
    id: string
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
    phone?: string | null
    avatarUrl?: string | null
    preferredLanguage?: 'es' | 'en' | string | null
    birthDate?: string | null
  }
  customer: {
    id: string
    customerNumber: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    status: string
    createdAt: string
  }
  preferences: {
    language: 'es' | 'en' | string
    timezone: string
    marketingEmail: boolean
    marketingPush: boolean
    transactionalPush: boolean
  }
}

export type CustomerAvailabilitySlot = {
  id: string
  experience_id?: string
  experienceId?: string
  experience_title?: string
  experienceTitle?: string
  experience_slug?: string
  experienceSlug?: string
  location?: string | null
  duration_minutes?: number | null
  durationMinutes?: number | null
  cover_image_url?: string | null
  coverImageUrl?: string | null
  start_at?: string
  startAt?: string
  end_at?: string
  endAt?: string
  available: number
  price: number
  is_bookable?: boolean
  isBookable?: boolean
}

export type CustomerReservation = {
  id: string
  reservationNumber: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  peopleCount: number
  subtotal: number
  total: number
  currency: string
  customerNotes?: string | null
  experienceId?: string | null
  experienceTitle: string
  experienceSlug?: string | null
  coverImageUrl?: string | null
  location?: string | null
  slotId?: string | null
  startAt?: string | null
  endAt?: string | null
  available: number
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  rescheduledAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerMembership = {
  id: string
  membershipNumber: string
  status: string
  startsAt: string
  renewalDate?: string | null
  expiresAt?: string | null
  autoRenew: boolean
  pointsBalance: number
  plan?: {
    id: string
    code?: string | null
    name?: string | null
    billingPeriod?: string | null
    price?: number | string | null
  } | null
} | null

export type CustomerMembershipBenefit = {
  id: string
  membershipId: string
  benefitCode: string
  description?: string | null
  usageLimit?: number | null
  usedCount: number
  validFrom?: string | null
  validUntil?: string | null
}

export type CustomerLoyaltySummary = {
  pointsBalance: number
  transactions: Array<{
    id: string
    transactionType: string
    points: number
    description?: string | null
    createdAt: string
  }>
}

export type CustomerCartItem = {
  id: string
  cartId: string
  itemType: 'wine' | 'event_ticket' | 'experience' | string
  itemId: string
  name: string
  sku?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  currency: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CustomerCart = {
  id: string
  status: 'active' | 'converted' | 'abandoned' | string
  currency: string
  expiresAt?: string | null
  items: CustomerCartItem[]
  totals: {
    subtotal: number
    discountTotal: number
    taxTotal: number
    shippingTotal: number
    total: number
    currency: string
    discountCode?: string | null
    discountApplied?: boolean
    shippingMode?: string
    paymentStatus?: string
  }
  checkout: {
    canCheckout: boolean
    paymentAvailable: boolean
    paymentMessage: string
    fulfillmentMode: string
  }
  createdAt: string
  updatedAt: string
}

export type CustomerOrder = {
  id: string
  orderNumber: string
  status: 'draft' | 'pending_payment' | 'paid' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded' | string
  subtotal: number
  discountTotal: number
  taxTotal: number
  shippingTotal: number
  total: number
  currency: string
  paymentStatus: string
  paymentAvailable: boolean
  source: string
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    itemType: string
    itemId: string
    name: string
    sku?: string | null
    quantity: number
    unitPrice: number
    subtotal: number
    metadata?: Record<string, unknown>
    createdAt: string
  }>
  checkout?: {
    message?: string
    fulfillmentMode?: string
    shippingPolicy?: string
  }
}

export type CustomerPaymentSession = {
  orderId: string
  orderNumber: string
  provider: 'stripe'
  environment: 'test' | 'live'
  clientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
  status: string
}

export type CustomerPaymentStatus = {
  orderId: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  provider: string | null
  amount: number
  currency: string
  canRetry: boolean
  paidAt: string | null
  failedAt: string | null
}

function assertToken(token: string | null | undefined): string {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return token
}

function customerHeaders(token: string | null | undefined): HeadersInit {
  return {
    Authorization: `Bearer ${assertToken(token)}`,
    'Content-Type': 'application/json',
  }
}

function queryString(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

export const customerClient = {
  me(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerMe }>('/api/customer/me', {
      headers: customerHeaders(token),
    })
  },
  updateMe(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerMe }>('/api/customer/me', {
      method: 'PATCH',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  availability(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerAvailabilitySlot[] }>(
      `/api/customer/availability${queryString(query)}`,
      { headers: customerHeaders(token) },
    )
  },
  reservations(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{
      ok: true
      data: CustomerReservation[]
      pagination: { page: number; perPage: number; total: number }
    }>(`/api/customer/reservations${queryString(query)}`, {
      headers: customerHeaders(token),
    })
  },
  reservation(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerReservation }>(`/api/customer/reservations/${encodeURIComponent(id)}`, {
      headers: customerHeaders(token),
    })
  },
  createReservation(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerReservation }>('/api/customer/reservations', {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  cancelReservation(token: string | null | undefined, id: string, reason?: string | null) {
    return apiFetch<{ ok: true; data: CustomerReservation }>(`/api/customer/reservations/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify({ reason: reason ?? null }),
    })
  },
  rescheduleReservation(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerReservation }>(`/api/customer/reservations/${encodeURIComponent(id)}/reschedule`, {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  membership(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerMembership }>('/api/customer/membership', {
      headers: customerHeaders(token),
    })
  },
  membershipBenefits(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerMembershipBenefit[] }>('/api/customer/membership/benefits', {
      headers: customerHeaders(token),
    })
  },
  membershipLoyalty(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerLoyaltySummary }>('/api/customer/membership/loyalty', {
      headers: customerHeaders(token),
    })
  },
  membershipHistory(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: Array<{ id: string; action: string; entityType: string; createdAt: string }> }>('/api/customer/membership/history', {
      headers: customerHeaders(token),
    })
  },
  cart(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerCart }>('/api/customer/cart', {
      headers: customerHeaders(token),
    })
  },
  addCartItem(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerCart }>('/api/customer/cart/items', {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  updateCartItem(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerCart }>(`/api/customer/cart/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  removeCartItem(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerCart }>(`/api/customer/cart/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: customerHeaders(token),
    })
  },
  clearCart(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerCart }>('/api/customer/cart', {
      method: 'DELETE',
      headers: customerHeaders(token),
    })
  },
  createOrder(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: CustomerOrder }>('/api/customer/orders', {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  orders(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerOrder[] }>('/api/customer/orders', {
      headers: customerHeaders(token),
    })
  },
  order(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerOrder }>(`/api/customer/orders/${encodeURIComponent(id)}`, {
      headers: customerHeaders(token),
    })
  },
  paymentSession(token: string | null | undefined, orderId: string, payload: { idempotencyKey?: string } = {}) {
    return apiFetch<{ ok: true; data: CustomerPaymentSession }>(`/api/customer/orders/${encodeURIComponent(orderId)}/payment-session`, {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  paymentStatus(token: string | null | undefined, orderId: string) {
    return apiFetch<{ ok: true; data: CustomerPaymentStatus }>(`/api/customer/orders/${encodeURIComponent(orderId)}/payment-status`, {
      headers: customerHeaders(token),
    })
  },
  retryPayment(token: string | null | undefined, orderId: string, payload: { idempotencyKey?: string } = {}) {
    return apiFetch<{ ok: true; data: CustomerPaymentSession }>(`/api/customer/orders/${encodeURIComponent(orderId)}/retry-payment`, {
      method: 'POST',
      headers: customerHeaders(token),
      body: JSON.stringify(payload),
    })
  },
}
