import { afterEach, describe, expect, it, vi } from 'vitest'
import { accessPassClient, checkinsClient, ordersClient, paymentsClient } from '../services/commerce.service'

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

describe('commerce.service phase 7D clients', () => {
  it('consulta órdenes reales con Authorization Bearer y filtros', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: [{ id: 'order-1', orderNumber: 'ORD-1', total: 1200 }], pagination: { page: 1, perPage: 100, total: 1 } }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await ordersClient.list('jwt-admin', { status: 'paid' })

    expect(response.data[0].orderNumber).toBe('ORD-1')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/orders?status=paid',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })

  it('crea orden, registra pago manual y reembolso contra endpoints admin', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'ok' } }, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await ordersClient.create('jwt-admin', { customerId: 'customer-1', items: [] })
    await paymentsClient.manual('jwt-admin', { orderId: 'order-1', amount: 100, paymentReference: 'REF' })
    await paymentsClient.refund('jwt-admin', 'payment-1', { amount: 50, reason: 'Ajuste' })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/orders',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/payments/manual',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/payments/payment-1/refund',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('valida QR, registra check-in y reversión sin exponer hash en el cliente', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { valid: true, accessPassId: 'pass-1' } })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await accessPassClient.validate('jwt-admin', 'hdl_token')
    await checkinsClient.register('jwt-admin', { accessPassId: 'pass-1' })
    await checkinsClient.reverse('jwt-admin', 'checkin-1', 'Corrección')

    expect(JSON.stringify(fetchSpy.mock.calls)).not.toContain('qr_token_hash')
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/access-passes/validate',
      expect.objectContaining({ body: JSON.stringify({ code: 'hdl_token' }) }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/checkins',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/checkins/checkin-1/reverse',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('bloquea llamadas administrativas sin sesión', () => {
    expect(() => ordersClient.list(null)).toThrow()
    expect(() => paymentsClient.manual(null, {})).toThrow()
    expect(() => accessPassClient.issue(null, {})).toThrow()
  })

  it('exporta CSV desde endpoints reales sin incluir tokens en query', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('order_number\nORD-1', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    await ordersClient.exportCsv('jwt-admin')
    await paymentsClient.exportCsv('jwt-admin')
    await checkinsClient.exportCsv('jwt-admin')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/orders/export',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-admin' } }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/payments/export',
      expect.any(Object),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/checkins/export',
      expect.any(Object),
    )
  })
})
