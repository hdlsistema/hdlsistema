import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createApp } from '../src/app'
import { env } from '../src/config/env'
import { checkSupabaseReachable } from '../src/config/supabase'
import { errorHandler, type AppError } from '../src/middleware/errorHandler'
import { canAccessContent } from '../src/modules/content/content.permissions'
import { parseContentPatch } from '../src/modules/content/content.schemas'
import { execSync } from 'child_process'
import { resolve } from 'path'

const supabaseMock = vi.hoisted(() => ({
  error: null as unknown,
  throwError: null as unknown,
  rpcError: null as unknown,
  rpcData: {} as Record<string, unknown>,
  authUser: null as { id: string; email: string; created_at: string; email_confirmed_at: string | null } | null,
  tableData: {} as Record<string, unknown[]>,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => {
        if (!supabaseMock.authUser) {
          return { data: { user: null }, error: new Error('invalid token') }
        }
        return { data: { user: supabaseMock.authUser }, error: null }
      }),
      admin: {
        listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
        getUserById: vi.fn(async () => ({ data: { user: null }, error: new Error('not found') })),
        createUser: vi.fn(async () => ({ data: { user: null }, error: new Error('blocked') })),
        updateUserById: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    },
    from: vi.fn((table: string) => {
      const state = {
        table,
        filters: [] as Array<{ column: string; value: unknown }>,
        nullFilters: [] as string[],
        inFilters: [] as Array<{ column: string; values: unknown[] }>,
        operation: 'select' as 'select' | 'insert' | 'update' | 'delete' | 'upsert',
        payload: null as unknown,
      }
      const run = () => {
        if (supabaseMock.throwError) throw supabaseMock.throwError
        if (supabaseMock.error) return { data: null, error: supabaseMock.error, count: null }
        const rows = [...(supabaseMock.tableData[state.table] ?? [])]
        const data = rows.filter((row) => {
          if (!row || typeof row !== 'object') return false
          const record = row as Record<string, unknown>
          return state.filters.every((filter) => record[filter.column] === filter.value) &&
            state.nullFilters.every((column) => record[column] === null || record[column] === undefined) &&
            state.inFilters.every((filter) => filter.values.includes(record[filter.column]))
        })
        return { data, error: null, count: data.length }
      }
      const payloadRecord = () => {
        const payload = Array.isArray(state.payload) ? state.payload[0] : state.payload
        return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
      }
      const insertRecord = () => {
        const next = {
          id: '00000000-0000-0000-0000-000000000099',
          created_at: '2026-08-03T00:00:00.000Z',
          updated_at: '2026-08-03T00:00:00.000Z',
          ...payloadRecord(),
        }
        supabaseMock.tableData[state.table] = [...(supabaseMock.tableData[state.table] ?? []), next]
        return next
      }
      const updateRecord = () => {
        const rows = [...(supabaseMock.tableData[state.table] ?? [])]
        const patch = payloadRecord()
        const index = rows.findIndex((row) => {
          if (!row || typeof row !== 'object') return false
          const record = row as Record<string, unknown>
          return state.filters.every((filter) => record[filter.column] === filter.value)
        })
        const current = index >= 0 && rows[index] && typeof rows[index] === 'object'
          ? rows[index] as Record<string, unknown>
          : {}
        const next = {
          id: current.id ?? '00000000-0000-0000-0000-000000000099',
          created_at: current.created_at ?? '2026-08-03T00:00:00.000Z',
          updated_at: '2026-08-03T00:00:00.000Z',
          ...current,
          ...patch,
        }
        if (index >= 0) rows[index] = next
        else rows.push(next)
        supabaseMock.tableData[state.table] = rows
        return next
      }
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        insert: vi.fn((payload: unknown) => {
          state.operation = 'insert'
          state.payload = payload
          return builder
        }),
        update: vi.fn((payload: unknown) => {
          state.operation = 'update'
          state.payload = payload
          return builder
        }),
        delete: vi.fn(() => {
          state.operation = 'delete'
          return builder
        }),
        upsert: vi.fn((payload: unknown) => {
          state.operation = 'upsert'
          state.payload = payload
          return builder
        }),
        eq: vi.fn((column: string, value: unknown) => {
          state.filters.push({ column, value })
          return builder
        }),
        is: vi.fn((column: string, value: unknown) => {
          if (value === null) state.nullFilters.push(column)
          return builder
        }),
        in: vi.fn((column: string, values: unknown[]) => {
          state.inFilters.push({ column, values })
          return builder
        }),
        lte: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        or: vi.fn(() => builder),
        order: vi.fn(() => builder),
        range: vi.fn(async () => run()),
        limit: vi.fn(() => builder),
        abortSignal: vi.fn(async () => {
          if (supabaseMock.throwError) throw supabaseMock.throwError
          return { data: [], error: supabaseMock.error }
        }),
        then: vi.fn((resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(
            state.operation === 'insert'
              ? { data: insertRecord(), error: null, count: 1 }
              : state.operation === 'update'
                ? { data: updateRecord(), error: null, count: 1 }
                : run(),
          ).then(resolve, reject),
        ),
        maybeSingle: vi.fn(async () => {
          const result = run()
          return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : null }
        }),
        single: vi.fn(async () => {
          if (supabaseMock.throwError) throw supabaseMock.throwError
          if (supabaseMock.error) return { data: null, error: supabaseMock.error }
          if (state.operation === 'insert') return { data: insertRecord(), error: null }
          if (state.operation === 'update') return { data: updateRecord(), error: null }
          if (state.operation === 'delete') {
            const data = run().data
            return { data: Array.isArray(data) ? data[0] ?? null : null, error: null }
          }
          return { data: run().data?.[0] ?? { id: '00000000-0000-0000-0000-000000000099' }, error: null }
        }),
      }
      return builder
    }),
    rpc: vi.fn(async (name: string) => {
      if (supabaseMock.throwError) throw supabaseMock.throwError
      if (supabaseMock.rpcError) return { data: null, error: supabaseMock.rpcError }
      return { data: supabaseMock.rpcData[name] ?? '00000000-0000-0000-0000-000000000099', error: null }
    }),
  })),
}))

