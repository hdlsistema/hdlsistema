import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ciclo de inventario por compras', () => {
  it('descuenta al pagar y devuelve o libera inventario al cerrar la orden', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/072_order_inventory_purchase_lifecycle.sql'), 'utf8')

    expect(migration).toContain("new.status not in ('paid', 'cancelled', 'refunded', 'fulfilled')")
    expect(migration).toContain("jsonb_build_object('inventoryState', 'reserved'")
    expect(migration).toContain("'sale'")
    expect(migration).toContain("'Compra pagada'")
    expect(migration).toContain("jsonb_build_object('inventoryState', v_target_state")
    expect(migration).toContain("jsonb_build_object('inventoryState', 'released'")
    expect(migration).toContain("jsonb_build_object('inventoryState', 'returned'")
  })

  it('guarda trazabilidad de actor y estado antes/despues en movimientos automaticos', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/072_order_inventory_purchase_lifecycle.sql'), 'utf8')

    expect(migration).toContain("'actorId', auth.uid()")
    expect(migration).toContain("'stateBefore'")
    expect(migration).toContain("'stateAfter'")
    expect(migration).toContain("'orderItemId', new.id")
    expect(migration).toContain("'origin', 'orders'")
  })
})
