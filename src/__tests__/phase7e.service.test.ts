import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  distributorsClient,
  inventoryClient,
  membershipsClient,
  shipmentsClient,
} from '../services/phase7e.service'

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('phase7e.service admin clients', () => {
  it('consulta Wine Club real con Authorization Bearer y filtros', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'membership-1', membershipNumber: 'MBR-1', status: 'active' }],
        pagination: { page: 1, perPage: 100, total: 1 },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await membershipsClient.list('jwt-admin', { status: 'active' })

    expect(response.data[0].membershipNumber).toBe('MBR-1')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/memberships?status=active',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })

  it('opera membresías y puntos contra endpoints administrativos', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'membership-1', status: 'active' } }, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await membershipsClient.create('jwt-admin', { customerId: 'customer-1', planId: 'plan-1' })
    await membershipsClient.action('jwt-admin', 'membership-1', 'pause', 'Pausa controlada')
    await membershipsClient.adjustLoyalty('jwt-admin', 'membership-1', { points: 10, reason: 'Ajuste' })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/memberships',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/memberships/membership-1/pause',
      expect.objectContaining({ body: expect.stringContaining('Pausa controlada') }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/memberships/membership-1/loyalty-adjustment',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('opera inventario real sin enviar tokens en query string', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'inventory-1', onHand: 10, reserved: 0 } }, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await inventoryClient.summary('jwt-admin', { lowStock: true })
    await inventoryClient.createLocation('jwt-admin', { name: 'Cava', type: 'warehouse' })
    await inventoryClient.updateItem('jwt-admin', 'inventory-1', { status: 'archived' })
    await inventoryClient.operation('jwt-admin', 'receive', { inventoryItemId: 'inventory-1', quantity: 10 })
    await inventoryClient.exportCsv('jwt-admin', { status: 'active' })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/inventory?lowStock=true',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }) }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/inventory/items/inventory-1',
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('archived') }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/api/admin/inventory/receive',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      5,
      'http://localhost:3001/api/admin/inventory/export?status=active',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-admin' } }),
    )
    expect(JSON.stringify(fetchSpy.mock.calls)).not.toContain('jwt-admin?')
  })

  it('opera logística y distribuidores con API administrativa real', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'operation-1', status: 'ok' } }, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await shipmentsClient.create('jwt-admin', { orderId: 'order-1', destination: 'Aguascalientes' })
    await shipmentsClient.status('jwt-admin', 'shipment-1', 'shipped', 'Guía registrada')
    await shipmentsClient.incident('jwt-admin', 'shipment-1', 'Incidencia controlada')
    await distributorsClient.create('jwt-admin', { name: 'Distribuidor controlado' })
    await distributorsClient.createOrder('jwt-admin', { distributorId: 'distributor-1', items: [] })
    await distributorsClient.orderAction('jwt-admin', 'order-1', 'approve')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/shipments',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/shipments/shipment-1/incident',
      expect.objectContaining({ body: expect.stringContaining('Incidencia controlada') }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      6,
      'http://localhost:3001/api/admin/distributor-orders/order-1/approve',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('bloquea llamadas administrativas sin sesión', () => {
    expect(() => membershipsClient.list(null)).toThrow()
    expect(() => inventoryClient.summary(null)).toThrow()
    expect(() => shipmentsClient.list(null)).toThrow()
    expect(() => distributorsClient.list(null)).toThrow()
  })
})
