import { apiFetch } from './api'

function headers(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}` }
}

export type AdminNotification = {
  id: string
  channel: string
  title: string
  body: string
  status: 'pending' | 'sent' | 'failed' | 'read'
  data?: Record<string, unknown>
  deepLink?: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
}

export const notificationsClient = {
  list(token: string | null | undefined, limit = 20) {
    return apiFetch<{
      ok: true
      data: AdminNotification[]
      unreadCount: number
      pagination: { total: number; limit: number }
    }>(`/api/admin/notifications?limit=${limit}`, {
      headers: headers(token),
    })
  },
  read(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: AdminNotification }>(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: headers(token),
    })
  },
}
