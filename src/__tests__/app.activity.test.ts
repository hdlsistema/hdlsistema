import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackAppActivity } from '../services/appActivity.service'
import { eventForAppPath } from '../services/appActivity.routes'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trazabilidad de la app cliente', () => {
  it('asocia las rutas de contenido y compra con eventos explícitos', () => {
    expect(eventForAppPath('/app/vinos/tempranillo-2024')).toEqual({
      eventName: 'wine_viewed',
      entityType: 'wine',
      entityId: 'tempranillo-2024',
    })
    expect(eventForAppPath('/app/carrito')).toEqual({ eventName: 'cart_viewed', entityType: 'cart' })
    expect(eventForAppPath('/app/checkout')).toEqual({ eventName: 'checkout_started', entityType: 'order' })
  })

  it('envía actividad no sensible al backend, con clave de idempotencia y token solo en header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    })
    vi.stubGlobal('crypto', { randomUUID: () => '00000000-0000-4000-8000-000000000001' })

    trackAppActivity({
      eventName: 'wine_filter_used',
      entityType: 'wine',
      metadata: { route: '/app/vinos', filter: 'tintos' },
      accessToken: 'customer-session-token',
      eventKey: 'trace-test:filter:unique',
    })
    await Promise.resolve()
    await Promise.resolve()

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/activity',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(request.headers).toMatchObject({ Authorization: 'Bearer customer-session-token' })
    expect(String(request.body)).toContain('trace-test:filter:unique')
    expect(String(request.body)).not.toContain('customer-session-token')
  })
})
