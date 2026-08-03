import { afterEach, describe, expect, it, vi } from 'vitest'
import { availabilityClient, reservationsClient } from '../services/operations.service'

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

describe('operations.service availability client', () => {
  it('consulta slots reales con Authorization Bearer', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [
          {
            id: 'slot-1',
            experienceTitle: 'Cata',
            capacity: 12,
            confirmed: 4,
            available: 8,
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await availabilityClient.slots('jwt-admin', { availability: 'available' })

    expect(response.data[0].available).toBe(8)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/availability/slots?availability=available',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })

  it('envía creación de slot al backend administrativo real', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { id: 'slot-2', capacity: 10 } }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await availabilityClient.createSlot('jwt-admin', {
      experienceId: 'experience-1',
      startAt: '2026-08-10T18:00:00.000Z',
      endAt: '2026-08-10T20:00:00.000Z',
      capacity: 10,
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/availability/slots',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('experience-1'),
      }),
    )
  })
})

describe('operations.service reservations client', () => {
  it('rechaza llamadas administrativas sin sesión', () => {
    expect.assertions(1)
    try {
      reservationsClient.list(null)
    } catch (error) {
      expect(error).toMatchObject({ status: 401 })
    }
  })

  it('confirma y cancela contra endpoints reales de reservaciones', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'reservation-1', status: 'confirmed' } })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await reservationsClient.confirm('jwt-admin', 'reservation-1')
    await reservationsClient.cancel('jwt-admin', 'reservation-1', 'Prueba controlada')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/reservations/reservation-1/confirm',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/reservations/reservation-1/cancel',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Prueba controlada'),
      }),
    )
  })
})
