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

export type MembershipRecord = {
  id: string
  membershipNumber: string
  customerName?: string | null
  customerEmail?: string | null
  planName?: string | null
  status: string
  startsAt: string
  renewalDate?: string | null
  expiresAt?: string | null
  pointsBalance: number
}

export type InventoryRecord = {
  id: string
  locationId: string
  wineName: string
  sku?: string | null
  productName?: string | null
  lotCode?: string | null
  locationName?: string | null
  onHand: number
  reserved: number
  available: number
  minimum: number
  lowStock: boolean
  status: string
  unitCost?: number | null
}

export type InventoryLocationRecord = {
  id: string
  name: string
  code?: string | null
  type: string
  active: boolean
}

export type InventoryMovementRecord = {
  id: string
  movementType: string
  quantity: number
  product?: string | null
  sku?: string | null
  location?: string | null
  reason?: string | null
  createdAt: string
}

export type ShipmentRecord = {
  id: string
  shipmentNumber?: string | null
  orderNumber?: string | null
  customerName?: string | null
  carrierName?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  destination?: string | null
  status: string
  shippingCost: number
  estimatedDeliveryAt?: string | null
  deliveredAt?: string | null
  incidentCount: number
}

export type DistributorRecord = {
  id: string
  distributorNumber?: string | null
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  zone?: string | null
  distributorType: string
  status: string
  commercialTerms?: string | null
  priceListName?: string | null
  creditLimit: number
}

export type DistributorOrderRecord = {
  id: string
  distributorId: string
  distributorName?: string | null
  orderNumber: string
  status: string
  total: number
  currency: string
  deliveredAt?: string | null
  createdAt: string
}

type ListResponse<T> = { ok: true; data: T[]; pagination: { page: number; perPage: number; total: number } }

export const membershipsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<MembershipRecord>>(`/api/admin/memberships${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: MembershipRecord }>('/api/admin/memberships', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  action(token: string | null | undefined, id: string, action: string, reason?: string) {
    return apiFetch<{ ok: true; data: MembershipRecord }>(`/api/admin/memberships/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  loyalty(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: unknown[] }>(`/api/admin/memberships/${encodeURIComponent(id)}/loyalty`, {
      headers: adminHeaders(token),
    })
  },
  adjustLoyalty(token: string | null | undefined, id: string, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: unknown[] }>(`/api/admin/memberships/${encodeURIComponent(id)}/loyalty-adjustment`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/memberships/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}

export const inventoryClient = {
  summary(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: { items: InventoryRecord[]; locations: InventoryLocationRecord[]; movements: InventoryMovementRecord[]; alerts: InventoryRecord[] } }>(
      `/api/admin/inventory${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  items(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<InventoryRecord>>(`/api/admin/inventory/items${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  locations(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: InventoryLocationRecord[] }>('/api/admin/inventory/locations', {
      headers: adminHeaders(token),
    })
  },
  movements(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<InventoryMovementRecord>>(`/api/admin/inventory/movements${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  createLocation(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: InventoryLocationRecord }>('/api/admin/inventory/locations', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  createItem(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: InventoryRecord }>('/api/admin/inventory/items', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  operation(token: string | null | undefined, action: 'receive' | 'reserve' | 'release' | 'fulfill' | 'transfer' | 'adjust', payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: InventoryRecord }>(`/api/admin/inventory/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/inventory/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}

export const shipmentsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<ShipmentRecord>>(`/api/admin/shipments${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: ShipmentRecord }>('/api/admin/shipments', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  status(token: string | null | undefined, id: string, status: string, notes?: string) {
    return apiFetch<{ ok: true; data: ShipmentRecord }>(`/api/admin/shipments/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ status, notes }),
    })
  },
  incident(token: string | null | undefined, id: string, notes: string) {
    return apiFetch<{ ok: true; data: unknown[] }>(`/api/admin/shipments/${encodeURIComponent(id)}/incident`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ notes }),
    })
  },
  deliver(token: string | null | undefined, id: string, notes?: string) {
    return apiFetch<{ ok: true; data: ShipmentRecord }>(`/api/admin/shipments/${encodeURIComponent(id)}/deliver`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ notes }),
    })
  },
  cancel(token: string | null | undefined, id: string, notes?: string) {
    return apiFetch<{ ok: true; data: ShipmentRecord }>(`/api/admin/shipments/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ notes }),
    })
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/shipments/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}

export const distributorsClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<DistributorRecord>>(`/api/admin/distributors${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: DistributorRecord }>('/api/admin/distributors', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  archive(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: DistributorRecord }>(`/api/admin/distributors/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  orders(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<ListResponse<DistributorOrderRecord>>(`/api/admin/distributor-orders${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  createOrder(token: string | null | undefined, payload: Record<string, unknown>) {
    return apiFetch<{ ok: true; data: DistributorOrderRecord }>('/api/admin/distributor-orders', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  orderAction(token: string | null | undefined, id: string, action: string, reason?: string) {
    return apiFetch<{ ok: true; data: DistributorOrderRecord }>(`/api/admin/distributor-orders/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ reason }),
    })
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}/api/admin/distributors/export${queryString(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}
