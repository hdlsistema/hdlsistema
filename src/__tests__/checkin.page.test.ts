import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCheckinEventGroups,
  occupancyPercent,
  sourceLabel,
  type CheckinEventGroup,
} from '../app/pages/control/CheckInPage'
import type { AccessPassRecord, CheckinRecord } from '../services/commerce.service'

describe('CheckInPage event dashboard', () => {
  it('agrupa pases reales por evento con imagen, capacidad, origen y total unico del ticket', () => {
    const passes: AccessPassRecord[] = [
      {
        id: 'pass-1',
        orderId: 'order-1',
        eventId: 'event-1',
        accessType: 'event_ticket',
        passNumber: 'PASS-1',
        orderNumber: 'ORD-1',
        guestName: 'Patty Garibay',
        eventOrExperience: 'Vendimia Premium',
        eventImageUrl: 'https://cdn.hacienda.test/evento.webp',
        eventCapacity: 100,
        eventStartsAt: '2026-08-23T21:00:00.000Z',
        eventEndsAt: '2026-08-23T23:00:00.000Z',
        purchaseSource: 'mobile_app',
        purchasedAt: '2026-08-20T10:00:00.000Z',
        orderTotal: 900,
        peopleCount: 1,
        status: 'published',
        issuedAt: '2026-08-20T10:01:00.000Z',
      },
      {
        id: 'pass-2',
        orderId: 'order-1',
        eventId: 'event-1',
        accessType: 'event_ticket',
        passNumber: 'PASS-2',
        orderNumber: 'ORD-1',
        guestName: 'Patty Garibay',
        eventOrExperience: 'Vendimia Premium',
        eventImageUrl: 'https://cdn.hacienda.test/evento.webp',
        eventCapacity: 100,
        purchaseSource: 'mobile_app',
        purchasedAt: '2026-08-20T10:00:00.000Z',
        orderTotal: 900,
        peopleCount: 1,
        status: 'published',
        issuedAt: '2026-08-20T10:02:00.000Z',
      },
    ]
    const checkins: CheckinRecord[] = [
      {
        id: 'checkin-1',
        accessPassId: 'pass-1',
        passNumber: 'PASS-1',
        guestName: 'Patty Garibay',
        eventId: 'event-1',
        eventOrExperience: 'Vendimia Premium',
        eventImageUrl: 'https://cdn.hacienda.test/evento.webp',
        eventCapacity: 100,
        purchaseSource: 'mobile_app',
        orderNumber: 'ORD-1',
        orderTotal: 900,
        checkedInAt: '2026-08-23T21:15:00.000Z',
        status: 'active',
      },
    ]

    const [group] = buildCheckinEventGroups(passes, checkins) as CheckinEventGroup[]

    expect(group.title).toBe('Vendimia Premium')
    expect(group.imageUrl).toBe('https://cdn.hacienda.test/evento.webp')
    expect(group.capacity).toBe(100)
    expect(group.checkedIn).toBe(1)
    expect(group.occupancy).toBe(1)
    expect(group.sources).toEqual(['App'])
    expect(group.ticketTotal).toBe(900)
  })

  it('mantiene textos compactos, tarjetas cuadradas y sin degradados/verdes', () => {
    const source = readFileSync(resolve(__dirname, '../app/pages/control/CheckInPage.tsx'), 'utf8')
    const styles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')
    const checkinStyles = styles
      .slice(styles.indexOf('.control-checkin-event-grid'))
      .split('.control-customer-card')[0]

    expect(occupancyPercent(80, 100)).toBe(80)
    expect(sourceLabel('public_web')).toBe('Web')
    expect(sourceLabel('Centro de control')).toBe('Hacienda')
    expect(source).toContain('control-checkin-event-grid')
    expect(source).toContain('eventImageUrl')
    expect(source).toContain('/control/eventos-magnos?recordId=')
    expect(source).toContain('Editar evento')
    expect(source).toContain('Historial de compra y vigencia')
    expect(source).toContain('QR {checkin.passNumber')
    expect(checkinStyles).toContain('aspect-ratio: 1 / 1')
    expect(checkinStyles).toContain('#681126')
    expect(checkinStyles).toContain('#F7F2EA')
    expect(checkinStyles).toContain('#B48A55')
    expect(checkinStyles).toContain('#252F37')
    expect(checkinStyles).toContain('#E8D8C8')
    expect(`${source}\n${checkinStyles}`).not.toContain('linear-gradient')
    expect(`${source}\n${checkinStyles}`.toLowerCase()).not.toContain('green')
  })
})
