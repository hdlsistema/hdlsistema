import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('reserva de inventario para vinos sin control de existencias', () => {
  it('sale antes de reservar cuando stock_control_enabled está desactivado', () => {
    const migration = readFileSync(
      resolve(__dirname, '../migrations/050_respect_disabled_wine_stock_control.sql'),
      'utf8',
    )

    const guard = migration.indexOf('not coalesce(v_stock_control_enabled, false)')
    const reservation = migration.indexOf("v_remaining := new.quantity")

    expect(migration).toContain('select stock_control_enabled')
    expect(guard).toBeGreaterThan(-1)
    expect(reservation).toBeGreaterThan(guard)
    expect(migration).not.toMatch(/update\s+public\.wines/i)
  })
})

