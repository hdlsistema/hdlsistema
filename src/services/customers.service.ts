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

export type CustomerSegment =
  | 'customer'
  | 'new'
  | 'recurrente'
  | 'vip'
  | 'alto_valor'
  | 'inactivo'
  | 'en_riesgo'
  | 'wine_club'
  | 'corporativo'

export type CustomerTag = {
  id: string
  name: string
  slug: string
  color: string
  description?: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type CustomerAccountType = 'customer' | 'staff' | 'admin' | 'customer_staff'

export type CustomerStaffScope = {
  code: string
  label: string
  type: 'estate' | 'restaurant' | 'boutique' | 'lodging' | 'site'
  description?: string | null
  sortOrder: number
}

export type CustomerNote = {
  id: string
  customerId: string
  note: string
  createdAt: string
  updatedAt: string
}

export type CustomerRecord = {
  id: string
  customerNumber: string
  displayName: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  birthDate?: string | null
  source?: string | null
  segment: CustomerSegment
  status: string
  preferredLanguage: 'es' | 'en'
  marketingEmailConsent: boolean
  marketingPushConsent: boolean
  consentUpdatedAt?: string | null
  isStaff: boolean
  isCustomer: boolean
  accountType: CustomerAccountType
  accountLabel: string
  campaignAudience: string
  staffRoles: string[]
  staffPermissionCount: number
  staffScopeCodes: string[]
  staffScopes: CustomerStaffScope[]
  totalSpend: number
  totalVisits: number
  reservationsCount: number
  ordersCount: number
  membershipsCount: number
  activeMembershipsCount: number
  averageTicket: number
  lastVisitAt?: string | null
  notes?: string | null
  tags: CustomerTag[]
  recentNotes?: CustomerNote[]
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerRelationItem = {
  id: string
  reservationNumber?: string
  orderNumber?: string
  membershipNumber?: string
  peopleCount?: number
  total?: number
  currency?: string
  status: string
  source?: string | null
  createdAt?: string
  updatedAt?: string
  startsAt?: string
  endsAt?: string | null
  pointsBalance?: number
  plan?: { code: string; name: string; price: number } | null
}

export type CustomerHistoryItem = {
  id: string
  action: string
  entityType: string
  entityId?: string | null
  source?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type CustomerPayload = {
  firstName: string
  lastName?: string | null
  displayName?: string | null
  email?: string | null
  phone?: string | null
  birthDate?: string | null
  source?: string
  segment?: CustomerSegment
  preferredLanguage?: 'es' | 'en'
  marketingEmailConsent?: boolean
  marketingPushConsent?: boolean
  notes?: string | null
}

export type CustomerListResponse = {
  ok: true
  data: CustomerRecord[]
  pagination: { page: number; perPage: number; total: number }
}

export const customersClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<CustomerListResponse>(`/api/admin/customers${queryString(query)}`, {
      headers: adminHeaders(token),
    })
  },
  get(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(id)}`, {
      headers: adminHeaders(token),
    })
  },
  create(token: string | null | undefined, payload: CustomerPayload) {
    return apiFetch<{ ok: true; data: CustomerRecord }>('/api/admin/customers', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  update(token: string | null | undefined, id: string, payload: Partial<CustomerPayload>) {
    return apiFetch<{ ok: true; data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  archive(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  restore(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },
  reservations(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRelationItem[] }>(
      `/api/admin/customers/${encodeURIComponent(id)}/reservations`,
      { headers: adminHeaders(token) },
    )
  },
  orders(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRelationItem[] }>(`/api/admin/customers/${encodeURIComponent(id)}/orders`, {
      headers: adminHeaders(token),
    })
  },
  memberships(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerRelationItem[] }>(
      `/api/admin/customers/${encodeURIComponent(id)}/memberships`,
      { headers: adminHeaders(token) },
    )
  },
  history(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerHistoryItem[] }>(
      `/api/admin/customers/${encodeURIComponent(id)}/history`,
      { headers: adminHeaders(token) },
    )
  },
  addNote(token: string | null | undefined, id: string, note: string) {
    return apiFetch<{ ok: true; data: CustomerNote }>(`/api/admin/customers/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ note }),
    })
  },
  updateNote(token: string | null | undefined, id: string, noteId: string, note: string) {
    return apiFetch<{ ok: true; data: CustomerNote }>(
      `/api/admin/customers/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`,
      {
        method: 'PATCH',
        headers: adminHeaders(token),
        body: JSON.stringify({ note }),
      },
    )
  },
  deleteNote(token: string | null | undefined, id: string, noteId: string) {
    return apiFetch<{ ok: true; data: CustomerNote }>(
      `/api/admin/customers/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`,
      { method: 'DELETE', headers: adminHeaders(token) },
    )
  },
  tags(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: CustomerTag[] }>('/api/admin/customer-tags', {
      headers: adminHeaders(token),
    })
  },
  createTag(token: string | null | undefined, payload: { name: string; slug?: string; color?: string; description?: string | null }) {
    return apiFetch<{ ok: true; data: CustomerTag }>('/api/admin/customer-tags', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  updateTag(token: string | null | undefined, id: string, payload: { name?: string; slug?: string; color?: string; description?: string | null }) {
    return apiFetch<{ ok: true; data: CustomerTag }>(`/api/admin/customer-tags/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  deleteTag(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: CustomerTag }>(`/api/admin/customer-tags/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminHeaders(token),
    })
  },
  assignTag(token: string | null | undefined, id: string, tagId: string) {
    return apiFetch<{ ok: true; data: CustomerTag }>(`/api/admin/customers/${encodeURIComponent(id)}/tags`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ tagId }),
    })
  },
  unassignTag(token: string | null | undefined, id: string, tagId: string) {
    return apiFetch<{ ok: true; data: { customerId: string; tagId: string } }>(
      `/api/admin/customers/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`,
      { method: 'DELETE', headers: adminHeaders(token) },
    )
  },
  exportUrl(query?: Record<string, unknown>) {
    return `/api/admin/customers/export${queryString(query)}`
  },
  exportCsv(token: string | null | undefined, query?: Record<string, unknown>) {
    return fetch(`${API_BASE}${customersClient.exportUrl(query)}`, {
      headers: { Authorization: `Bearer ${assertToken(token)}` },
    })
  },
}
