import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  adminContentClient,
  getPreviewUrl,
  previewContentClient,
  publicContentClient,
} from '../services/content.service'

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('content.service admin client', () => {
  it('envía Authorization Bearer al listar vinos desde el backend admin', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'wine-1', name: 'Reserva' }],
        pagination: { page: 1, perPage: 20, total: 1 },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await adminContentClient.list('wines', 'jwt-admin', {
      locale: 'es-MX',
      orderBy: 'name',
    })

    expect(response.data[0].name).toBe('Reserva')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/wines?locale=es-MX&orderBy=name',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-admin',
        }),
      }),
    )
  })

  it('propaga 401 cuando no hay sesión administrativa', () => {
    expect.assertions(1)
    try {
      adminContentClient.list('wines', null)
    } catch (error) {
      expect(error).toMatchObject({ status: 401 })
    }
  })

  it('propaga 403 cuando el backend rechaza permisos', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403, statusText: 'Forbidden' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await expect(adminContentClient.list('wines', 'jwt-customer')).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('content.service public and preview clients', () => {
  it('abre la vista previa visual del frontend y no el JSON técnico del backend', () => {
    expect(getPreviewUrl('preview token')).toBe('https://admhaciendadeletras.com/vista-previa/preview%20token')
    expect(getPreviewUrl('preview token')).not.toContain('/api/preview/')
  })

  it('consume endpoints públicos sin Authorization', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'experience-1', title: 'Cata' }],
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await publicContentClient.list('experiences', { locale: 'es-MX' })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/public/experiences?locale=es-MX',
      expect.not.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    )
  })

  it('propaga 404 para preview token inválido', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404, statusText: 'Not Found' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await expect(previewContentClient.get('invalid-token')).rejects.toMatchObject({
      status: 404,
    })
  })
})
