import { apiFetch } from './api'

function adminHeaders(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}` }
}

function queryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export type AppActivityRecord = {
  id: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  sessionId: string
  eventName: string
  module: string
  entityType: string | null
  entityId: string | null
  source: string
  status: string
  metadata: Record<string, unknown>
  occurredAt: string
  createdAt: string
}

export type CustomerCartRecord = {
  id: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  status: 'active' | 'checkout_started' | 'abandoned' | 'converted' | string
  persistedStatus: string
  currency: string
  quantity: number
  estimatedValue: number
  items: Array<{
    id: string
    itemType: string
    itemId: string
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
    currency: string
  }>
  lastActivity: string
  inactiveMinutes: number
  events: AppActivityRecord[]
  relatedOrderId?: string | null
  createdAt: string
  updatedAt: string
}

export const appActivityAdminClient = {
  list(token: string | null | undefined, query: Record<string, unknown> = {}) {
    return apiFetch<{ ok: true; data: AppActivityRecord[]; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/activity${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  carts(token: string | null | undefined, query: Record<string, unknown> = {}) {
    return apiFetch<{ ok: true; data: CustomerCartRecord[]; configuration: { abandonmentThresholdMinutes: number | null }; pagination: { page: number; perPage: number; total: number } }>(
      `/api/admin/carts${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  cart(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerCartRecord }>(`/api/admin/carts/${encodeURIComponent(id)}`, {
      headers: adminHeaders(token),
    })
  },
}
