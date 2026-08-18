import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { shipmentStatusSchema } from '../src/modules/shipments/shipments.schemas'

describe('transiciones de estado de envíos', () => {
  it('acepta los estados de seguimiento usados por órdenes y logística', () => {
    expect(shipmentStatusSchema.parse('pending_preparation')).toBe('pending_preparation')
    expect(shipmentStatusSchema.parse('awaiting_tracking')).toBe('awaiting_tracking')
    expect(shipmentStatusSchema.parse('tracking_assigned')).toBe('tracking_assigned')
  })

  it('permite confirmar una entrega desde guía asignada', () => {
    const migration = readFileSync(
      resolve(__dirname, '../migrations/061_fix_shipment_status_transitions.sql'),
      'utf8',
    )

    expect(migration).toContain("p_status = 'delivered'")
    expect(migration).toContain("'tracking_assigned'")
    expect(migration).toContain("p_status in ('shipped', 'in_transit', 'delivered')")
    expect(migration).toContain("'shipment_status_updated'")
  })
})
