import { afterEach, describe, expect, it, vi } from 'vitest'
import { customerClient } from '../services/customer.service'

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

describe('customer.service client', () => {
  it('usa endpoints customer con Authorization Bearer', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'slot-1', available: 6, price: 450 }],
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customerClient.availability('jwt-customer', { experienceId: 'experience-1' })

    expect(response.data[0].available).toBe(6)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/availability?experienceId=experience-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-customer',
        }),
      }),
    )
  })

  it('crea reservación sin enviar customer_id desde frontend', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { id: 'reservation-1' } }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customerClient.createReservation('jwt-customer', {
      experienceSlotId: 'slot-1',
      peopleCount: 2,
      language: 'es',
      idempotencyKey: 'fase8b-idempotency',
    })

    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/reservations',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(String(request?.body)).toContain('fase8b-idempotency')
    expect(String(request?.body)).not.toContain('customer_id')
    expect(String(request?.body)).not.toContain('customerId')
  })

  it('rechaza llamadas customer sin sesión localmente', () => {
    expect.assertions(1)
    try {
      customerClient.me(null)
    } catch (error) {
      expect(error).toMatchObject({ status: 401 })
    }
  })

  it('propaga 403 para customer sin permiso administrativo', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403, statusText: 'Forbidden' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await expect(customerClient.reservations('jwt-customer')).rejects.toMatchObject({ status: 403 })
  })
})
