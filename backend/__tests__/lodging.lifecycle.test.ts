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
})
