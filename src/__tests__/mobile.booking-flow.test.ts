import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminContentClient } from '../services/content.service'
import { customerClient } from '../services/customer.service'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('flujo mobile de reservaciones y boletos', () => {
  it('administra tipos de boleto del evento mediante endpoints protegidos', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: [] }))
    vi.stubGlobal('fetch', fetchSpy)

    await adminContentClient.eventTicketTypes('event-1', 'jwt-admin')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/events/event-1/ticket-types',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }) }),
    )
  })

  it('consulta los pases emitidos para mostrar el QR al cliente', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: [{ id: 'pass-1', accessType: 'event_ticket' }] }))
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customerClient.accessPasses('jwt-customer')

    expect(response.data[0].accessType).toBe('event_ticket')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/access-passes',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-customer' }) }),
    )
  })

  it('mantiene horarios de restaurante y reprogramacion alimentados por la entidad correcta', () => {
    const reservations = readFileSync(resolve(__dirname, '../app/pages/mobile/ReservationScreen.tsx'), 'utf8')
    const restaurants = readFileSync(resolve(__dirname, '../app/pages/mobile/RestaurantsScreen.tsx'), 'utf8')
    const catalog = readFileSync(resolve(__dirname, '../app/pages/control/CommercialCatalogPage.tsx'), 'utf8')
    const paymentStatus = readFileSync(resolve(__dirname, '../app/pages/mobile/PaymentStatusScreen.tsx'), 'utf8')

    expect(reservations).toContain('customerClient.accessPasses(token)')
    expect(reservations).toContain("pass.accessType === 'event_ticket'")
    expect(reservations).toContain('slot.experienceId === reservation.experienceId')
    expect(reservations).toContain("reservation.reservationType === 'experience'")
    expect(restaurants).toContain('selectedRestaurantRecord?.metadata?.reservationTimes')
    expect(restaurants).not.toContain("const restaurantTimes = ['12:00'")
    expect(catalog).toContain('Horarios de solicitud (uno por línea, HH:mm)')
    expect(paymentStatus).toContain("appPath('/reservacion')}#boletos")
    expect(paymentStatus).toContain('Ver boletos y códigos QR')
  })
})
