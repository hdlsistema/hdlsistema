import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { restaurantCatalogSchema } from '../src/modules/commercial/commercial.schemas'
import { createEventTicketTypeSchema } from '../src/modules/content/eventTickets.schemas'

describe('flujo punta a punta de boletos y horarios comerciales', () => {
  it('valida tipos de boleto y ventanas de venta', () => {
    const valid = createEventTicketTypeSchema.parse({
      name: 'Entrada general',
      price: 850,
      capacity: 40,
      status: 'published',
      visible_in_app: true,
      active: true,
      sales_start_at: '2026-09-01T12:00:00.000Z',
      sales_end_at: '2026-09-20T12:00:00.000Z',
    })
    expect(valid.capacity).toBe(40)
    expect(() => createEventTicketTypeSchema.parse({
      name: 'Entrada general',
      price: 850,
      capacity: 40,
      sales_start_at: '2026-09-20T12:00:00.000Z',
      sales_end_at: '2026-09-01T12:00:00.000Z',
    })).toThrow()
  })

  it('impide publicar reservaciones de restaurante sin horarios del Centro', () => {
    const base = {
      slug: 'restaurante-principal',
      name: 'Restaurante principal',
      status: 'published' as const,
      visibleInApp: true,
      reservationEnabled: true,
      verificationStatus: 'verified' as const,
      coverImageUrl: null,
      sortOrder: 0,
      hours: {},
    }
    expect(() => restaurantCatalogSchema.parse({ ...base, metadata: { managedBy: 'control_center' } })).toThrow()
    expect(restaurantCatalogSchema.parse({ ...base, metadata: { reservationTimes: ['13:00', '15:30'] } }).metadata).toMatchObject({ reservationTimes: ['13:00', '15:30'] })
  })

  it('reserva inventario de boleto atomico y conserva vigencia del QR', () => {
    const inventory = readFileSync(resolve(__dirname, '../migrations/051_event_ticket_inventory_flow.sql'), 'utf8')
    const reservationTypes = readFileSync(resolve(__dirname, '../migrations/052_customer_reservation_type_flow.sql'), 'utf8')
    const passIssuer = readFileSync(resolve(__dirname, '../src/modules/checkin/accessPassIssuer.ts'), 'utf8')
    const checkinService = readFileSync(resolve(__dirname, '../src/modules/checkin/checkin.service.ts'), 'utf8')

    expect(inventory).toContain('event_ticket_allocations')
    expect(inventory).toContain('reserve_event_ticket_after_order_item')
    expect(inventory).toContain('settle_event_ticket_after_order_status')
    expect(inventory).toContain('v_event.capacity - v_event.sold_count - v_event.reserved_count')
    expect(inventory).toContain("'eventEndsAt', v_event.end_at")
    expect(passIssuer).toContain('validUntil: eventEndsAt')
    expect(checkinService).toContain('ticketEvent?.title')
    expect(checkinService).toContain('ticketTypeName: ticketType?.name')
    expect(reservationTypes).toContain("v_reservation.reservation_type = 'cabin'")
    expect(reservationTypes).toContain("v_reservation.reservation_type <> 'experience'")
    expect(reservationTypes).toContain('RESERVATION_EXPERIENCE_MISMATCH')
  })

  it('liga reserva, pago, cupo y QR sin confirmar antes del cobro', () => {
    const paidReservations = readFileSync(resolve(__dirname, '../migrations/053_paid_experience_reservation_flow.sql'), 'utf8')
    const paymentService = readFileSync(resolve(__dirname, '../src/modules/payments/payments.service.ts'), 'utf8')
    const reservationService = readFileSync(resolve(__dirname, '../src/modules/customer/customer.service.ts'), 'utf8')

    expect(paidReservations).toContain('create or replace function public.get_bookable_experience_slots')
    expect(paidReservations).toContain('perform public.release_expired_experience_payment_holds()')
    expect(paidReservations).toContain("now() + interval '30 minutes'")
    expect(paidReservations).toContain("'checkoutMode', 'experience_reservation'")
    expect(paidReservations).toContain('sync_paid_experience_reservation_after_order')
    expect(paidReservations).toContain("set status = 'confirmed'")
    expect(paidReservations).toContain('confirmed_count = confirmed_count + v_reservation.people_count')
    expect(paymentService).toContain('ensureReservationAccessPassForPaidOrder(order.id)')
    expect(reservationService).toContain('paymentOrderId')
  })
})
