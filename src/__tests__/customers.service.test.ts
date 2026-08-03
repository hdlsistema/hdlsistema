import { afterEach, describe, expect, it, vi } from 'vitest'
import { customersClient } from '../services/customers.service'

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

describe('customers.service CRM admin client', () => {
  it('lista clientes reales con Authorization Bearer y filtros', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [{ id: 'customer-1', displayName: 'Cliente Real', segment: 'vip' }],
        pagination: { page: 1, perPage: 100, total: 1 },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customersClient.list('jwt-admin', { search: 'real', segment: 'vip' })

    expect(response.data[0].displayName).toBe('Cliente Real')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/customers?search=real&segment=vip',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })

  it('bloquea llamadas administrativas sin sesión', () => {
    expect.assertions(1)
    try {
      customersClient.create(null, { firstName: 'QA', email: 'qa@example.com' })
    } catch (error) {
      expect(error).toMatchObject({ status: 401 })
    }
  })

  it('crea y edita clientes sin enviar datos falsos al producto', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'customer-2' } }, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customersClient.create('jwt-admin', {
      firstName: 'Cliente',
      lastName: 'Operativo',
      email: 'cliente@example.com',
      marketingEmailConsent: true,
    })
    await customersClient.update('jwt-admin', 'customer-2', { segment: 'recurrente' })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/customers',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('Operativo') }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/customers/customer-2',
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('recurrente') }),
    )
  })

  it('opera notas, etiquetas y exportación contra endpoints CRM reales', async () => {
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ ok: true, data: { id: 'note-1' } })),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await customersClient.addNote('jwt-admin', 'customer-1', 'Seguimiento real')
    await customersClient.assignTag('jwt-admin', 'customer-1', 'tag-1')
    await customersClient.unassignTag('jwt-admin', 'customer-1', 'tag-1')
    await customersClient.exportCsv('jwt-admin', { consent: 'email' })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/customers/customer-1/notes',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/customers/customer-1/tags',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/customers/customer-1/tags/tag-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/api/admin/customers/export?consent=email',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
      }),
    )
  })
})
