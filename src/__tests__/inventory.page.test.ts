import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildInventoryMovementPayload } from '../app/pages/control/InventoryPage'

describe('InventoryPage movement payloads', () => {
  it('builds admin API payloads with the backend public contract', () => {
    const receive = buildInventoryMovementPayload('receive', 'inventory-1', 12, 'Compra directa', {
      idempotencyKey: 'move-1',
    })
    const adjust = buildInventoryMovementPayload('adjust', 'inventory-1', -2, 'Conteo fisico', {
      idempotencyKey: 'move-2',
    })
    const transfer = buildInventoryMovementPayload('transfer', 'inventory-1', 3, 'Cava a boutique', {
      toLocationId: 'location-2',
      idempotencyKey: 'move-3',
    })

    expect(receive).toEqual({
      inventoryItemId: 'inventory-1',
      idempotencyKey: 'move-1',
      quantity: 12,
      reason: 'Compra directa',
    })
    expect(adjust).toEqual({
      inventoryItemId: 'inventory-1',
      idempotencyKey: 'move-2',
      quantityDelta: -2,
      reason: 'Conteo fisico',
    })
    expect(transfer).toEqual({
      inventoryItemId: 'inventory-1',
      idempotencyKey: 'move-3',
      toLocationId: 'location-2',
      quantity: 3,
      reason: 'Cava a boutique',
    })
    expect(JSON.stringify([receive, adjust, transfer])).not.toContain('p_inventory_item_id')
    expect(JSON.stringify([receive, adjust, transfer])).not.toContain('p_quantity')
  })

  it('expone vista amplia por ubicaciones e historiales clicables', () => {
    const source = readFileSync(resolve(__dirname, '../app/pages/control/InventoryPage.tsx'), 'utf8')

    expect(source).toContain('Inventario amplio')
    expect(source).toContain('typeSummaries')
    expect(source).toContain('Todas las ubicaciones')
    expect(source).toContain('Bodega / almacén')
    expect(source).toContain('Cava')
    expect(source).toContain('Boutique')
    expect(source).toContain('Restaurante')
    expect(source).toContain('selectedMovementDetail')
    expect(source).toContain('item.imageUrl')
    expect(source).toContain('object-cover')
    expect(source).toContain('Quién lo hizo')
    expect(source).toContain('stateBefore')
    expect(source).toContain('stateAfter')
    expect(source).toContain('ActionIconButton')
    expect(source).toContain('aria-label={label}')
    expect(source).toContain('ControlConfirmDialog')
    expect(source).toContain('requestArchiveItem')
    expect(source).toContain("status: 'archived'")
    expect(source).toContain('Trash2')
    expect(source).not.toContain('Detalle técnico')
  })
})