const app = createApp()
const originalSupabaseUrl = env.SUPABASE_URL
const originalSupabaseAnonKey = env.SUPABASE_ANON_KEY
const originalSupabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

beforeEach(() => {
  supabaseMock.error = null
  supabaseMock.throwError = null
  supabaseMock.rpcError = null
  supabaseMock.rpcData = {}
  supabaseMock.authUser = null
  supabaseMock.tableData = {}
  ;(env as Record<string, string>).SUPABASE_URL = originalSupabaseUrl
  ;(env as Record<string, string>).SUPABASE_ANON_KEY = originalSupabaseAnonKey
  ;(env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY =
    originalSupabaseServiceRoleKey
})

// ─── 1. GET /api/health devuelve 200 ────────────────────────────────────────
describe('GET /api/health', () => {
  it('devuelve 200 con estructura correcta', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.service).toBe('Hacienda de Letras API')
    expect(typeof res.body.timestamp).toBe('string')
    expect(typeof res.body.supabase?.configured).toBe('boolean')
    expect(typeof res.body.supabase?.reachable).toBe('boolean')
    expect(typeof res.body.supabase?.healthy).toBe('boolean')
    expect(typeof res.body.supabase?.status).toBe('string')
  })

  it('reporta Supabase ok cuando la consulta técnica no devuelve error', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.supabase).toMatchObject({
      configured: true,
      reachable: true,
      healthy: true,
      status: 'ok',
    })
  })

  it('reporta configuración faltante sin llamar la consulta técnica', async () => {
    try {
      ;(env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY = ''

      const res = await request(app).get('/api/health')

      expect(res.body.supabase).toMatchObject({
        configured: false,
        reachable: false,
        healthy: false,
        status: 'missing_configuration',
      })
    } finally {
      ;(env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY =
        originalSupabaseServiceRoleKey
    }
  })
})

