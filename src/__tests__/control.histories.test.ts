import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')

describe('historiales operativos del Centro de Control', () => {
  it('abre detalle de historial en ordenes con actor y datos antes/despues', () => {
    const page = readFileSync(resolve(root, 'app/pages/control/OrdersPage.tsx'), 'utf8')
    const service = readFileSync(resolve(root, '../backend/src/modules/orders/orders.service.ts'), 'utf8')

    expect(page).toContain('selectedHistoryItem')
    expect(page).toContain('OrderHistoryDialog')
    expect(page).toContain('HistorySummary')
    expect(page).toContain('Quién lo hizo')
    expect(page).toContain('Antes')
    expect(page).toContain('Después')
    expect(page).toContain('Usuario registrado')
    expect(page).not.toContain('JSON.stringify(value)')
    expect(page).not.toContain('Acción técnica')
    expect(service).toContain('actor_user_id,before_data,after_data')
    expect(service).toContain('actorName')
  })

  it('abre detalle de historial en reservaciones con actor y cambio de estado', () => {
    const page = readFileSync(resolve(root, 'app/pages/control/ReservationsPage.tsx'), 'utf8')
    const service = readFileSync(resolve(root, '../backend/src/modules/reservations/reservations.service.ts'), 'utf8')

    expect(page).toContain('selectedHistoryItem')
    expect(page).toContain('ReservationHistoryDialog')
    expect(page).toContain('HistorySummary')
    expect(page).toContain('Quién lo hizo')
    expect(page).toContain('Estado anterior')
    expect(page).toContain('Estado nuevo')
    expect(page).toContain('Usuario registrado')
    expect(page).not.toContain('Registro" value={item.id}')
    expect(service).toContain('changed_by')
    expect(service).toContain('actorName')
  })
})
