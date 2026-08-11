import { afterEach, describe, expect, it, vi } from 'vitest'
import { notificationsClient } from '../services/notifications.service'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('notificationsClient', () => {
  it('consulta notificaciones reales protegidas y no contiene alertas simuladas', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: [{
        id: 'notification-1',
        channel: 'email',
        title: 'Confirmación de reservación',
        body: 'La reservación fue recibida.',
        status: 'sent',
        sentAt: '2026-08-10T10:00:00.000Z',
        readAt: null,
        createdAt: '2026-08-10T10:00:00.000Z',
      }],
      unreadCount: 1,
      pagination: { total: 1, limit: 8 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await notificationsClient.list('admin-token')

    expect(result.unreadCount).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/notifications?limit=8'),
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    )
    expect(JSON.stringify(result)).not.toContain('Catas del sábado')
    expect(JSON.stringify(result)).not.toContain('Campaña de cena romántica')
  })

  it('requiere sesión para consultar notificaciones administrativas', () => {
    expect(() => notificationsClient.list(null)).toThrow('Sesión requerida')
  })
})
