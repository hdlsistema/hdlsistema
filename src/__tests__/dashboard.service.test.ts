import { afterEach, describe, expect, it, vi } from 'vitest'
import { dashboardClient } from '../services/dashboard.service'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dashboardClient', () => {
  it('consulta el resumen operativo protegido y no contiene valores simulados', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        generatedAt: '2026-08-10T00:00:00.000Z',
        metrics: {
          customers: 0,
          activeReservations: 0,
          pendingReservations: 0,
          confirmedReservations: 0,
          pendingPaymentOrders: 0,
          confirmedPayments: 0,
          collected: [],
        },
        upcomingSlots: [],
        recentReservations: [],
        recentOrders: [],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await dashboardClient.get('session-token')

    expect(result.data.metrics.customers).toBe(0)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/dashboard'),
      expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } }),
    )
  })

  it('requiere una sesión para consultar datos operativos', async () => {
    expect(() => dashboardClient.get(null)).toThrow('Sesión requerida')
  })
})
