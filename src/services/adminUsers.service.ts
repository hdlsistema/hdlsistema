import { apiFetch } from './api'

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

export type ControlPermission = {
  code: string
  module: string
  page: string
  action: string
  label: string
  description?: string | null
  financial: boolean
  sortOrder: number
}

export type AdminUserRecord = {
  id: string
  email: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  emailVerified: boolean
  createdAt: string
  lastSignInAt?: string | null
  roles?: string[]
  financialAccess?: boolean
  managedPasswordLocked?: boolean
  isCustomer?: boolean
  isStaff?: boolean
  accountType?: 'admin' | 'staff' | 'customer_staff'
  accountLabel?: string
}

export type ControlAccessResponse = {
  permissions: string[]
  financialAccess: boolean
}

export type CreateStaffUserPayload = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  roles: string[]
  permissions: string[]
  financialAccess?: boolean
}

export const adminUsersClient = {
  currentAccess(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: ControlAccessResponse }>('/api/admin/permissions/me', {
      headers: adminHeaders(token),
    })
  },
  catalog(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: ControlPermission[]; financialAccess: boolean }>('/api/admin/permissions/catalog', {
      headers: adminHeaders(token),
    })
  },
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{ users: AdminUserRecord[]; page: number; perPage: number }>(
      `/api/admin/users${queryString(query)}`,
      { headers: adminHeaders(token) },
    )
  },
  create(token: string | null | undefined, payload: CreateStaffUserPayload) {
    return apiFetch<{
      id: string
      email: string | null
      firstName?: string | null
      lastName?: string | null
      displayName?: string | null
      roles: string[]
      permissions: string[]
      financialAccess: boolean
      isCustomer?: boolean
      isStaff?: boolean
      accountType?: AdminUserRecord['accountType']
      accountLabel?: string
    }>(
      '/api/admin/users',
      {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify(payload),
      },
    )
  },
  getPermissions(token: string | null | undefined, userId: string) {
    return apiFetch<{ ok: true; data: ControlAccessResponse & { roles: string[] } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/permissions`,
      { headers: adminHeaders(token) },
    )
  },
  updatePermissions(token: string | null | undefined, userId: string, payload: { roles: string[]; permissions: string[]; financialAccess?: boolean }) {
    return apiFetch<{ ok: true; data: ControlAccessResponse & { roles: string[] } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/permissions`,
      {
        method: 'PUT',
        headers: adminHeaders(token),
        body: JSON.stringify(payload),
      },
    )
  },
  rotatePassword(token: string | null | undefined, userId: string, password: string) {
    return apiFetch<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(userId)}/password`,
      {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ password }),
      },
    )
  },
}
