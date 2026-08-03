import { apiFetch } from './api'

function assertToken(token: string | null | undefined): string {
  if (!token) {
    throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  }
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

export type AvailabilitySlot = {
  id: string
  experienceId: string
  experienceTitle: string
  experienceSlug?: string | null
  location?: string | null
  durationMinutes?: number | null
  coverImageUrl?: string | null
  startAt: string
  endAt: string
  capacity: number
  reserved: number
  confirmed: number
  available: number
  waitlist: number
  occupancy: number
  price: number
  priceOverride?: number | null
  status: string
  operationalStatus: 'open' | 'blocked' | 'closed'
  isBookable: boolean
  blockedReason?: string | null
  notes?: string | null
}

export type AvailabilityBlockout = {
  id: string
  experienceId?: string | null
  startAt: string
  endAt: string
  reason?: string | null
  blockType: string
  appliesToAllExperiences: boolean
}

export type AvailabilityExperience = {
  id: string
  title: string
  slots?: unknown[]
  capacity?: number
  confirmed?: number
  available?: number
  occupancy?: number
}

export type ReservationRecord = {
  id: string
  reservationNumber: string
  customerId: string
  customerName: string
  email?: string | null
  phone?: string | null
  experienceId?: string | null
  experienceTitle: string
  experienceSlotId?: string | null
  startAt?: string | null
  endAt?: string | null
  peopleCount: number
  subtotal: number
  total: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  source: string
  customerNotes?: string | null
  internalNotes?: string | null
  operationalStatus: string
  capacity: number
  confirmed: number
  available: number
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  rescheduledAt?: string | null
  createdAt: string
  updatedAt: string
}

export type ReservationHistoryItem = {
  id: string
  reservationId: string
  previousStatus?: string | null
  newStatus: string
  notes?: string | null
  createdAt: string
}

export type ReservationListResponse = {
  ok: true
  data: ReservationRecord[]
  pagination: { page: number; perPage: number; total: number }
}

export const availabilityClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{
      ok: true
      data: {
        experiences: AvailabilityExperience[]
        slots: AvailabilitySlot[]
        blockouts: AvailabilityBlockout[]
      }
    }>(
      `/api/admin/availability${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  calendar(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: unknown[] }>(`/api/admin/availability/calendar${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  slots(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AvailabilitySlot[] }>(`/api/admin/availability/slots${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  createSlot(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AvailabilitySlot }>('/api/admin/availability/slots', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  updateSlot(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AvailabilitySlot }>(`/api/admin/availability/slots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  blockSlot(token: string | null | undefined, id: string, reason?: string) {
    return apiFetch<{ ok: true; data: AvailabilitySlot }>(`/api/admin/availability/slots/${encodeURIComponent(id)}/block`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  unblockSlot(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: AvailabilitySlot }>(`/api/admin/availability/slots/${encodeURIComponent(id)}/unblock`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  createBlockout(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AvailabilityBlockout }>('/api/admin/availability/blockouts', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  duplicateSlots(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: AvailabilitySlot[] }>('/api/admin/availability/duplicate-slots', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
}

export const reservationsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ReservationListResponse>(`/api/admin/reservations${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  get(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: ReservationRecord }>('/api/admin/reservations', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  update(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  confirm(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  cancel(token: string | null | undefined, id: string, reason?: string) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  reschedule(token: string | null | undefined, id: string, experienceSlotId: string) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}/reschedule`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ experienceSlotId }),
    })
  },
  changePartySize(token: string | null | undefined, id: string, peopleCount: number) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(
      `/api/admin/reservations/${encodeURIComponent(id)}/change-party-size`,
      {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ peopleCount }),
      },
    )
  },
  addNote(token: string | null | undefined, id: string, note: string) {
    return apiFetch<{ ok: true; data: ReservationRecord }>(`/api/admin/reservations/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ note }),
    })
  },
  history(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: ReservationHistoryItem[] }>(
      `/api/admin/reservations/${encodeURIComponent(id)}/history`,
      { headers: adminHeaders(token) },
    )
  },
  exportUrl(query?: Record<string, unknown>) {
    return `/api/admin/reservations/export${queryString(query)}`
  },
}
