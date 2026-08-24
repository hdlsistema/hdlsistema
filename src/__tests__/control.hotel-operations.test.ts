import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lodgingClient } from '../services/lodging.service'

afterEach(() => vi.restoreAllMocks())

describe('centro unificado de disponibilidad y reservaciones', () => {
  it('expone Cabañas dentro de Disponibilidad con calendario, colores y gráficas', () => {
    const availability = readFileSync(resolve(__dirname, '../app/pages/control/AvailabilityPage.tsx'), 'utf8')
    const lodging = readFileSync(resolve(__dirname, '../app/pages/control/LodgingPage.tsx'), 'utf8')
    const router = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')

    expect(availability).toContain('Cabañas')
    expect(availability).toContain('<LodgingPage embedded />')
    expect(availability).toContain('Ocupación consolidada')
    expect(lodging).toContain('Calendario por cabaña')
    expect(lodging).toContain('Disponibilidad diaria por color')
    expect(lodging).toContain('Inventario de cabañas')
    expect(lodging).toContain('Reservada')
    expect(lodging).toContain('Hold pendiente')
    expect(lodging).toContain('Bloqueada / fuera de servicio')
    expect(router).toContain('to="/control/disponibilidad?view=hospedaje"')
  })

  it('centraliza restaurantes y sus horarios de app dentro de Disponibilidad', () => {
    const availability = readFileSync(resolve(__dirname, '../app/pages/control/AvailabilityPage.tsx'), 'utf8')
    const restaurants = readFileSync(resolve(__dirname, '../app/pages/control/RestaurantAvailabilityPanel.tsx'), 'utf8')
    const layout = readFileSync(resolve(__dirname, '../app/layout/ControlLayout.tsx'), 'utf8')

    expect(layout).toContain("label: t('control.availability')")
    expect(layout).not.toContain("t('control.availability')} /")
    expect(availability).toContain("'restaurantes'")
    expect(availability).toContain('<RestaurantAvailabilityPanel token={token} writable={writable} />')
    expect(restaurants).toContain('Horarios disponibles en la app')
    expect(restaurants).toContain("adminCommercialCatalogClient.update(token, 'restaurants'")
    expect(restaurants).toContain("metadata: { ...item.metadata, reservationTimes")
    expect(restaurants).toContain('Cada cambio se guarda en Supabase y la app lo consulta')
  })

  it('presenta un expediente distinto para hospedaje y evita cupo u horario de experiencia', () => {
    const reservations = readFileSync(resolve(__dirname, '../app/pages/control/ReservationsPage.tsx'), 'utf8')

    expect(reservations).toContain("selected.reservationType === 'cabin'")
    expect(reservations).toContain('Paquete de cabaña')
    expect(reservations).toContain('Cabaña asignada')
    expect(reservations).toContain('Reprogramar estancia')
    expect(reservations).toContain('Housekeeping')
    expect(reservations).toContain('Crear cliente nuevo')
    expect(reservations).toContain('Nueva cabaña')
  })

  it('envía la reprogramación hotelera al backend autenticado', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchSpy)

    await lodgingClient.reschedule('jwt-admin', 'reservation-1', {
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      unitId: 'unit-1',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/lodging/stays/reservation-1/reschedule',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
        body: JSON.stringify({ checkIn: '2026-09-10', checkOut: '2026-09-13', unitId: 'unit-1' }),
      }),
    )
  })

  it('usa iconografía operativa específica y elimina destellos genéricos del centro de control', () => {
    const layout = readFileSync(resolve(__dirname, '../app/layout/ControlLayout.tsx'), 'utf8')
    const editorial = readFileSync(resolve(__dirname, '../app/pages/control/editorial/EditorialFormShell.tsx'), 'utf8')
    const lodging = readFileSync(resolve(__dirname, '../app/pages/control/LodgingPage.tsx'), 'utf8')
    const wineClub = readFileSync(resolve(__dirname, '../app/pages/control/WineClubPage.tsx'), 'utf8')

    expect(layout).toContain('icon: Tickets')
    expect(layout).toContain('icon: BadgeCheck')
    expect(layout).toContain('icon: WalletCards')
    expect(layout).not.toContain('Sparkles')
    expect(editorial).toContain('PanelRight')
    expect(editorial).not.toContain('Sparkles')
    expect(lodging).toContain('BrushCleaning')
    expect(wineClub).toContain('Coins')
    expect(wineClub).not.toMatch(/\bStar\b/)
  })
})
