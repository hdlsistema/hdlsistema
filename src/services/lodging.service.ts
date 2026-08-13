import { apiFetch } from './api'

function headers(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function queryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export type LodgingUnit = {
  id: string
  cabinPackageId?: string | null
  cabinPackageName?: string | null
  code: string
  name: string
  description?: string | null
  capacity: number
  baseRate: number
  currency: string
  operationalStatus: string
  housekeepingStatus: string
  coverImageUrl?: string | null
}

export type LodgingPackage = {
  id: string
  slug: string
  name: string
  subtitle?: string | null
  price: number
  currency: string
  min_guests: number
  max_guests: number
  nights: number
  status: string
  visible_in_app: boolean
  cover_image_url?: string | null
}

export type LodgingCalendarEntry = {
  id: string
  unitId: string
  unitCode: string
  unitName: string
  reservationId?: string | null
  reservationNumber?: string | null
  customerName?: string | null
  peopleCount?: number | null
  reservationStatus?: string | null
  entryType: string
  startDate: string
  endDate: string
  status: string
  expiresAt?: string | null
  reason?: string | null
}

export type LodgingStay = {
  id: string
  reservationId: string
  reservationNumber?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  peopleCount: number
  reservationStatus?: string | null
  cabinPackageId?: string | null
  cabinPackageName?: string | null
  unitId: string
  unitCode: string
  unitName: string
  housekeepingStatus: string
  plannedCheckIn: string
  plannedCheckOut: string
  status: string
  guestManifest: Array<{ fullName?: string }>
  actualCheckInAt?: string | null
  actualCheckOutAt?: string | null
}

export const lodgingClient = {
  units(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: LodgingUnit[] }>('/api/admin/lodging/units', { headers: headers(token) })
  },
  packages(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: LodgingPackage[] }>('/api/admin/lodging/packages', { headers: headers(token) })
  },
  createUnit(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: LodgingUnit }>('/api/admin/lodging/units', { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })
  },
  updateUnit(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: LodgingUnit }>(`/api/admin/lodging/units/${encodeURIComponent(id)}`, { method: 'PATCH', headers: headers(token), body: JSON.stringify(payload) })
  },
  calendar(token: string | null | undefined, query: { from: string; to: string; unitId?: string }) {
    return apiFetch<{ ok: true; data: LodgingCalendarEntry[] }>(`/api/admin/lodging/calendar${queryString(query)}`, { headers: headers(token) })
  },
  stays(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: LodgingStay[] }>('/api/admin/lodging/stays', { headers: headers(token) })
  },
  createReservation(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: Record<string, unknown> }>('/api/admin/lodging/reservations', { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })
  },
  reschedule(token: string | null | undefined, reservationId: string, payload: { checkIn: string; checkOut: string; unitId?: string | null }) {
    return apiFetch<{ ok: true; data: LodgingStay }>(`/api/admin/lodging/stays/${encodeURIComponent(reservationId)}/reschedule`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    })
  },
  block(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: LodgingCalendarEntry }>('/api/admin/lodging/blockouts', { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })
  },
  releaseBlock(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: LodgingCalendarEntry }>(`/api/admin/lodging/blockouts/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers(token) })
  },
  checkIn(token: string | null | undefined, reservationId: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: LodgingStay }>(`/api/admin/lodging/stays/${encodeURIComponent(reservationId)}/check-in`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })
  },
  checkOut(token: string | null | undefined, reservationId: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: LodgingStay }>(`/api/admin/lodging/stays/${encodeURIComponent(reservationId)}/check-out`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })
  },
}
