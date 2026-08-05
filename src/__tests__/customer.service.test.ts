import { afterEach, describe, expect, it, vi } from 'vitest'
import { customerClient } from '../services/customer.service'

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

describe('customer.service client', () => {
  it('usa endpoints customer con Authorization Bearer', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'slot-1', available: 6, price: 450 }],
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customerClient.availability('jwt-customer', { experienceId: 'experience-1' })

    expect(response.data[0].available).toBe(6)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/availability?experienceId=experience-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-customer',
        }),
      }),
    )
  })

  it('crea reservación sin enviar customer_id desde frontend', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { id: 'reservation-1' } }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customerClient.createReservation('jwt-customer', {
      experienceSlotId: 'slot-1',
      peopleCount: 2,
      language: 'es',
      idempotencyKey: 'fase8b-idempotency',
    })

    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/reservations',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(String(request?.body)).toContain('fase8b-idempotency')
    expect(String(request?.body)).not.toContain('customer_id')
    expect(String(request?.body)).not.toContain('customerId')
  })

  it('rechaza llamadas customer sin sesión localmente', () => {
    expect.assertions(1)
    try {
      customerClient.me(null)
    } catch (error) {
      expect(error).toMatchObject({ status: 401 })
    }
  })

  it('propaga 403 para customer sin permiso administrativo', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403, statusText: 'Forbidden' }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await expect(customerClient.reservations('jwt-customer')).rejects.toMatchObject({ status: 403 })
  })

  it('usa endpoints customer de carrito sin enviar precio ni customerId', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { id: 'cart-1', items: [], totals: { total: 0 } } }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customerClient.addCartItem('jwt-customer', {
      itemType: 'wine',
      itemId: '11111111-1111-4111-8111-111111111111',
      quantity: 1,
      idempotencyKey: 'fase8c-cart-item',
    })

    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/cart/items',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer jwt-customer' })
    expect(String(request?.body)).toContain('fase8c-cart-item')
    expect(String(request?.body)).not.toContain('customerId')
    expect(String(request?.body)).not.toContain('unitPrice')
    expect(String(request?.body)).not.toContain('total')
  })

  it('crea orden customer con pending_payment preparado sin token en URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { id: 'order-1', status: 'pending_payment', paymentAvailable: false } }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customerClient.createOrder('jwt-customer', {
      idempotencyKey: 'fase8c-order',
      discountCode: 'QA8C',
    })

    expect(response.data.status).toBe('pending_payment')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/orders',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy.mock.calls[0]?.[0]).not.toContain('jwt-customer')
  })

  it('crea payment-session sin enviar amount, currency ni customerId desde frontend', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          orderId: 'order-1',
          provider: 'stripe',
          clientSecret: 'pi_mock_secret_client',
        },
      }, { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customerClient.paymentSession('jwt-customer', 'order-1')

    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/orders/order-1/payment-session',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(request?.headers).toMatchObject({ Authorization: 'Bearer jwt-customer' })
    expect(String(request?.body)).not.toContain('amount')
    expect(String(request?.body)).not.toContain('currency')
    expect(String(request?.body)).not.toContain('customerId')
  })

  it('consulta payment-status y retry-payment por endpoints customer', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { orderId: 'order-1', paymentStatus: 'processing' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { orderId: 'order-1', provider: 'stripe' } }, { status: 201 }))
    vi.stubGlobal('fetch', fetchSpy)

    await customerClient.paymentStatus('jwt-customer', 'order-1')
    await customerClient.retryPayment('jwt-customer', 'order-1')

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/customer/orders/order-1/payment-status')
    expect(fetchSpy.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/customer/orders/order-1/retry-payment')
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-customer' }) })
  })

  it('lista órdenes customer y permite actualizar cantidad por endpoint propio', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: [{ id: 'order-1', orderNumber: 'ORD-1' }] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { id: 'cart-1', items: [{ id: 'item-1', quantity: 3 }] } }))
    vi.stubGlobal('fetch', fetchSpy)

    const orders = await customerClient.orders('jwt-customer')
    const cart = await customerClient.updateCartItem('jwt-customer', 'item-1', {
      quantity: 3,
      idempotencyKey: 'fase8c-update',
    })

    expect(orders.data[0].orderNumber).toBe('ORD-1')
    expect(cart.data.items[0].quantity).toBe(3)
    expect(fetchSpy.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/customer/cart/items/item-1')
  })
})
