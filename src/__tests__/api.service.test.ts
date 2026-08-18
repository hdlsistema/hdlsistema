import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, API_BASE, checkBackendStatus } from '../services/api'

// El BASE_URL se inyecta en tiempo de build desde vitest.config.ts define
// → import.meta.env.VITE_API_BASE_URL = 'http://localhost:3001'

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── 12. apiFetch construye correctamente la URL ───────────────────────────
describe('apiFetch — construcción de URL', () => {
  it('API_BASE es http://localhost:3001 sin slash final', () => {
    expect(API_BASE).toBe('http://localhost:3001')
  })

  it('construye URL correcta con path /api/public/status', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    await apiFetch('/api/public/status')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/public/status',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('normaliza path sin slash inicial', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    await apiFetch('api/health')

    const calledUrl = (mockFetch.mock.calls[0] as [string, unknown])[0]
    expect(calledUrl).toBe('http://localhost:3001/api/health')
  })
})

// ─── 13. apiFetch maneja timeout ──────────────────────────────────────────
describe('apiFetch — timeout', () => {
  it('lanza error con status 408 cuando el fetch tarda más del timeout', async () => {
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          ;(options.signal as AbortSignal).addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        }),
    )
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      apiFetch('/api/slow', { timeoutMs: 50 }),
    ).rejects.toMatchObject({
      name: 'Error',
      status: 408,
      message: expect.stringContaining('timeout'),
    })
  })
})

// ─── 14. apiFetch maneja respuestas no exitosas ────────────────────────────
describe('apiFetch — respuestas HTTP de error', () => {
  it('lanza error con status 404 en respuesta 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }),
        { status: 404, statusText: 'Not Found' },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    await expect(apiFetch('/api/no-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Ruta no encontrada',
    })
  })

  it('muestra el mensaje operativo del backend en lugar de sólo HTTP 422', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: { code: 'UNPROCESSABLE', message: 'Transición de estado inválida' } }),
        { status: 422, statusText: 'Unprocessable Entity' },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    await expect(apiFetch('/api/admin/shipments/shipment-1/deliver')).rejects.toMatchObject({
      status: 422,
      message: 'Transición de estado inválida',
    })
  })

  it('adjunta el body JSON del error para que el caller pueda leerlo', async () => {
    const errorBody = { ok: false, error: { code: 'FORBIDDEN', message: 'Acceso denegado' } }
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 403,
        statusText: 'Forbidden',
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    let caughtError: { body?: unknown } | undefined
    try {
      await apiFetch('/api/privado')
    } catch (err) {
      caughtError = err as { body?: unknown }
    }

    expect(caughtError?.body).toMatchObject(errorBody)
  })

  it('checkBackendStatus retorna reachable:false ante error de red', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    const result = await checkBackendStatus()
    expect(result.reachable).toBe(false)
    expect(result.ok).toBe(false)
  })
})
