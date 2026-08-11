import { apiFetch } from './api'

export type AdminSettingKey =
  | 'customer_app.default_language'
  | 'customer_app.cart_abandonment'
  | 'communications.preferences'
  | 'sommelier.daily_limit'

export type AdminSetting = {
  key: AdminSettingKey
  value: unknown
  description?: string | null
  updatedAt?: string | null
}

function headers(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export const settingsClient = {
  list(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: AdminSetting[] }>('/api/admin/settings', {
      headers: headers(token),
    })
  },
  update(token: string | null | undefined, settings: Partial<Record<AdminSettingKey, unknown>>) {
    return apiFetch<{ ok: true; data: AdminSetting[] }>('/api/admin/settings', {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ settings }),
    })
  },
}