describe('checkSupabaseReachable', () => {
  it('clasifica 42P01 como tabla faltante, no healthy', async () => {
    supabaseMock.error = { code: '42P01' }
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: true,
      healthy: false,
      status: 'table_missing',
    })
  })

  it('clasifica 42501 como permiso denegado, no healthy', async () => {
    supabaseMock.error = { code: '42501' }
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: true,
      healthy: false,
      status: 'permission_denied',
    })
  })

  it('clasifica error de autenticación', async () => {
    supabaseMock.error = { status: 401, message: 'Invalid JWT' }
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: true,
      healthy: false,
      status: 'authentication_failed',
    })
  })

  it('clasifica timeout', async () => {
    supabaseMock.throwError = new Error('request timeout')
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: false,
      healthy: false,
      status: 'timeout',
    })
  })

  it('clasifica error de red', async () => {
    supabaseMock.throwError = new TypeError('fetch failed')
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: false,
      healthy: false,
      status: 'network_error',
    })
  })
})

describe('Fase 3 auth API', () => {
  it('/api/auth/me rechaza solicitudes sin bearer token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('/api/auth/me devuelve usuario seguro con bearer token valido', async () => {
    supabaseMock.authUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'cliente.prueba@alqia.tech',
      created_at: '2026-07-31T00:00:00.000Z',
      email_confirmed_at: '2026-07-31T00:00:00.000Z',
    }

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'cliente.prueba@alqia.tech',
      emailVerified: true,
    })
    expect(JSON.stringify(res.body)).not.toContain('valid-token')
    expect(JSON.stringify(res.body)).not.toContain('refresh')
  })

  it('/api/admin/users requiere autenticación', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('Fase 4B content API', () => {
  it('rechaza endpoints editoriales administrativos sin sesión', async () => {
    const res = await request(app).get('/api/admin/wines')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('bloquea customer en endpoints editoriales administrativos', async () => {
    supabaseMock.authUser = {
      id: '00000000-0000-0000-0000-000000000010',
      email: 'cliente.prueba@alqia.tech',
      created_at: '2026-07-31T00:00:00.000Z',
      email_confirmed_at: '2026-07-31T00:00:00.000Z',
    }
    supabaseMock.tableData.user_roles = [{ roles: { code: 'customer' } }]

    const res = await request(app)
      .get('/api/admin/wines')
      .set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('valida payloads estrictos por entidad', () => {
    expect(() => parseContentPatch('wines', { name: 'Gran Reserva', is_admin: true })).toThrow()
    expect(parseContentPatch('wines', { name: 'Gran Reserva', locale: 'es-MX' })).toMatchObject({
      name: 'Gran Reserva',
      locale: 'es-MX',
    })
  })

  it('mantiene allowlist de permisos editoriales por rol', () => {
    expect(canAccessContent(['viewer'], 'wine', 'read')).toBe(true)
    expect(canAccessContent(['viewer'], 'wine', 'update')).toBe(false)
    expect(canAccessContent(['customer'], 'wine', 'read')).toBe(false)
    expect(canAccessContent(['marketing'], 'promotion', 'publish')).toBe(true)
    expect(canAccessContent(['operations'], 'promotion', 'publish')).toBe(false)
    expect(canAccessContent(['super_admin'], 'campaign', 'delete')).toBe(true)
  })

  it('devuelve contenido público con caché corta y sin credenciales', async () => {
    supabaseMock.tableData.wines = [
      {
        id: '00000000-0000-0000-0000-000000000020',
        slug: 'vino-publico',
        name: 'Vino Público',
        status: 'published',
        locale: 'es-MX',
      },
    ]

    const res = await request(app).get('/api/public/wines')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['cache-control']).toContain('max-age=60')
    expect(JSON.stringify(res.body)).not.toContain('SERVICE_ROLE')
    expect(JSON.stringify(res.body)).not.toContain('eyJhbGci')
  })

  it('rechaza entidades públicas no permitidas', async () => {
    const res = await request(app).get('/api/public/system-settings')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('aplica rate limit a preview', async () => {
    let lastStatus = 0
    for (let i = 0; i < 61; i += 1) {
      const res = await request(app).get('/api/preview/token-invalido-fase-4b')
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})

describe('Fase 7B operations API', () => {
  const adminUser = {
    id: '11111111-1111-4111-8111-111111111070',
    email: 'admin@alqia.tech',
    created_at: '2026-07-31T00:00:00.000Z',
    email_confirmed_at: '2026-07-31T00:00:00.000Z',
  }

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  it('rechaza disponibilidad administrativa sin sesión', async () => {
    const res = await request(app).get('/api/admin/availability')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('bloquea customer en disponibilidad administrativa', async () => {
    signInAs('customer')
    const res = await request(app)
      .get('/api/admin/availability')
      .set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('permite lectura real de slots a viewer', async () => {
    signInAs('viewer')
    supabaseMock.tableData.experiences = [
      {
        id: '11111111-1111-4111-8111-111111111071',
        title: 'Cata real',
        capacity: 12,
        visible_in_control: true,
      },
    ]
    supabaseMock.tableData.experience_slots = [
      {
        id: '11111111-1111-4111-8111-111111111072',
        experience_id: '11111111-1111-4111-8111-111111111071',
        start_at: '2026-08-10T18:00:00.000Z',
        end_at: '2026-08-10T20:00:00.000Z',
        capacity: 12,
        reserved_count: 3,
        confirmed_count: 3,
        waitlist_count: 0,
        status: 'published',
        is_bookable: true,
        operational_status: 'open',
        experiences: { title: 'Cata real', slug: 'cata-real', base_price: 650 },
      },
    ]

    const res = await request(app)
      .get('/api/admin/availability/slots')
      .set('Authorization', 'Bearer viewer-token')

    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111072',
      capacity: 12,
      confirmed: 3,
      available: 9,
      occupancy: 25,
    })
  })

  it('crea slot mediante RPC segura para operations', async () => {
    signInAs('operations')
    supabaseMock.rpcData.create_experience_slot = '11111111-1111-4111-8111-111111111073'
    supabaseMock.tableData.experience_slots = [
      {
        id: '11111111-1111-4111-8111-111111111073',
        experience_id: '11111111-1111-4111-8111-111111111071',
        start_at: '2026-08-11T18:00:00.000Z',
        end_at: '2026-08-11T20:00:00.000Z',
        capacity: 10,
        reserved_count: 0,
        confirmed_count: 0,
        waitlist_count: 0,
        status: 'published',
        is_bookable: true,
        operational_status: 'open',
        experiences: { title: 'Cata real', slug: 'cata-real', base_price: 650 },
      },
    ]

    const res = await request(app)
      .post('/api/admin/availability/slots')
      .set('Authorization', 'Bearer operations-token')
      .send({
        experienceId: '11111111-1111-4111-8111-111111111071',
        startAt: '2026-08-11T18:00:00.000Z',
        endAt: '2026-08-11T20:00:00.000Z',
        capacity: 10,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.available).toBe(10)
  })

  it('rechaza payload inválido al crear reservación', async () => {
    signInAs('operations')
    const res = await request(app)
      .post('/api/admin/reservations')
      .set('Authorization', 'Bearer operations-token')
      .send({ peopleCount: 0 })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('UNPROCESSABLE')
  })

  it('lista reservaciones reales con paginación', async () => {
    signInAs('operations')
    supabaseMock.tableData.reservations = [
      {
        id: '11111111-1111-4111-8111-111111111074',
        reservation_number: 'RES-FASE7B',
        customer_id: '11111111-1111-4111-8111-111111111075',
        reservation_type: 'experience',
        experience_id: '11111111-1111-4111-8111-111111111071',
        experience_slot_id: '11111111-1111-4111-8111-111111111072',
        people_count: 2,
        subtotal: 1300,
        discount_total: 0,
        tax_total: 0,
        total: 1300,
        currency: 'MXN',
        status: 'confirmed',
        source: 'Centro de control',
        operational_status: 'active',
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
        customers: { first_name: 'QA', last_name: 'Fase 7B', email: 'qa@example.com', phone: '555' },
        experiences: { title: 'Cata real', slug: 'cata-real' },
        experience_slots: {
          start_at: '2026-08-10T18:00:00.000Z',
          end_at: '2026-08-10T20:00:00.000Z',
          capacity: 12,
          reserved_count: 2,
          confirmed_count: 2,
        },
      },
    ]

    const res = await request(app)
      .get('/api/admin/reservations')
      .set('Authorization', 'Bearer operations-token')

    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({
      reservationNumber: 'RES-FASE7B',
      customerName: 'QA Fase 7B',
      available: 10,
    })
    expect(res.body.pagination.total).toBe(1)
  })

  it('clasifica sobrecupo como 409 sin ocultarlo', async () => {
    signInAs('operations')
    supabaseMock.rpcError = new Error('CAPACITY_EXCEEDED')

    const res = await request(app)
      .post('/api/admin/reservations/11111111-1111-4111-8111-111111111074/confirm')
      .set('Authorization', 'Bearer operations-token')

    expect(res.status).toBe(409)
    expect(res.body.error.message).toBe('No hay cupo suficiente')
  })
})

describe('Fase 7C customers CRM API', () => {
  const adminUser = {
    id: '22222222-2222-4222-8222-222222222070',
    email: 'admin@alqia.tech',
    created_at: '2026-08-03T00:00:00.000Z',
    email_confirmed_at: '2026-08-03T00:00:00.000Z',
  }
  const customerId = '22222222-2222-4222-8222-222222222071'
  const tagId = '22222222-2222-4222-8222-222222222072'

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  function seedCustomer() {
    supabaseMock.tableData.customers = [{
      id: customerId,
      customer_number: 'CUST-FASE7C',
      first_name: 'Cliente',
      last_name: 'CRM',
      display_name: 'Cliente CRM',
      email: 'cliente.crm@example.com',
      phone: '+524491234567',
      phone_normalized: '+524491234567',
      source: 'Centro de control',
      segment: 'vip',
      total_spend: 1000,
      total_visits: 2,
      status: 'published',
      marketing_email_consent: true,
      marketing_push_consent: false,
      preferred_language: 'es',
      archived_at: null,
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]
  }

  it('rechaza CRM administrativo sin sesión', async () => {
    const res = await request(app).get('/api/admin/customers')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('bloquea customer en CRM administrativo', async () => {
    signInAs('customer')

    const res = await request(app)
      .get('/api/admin/customers')
      .set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('permite lectura real de clientes a viewer sin exponer identificador auth', async () => {
    signInAs('viewer')
    seedCustomer()
    supabaseMock.tableData.customer_tag_assignments = [{
      customer_id: customerId,
      tag_id: tagId,
      customer_tags: {
        id: tagId,
        name: 'VIP',
        slug: 'vip',
        color: '#681126',
        status: 'published',
        created_at: '2026-08-03T00:00:00.000Z',
      },
    }]
    supabaseMock.tableData.orders = [{
      id: '22222222-2222-4222-8222-222222222073',
      customer_id: customerId,
      order_number: 'ORD-FASE7C',
      total: 1450,
      currency: 'MXN',
      status: 'paid',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.reservations = [{
      id: '22222222-2222-4222-8222-222222222074',
      customer_id: customerId,
      reservation_number: 'RES-FASE7C',
      people_count: 2,
      total: 1200,
      currency: 'MXN',
      status: 'confirmed',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]

    const res = await request(app)
      .get('/api/admin/customers')
      .set('Authorization', 'Bearer viewer-token')

    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({
      displayName: 'Cliente CRM',
      ordersCount: 1,
      reservationsCount: 1,
      totalSpend: 1450,
    })
    expect(JSON.stringify(res.body)).not.toContain('user_id')
  })

  it('crea cliente real desde CRM con normalización y auditoría', async () => {
    signInAs('operations')

    const res = await request(app)
      .post('/api/admin/customers')
      .set('Authorization', 'Bearer operations-token')
      .send({
        firstName: 'QA',
        lastName: 'Fase 7C',
        email: 'QA.FASE7C@example.com',
        phone: '+52 449 123 4567',
        marketingEmailConsent: true,
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      displayName: 'QA Fase 7C',
      email: 'qa.fase7c@example.com',
      marketingEmailConsent: true,
    })
    expect(supabaseMock.tableData.audit_logs?.length).toBeGreaterThan(0)
  })

  it('evita duplicados por correo o teléfono', async () => {
    signInAs('operations')
    seedCustomer()

    const res = await request(app)
      .post('/api/admin/customers')
      .set('Authorization', 'Bearer operations-token')
      .send({
        firstName: 'Duplicado',
        email: 'cliente.crm@example.com',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('edita segmento y consentimiento sin sobrescribir nombre visible', async () => {
    signInAs('operations')
    seedCustomer()

    const res = await request(app)
      .patch(`/api/admin/customers/${customerId}`)
      .set('Authorization', 'Bearer operations-token')
      .send({
        segment: 'recurrente',
        marketingPushConsent: true,
      })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      displayName: 'Cliente CRM',
      segment: 'recurrente',
      marketingPushConsent: true,
    })
  })

  it('valida payload y teléfono antes de escribir', async () => {
    signInAs('operations')

    const res = await request(app)
      .post('/api/admin/customers')
      .set('Authorization', 'Bearer operations-token')
      .send({
        firstName: 'QA',
        phone: '12',
      })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('UNPROCESSABLE')
  })

  it('opera notas y etiquetas con permisos administrativos', async () => {
    signInAs('marketing')
    seedCustomer()
    supabaseMock.tableData.customer_tags = [{
      id: tagId,
      name: 'Seguimiento',
      slug: 'seguimiento',
      color: '#681126',
      status: 'published',
      deleted_at: null,
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.customer_tag_assignments = [{ customer_id: customerId, tag_id: tagId }]

    const noteRes = await request(app)
      .post(`/api/admin/customers/${customerId}/notes`)
      .set('Authorization', 'Bearer marketing-token')
      .send({ note: 'Seguimiento comercial real' })
    const assignRes = await request(app)
      .post(`/api/admin/customers/${customerId}/tags`)
      .set('Authorization', 'Bearer marketing-token')
      .send({ tagId })
    const removeRes = await request(app)
      .delete(`/api/admin/customers/${customerId}/tags/${tagId}`)
      .set('Authorization', 'Bearer marketing-token')

    expect(noteRes.status).toBe(201)
    expect(assignRes.status).toBe(201)
    expect(removeRes.status).toBe(200)
  })

  it('exporta CSV sin UUIDs internos ni notas privadas', async () => {
    signInAs('finance')
    seedCustomer()

    const res = await request(app)
      .get('/api/admin/customers/export')
      .set('Authorization', 'Bearer finance-token')

    expect(res.status).toBe(200)
    expect(res.text).toContain('customer_number')
    expect(res.text).toContain('CUST-FASE7C')
    expect(res.text).not.toContain(customerId)
    expect(res.text).not.toContain('notes')
  })
})

// ─── 2. GET /api/version devuelve 200 ───────────────────────────────────────
describe('GET /api/version', () => {
  it('devuelve 200 con service y environment', async () => {
    const res = await request(app).get('/api/version')
    expect(res.status).toBe(200)
    expect(res.body.service).toBe('Hacienda de Letras API')
    expect(typeof res.body.version).toBe('string')
    expect(typeof res.body.environment).toBe('string')
  })
})

// ─── 3. GET /api/public/status devuelve 200 ─────────────────────────────────
describe('GET /api/public/status', () => {
  it('devuelve 200 con frontendConnection: true', async () => {
    const res = await request(app).get('/api/public/status')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.frontendConnection).toBe(true)
  })
})

// ─── 4. Ruta inexistente devuelve 404 JSON ───────────────────────────────────
describe('404 handler', () => {
  it('devuelve 404 JSON con formato uniforme', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe')
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(typeof res.body.error.message).toBe('string')
  })
})

// ─── 5. CORS acepta localhost ─────────────────────────────────────────────────
describe('CORS', () => {
  it('acepta localhost:5173', async () => {
    const res = await request(app)
      .get('/api/public/status')
      .set('Origin', 'http://localhost:5173')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  // ─── 6. CORS acepta dominio productivo ──────────────────────────────────────
  it('acepta dominio de producción', async () => {
    const res = await request(app)
      .get('/api/public/status')
      .set('Origin', 'https://admhaciendadeletras.com')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://admhaciendadeletras.com',
    )
  })

  // ─── 7. CORS rechaza dominio no autorizado ───────────────────────────────────
  it('rechaza origen no autorizado con 403', async () => {
    const res = await request(app)
      .get('/api/public/status')
      .set('Origin', 'https://evil.com')
    expect(res.status).toBe(403)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})

// ─── 8. Error handler oculta stack en producción ─────────────────────────────
describe('Error handler en producción', () => {
  it('oculta stack trace y muestra mensaje genérico', async () => {
    const testApp = express()
    testApp.get('/boom', (_req, _res, next) => {
      const err = new Error('Detalle interno crítico') as AppError
      err.statusCode = 500
      next(err)
    })
    testApp.use(errorHandler)

    // Simular producción temporalmente
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const res = await request(testApp).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.message).toBe('Internal server error')
    expect(res.body.error.message).not.toContain('Detalle interno')
    expect(JSON.stringify(res.body)).not.toContain('stack')

    process.env.NODE_ENV = original
  })
})

// ─── 9. Health no expone secretos ────────────────────────────────────────────
describe('Seguridad en /api/health', () => {
  it('no expone URLs, keys ni secretos en la respuesta', async () => {
    const res = await request(app).get('/api/health')
    const body = JSON.stringify(res.body)
    expect(body).not.toContain('SUPABASE_URL')
    expect(body).not.toContain('supabase.co')
    expect(body).not.toContain('SERVICE_ROLE')
    // Patrón JWT eyJ (inicio de cualquier key de Supabase)
    expect(body).not.toContain('eyJhbGci')
  })
})

// ─── 10-11. Secretos no aparecen en código fuente frontend ───────────────────
describe('Secretos en código fuente frontend', () => {
  it('SERVICE_ROLE_KEY no aparece en src/ del frontend', () => {
    const frontendSrc = resolve(__dirname, '../../../src')
    let found = false
    try {
      const result = execSync(
        `grep -r --include="*.ts" --include="*.tsx" "SERVICE_ROLE" "${frontendSrc}"`,
        { stdio: 'pipe' },
      ).toString()
      found = result.trim().length > 0
    } catch {
      found = false
    }
    expect(found).toBe(false)
  })

  it('OPENAI_API_KEY sin prefijo VITE_ no aparece en src/ del frontend', () => {
    const frontendSrc = resolve(__dirname, '../../../src')
    let found = false
    try {
      const result = execSync(
        `grep -r --include="*.ts" --include="*.tsx" "process\\.env\\.OPENAI_API_KEY\\|OPENAI_API_KEY[^_]" "${frontendSrc}"`,
        { stdio: 'pipe' },
      ).toString()
      found = result.trim().length > 0
    } catch {
      found = false
    }
    expect(found).toBe(false)
  })
})
