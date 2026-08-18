import { describe, expect, it } from 'vitest'
import { statusLabel } from '../app/pages/control/controlCopy'
import { shipmentActionsFor } from '../app/pages/control/phase7e/operationsUtils'

describe('flujo de estados de logística', () => {
  it('presenta la guía asignada con una etiqueta reconocida', () => {
    expect(statusLabel('tracking_assigned')).toBe('Guía asignada')
  })

  it('permite entregar desde guía asignada sin ofrecer regresiones de estado', () => {
    expect(shipmentActionsFor('tracking_assigned')).toEqual([
      'shipped',
      'in_transit',
      'delivered',
      'cancelled',
    ])
  })

  it('no ofrece acciones para estados terminales', () => {
    expect(shipmentActionsFor('delivered')).toEqual([])
    expect(shipmentActionsFor('returned')).toEqual([])
    expect(shipmentActionsFor('cancelled')).toEqual([])
  })
})
