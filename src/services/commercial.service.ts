import { apiFetch } from './api'

function assertToken(token: string | null | undefined): string {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return token
}

function jsonHeaders(token?: string | null): HeadersInit {
  return token
    ? { Authorization: `Bearer ${assertToken(token)}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function queryString(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

export type PublicCommercialItem = {
  id: string
  slug: string
  name: string
  title: string
  subtitle?: string | null
  description?: string | null
  shortDescription?: string | null
  category?: string | null
  durationMinutes?: number | null
  price: number
  currency: string
  priceUnit?: string | null
  minGuests?: number | null
  maxGuests?: number | null
  nights?: number | null
  capacity?: number | null
  dimensions?: string | null
  location?: string | null
  address?: string | null
  alias?: string | null
  hours?: Record<string, unknown>
  reservationEnabled?: boolean
  inclusions?: string[]
  coverImageUrl?: string | null
  verificationStatus?: string | null
  metadata?: Record<string, unknown>
}

export type CommercialServices = {
  experiences: PublicCommercialItem[]
  cabins: PublicCommercialItem[]
  restaurants: PublicCommercialItem[]
  venueSpaces: PublicCommercialItem[]
}

export type QuoteRequestRecord = {
  id: string
  quoteNumber: string
  customerName: string
  eventCategory: string
  eventType: string
  preferredDate?: string | null
  guestCount: number
  venueSpaceName?: string | null
  status: 'new' | 'contacted' | 'in_progress' | 'quoted' | 'won' | 'lost' | 'cancelled'
  contactEmail: string
  contactPhone: string
  assignedTo?: string | null
  adminNotes?: string | null
  createdAt: string
  updatedAt: string
}

export const publicCommercialClient = {
  services() {
    return apiFetch<{ ok: true; data: CommercialServices }>('/api/public/commercial/services')
  },
}

export const customerCommercialClient = {
  createCabinReservation(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: unknown; duplicate?: boolean }>('/api/customer/cabin-reservations', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  createRestaurantReservation(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: unknown; duplicate?: boolean }>('/api/customer/restaurant-reservations', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  createQuoteRequest(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: QuoteRequestRecord; duplicate?: boolean }>('/api/customer/quote-requests', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    })
  },
}

export const quoteRequestsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{
      ok: true
      data: QuoteRequestRecord[]
      pagination: { page: number; perPage: number; total: number }
    }>(`/api/admin/quote-requests${queryString(query)}`, {
      headers: jsonHeaders(token),
    })
  },
  get(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: QuoteRequestRecord }>(`/api/admin/quote-requests/${encodeURIComponent(id)}`, {
      headers: jsonHeaders(token),
    })
  },
  update(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: QuoteRequestRecord }>(`/api/admin/quote-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    })
  },
}
