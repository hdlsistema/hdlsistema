import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lodgingReschedulePayloadSchema } from '../src/modules/lodging/lodging.schemas'

describe('ciclo operativo hotelero', () => {
  it('valida la carga de reprogramación sin aceptar campos inesperados', () => {
    expect(lodgingReschedulePayloadSchema.parse({
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      unitId: null,
    })).toEqual({ checkIn: '2026-09-10', checkOut: '2026-09-13', unitId: null })
    expect(() => lodgingReschedulePayloadSchema.parse({
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      provider: 'externo',
    })).toThrow()
  })

  it('mantiene reprogramación, exclusión de fechas y aforo hotelero en transacciones SQL', () => {
    const base = readFileSync(resolve(__dirname, '../migrations/040_lodging_operations.sql'), 'utf8')
    const lifecycle = readFileSync(resolve(__dirname, '../migrations/043_lodging_reservation_lifecycle.sql'), 'utf8')
    const routes = readFileSync(resolve(__dirname, '../src/modules/lodging/lodging.routes.ts'), 'utf8')

    expect(base).toContain('lodging_calendar_no_overlap')
    expect(base).toContain("daterange(start_date, end_date, '[)')")
    expect(lifecycle).toContain('create or replace function public.reschedule_lodging_reservation')
    expect(lifecycle).toContain("v_reservation.reservation_type = 'cabin'")
    expect(lifecycle).toContain('p_people_count > v_unit.capacity')
    expect(lifecycle).toContain('subtotal = v_total')
    expect(lifecycle).toContain('Estancia reprogramada')
    expect(routes).toContain("'/lodging/stays/:reservationId/reschedule'")
  })

  it('bloquea solicitudes hasta resolución y recalcula noches y total desde el rango real', () => {
    const production = readFileSync(resolve(__dirname, '../migrations/046_lodging_inventory_and_official_locations.sql'), 'utf8')

    expect(production).toContain('v_requested_nights := p_check_out - p_check_in')
    expect(production).toContain('v_total := coalesce(v_package.price, 0) * v_package_units')
    expect(production).toContain("daterange(entry.start_date, entry.end_date, '[)') && daterange(p_check_in, p_check_out, '[)')")
    expect(production).toContain("expires_at = null")
    expect(production).toContain("'bookingMode', 'CONFIRMATION_HOLD'")
    expect(production).toContain("comment on constraint lodging_calendar_no_overlap")
  })
})
