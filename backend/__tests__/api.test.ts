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
        not: vi.fn(() => builder),
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

describe('Fase 7D orders, payments and check-in API', () => {
  const adminUser = {
    id: '33333333-3333-4333-8333-333333333070',
    email: 'admin@alqia.tech',
    created_at: '2026-08-03T00:00:00.000Z',
    email_confirmed_at: '2026-08-03T00:00:00.000Z',
  }
  const customerId = '33333333-3333-4333-8333-333333333071'
  const orderId = '33333333-3333-4333-8333-333333333072'
  const paymentId = '33333333-3333-4333-8333-333333333073'
  const passId = '33333333-3333-4333-8333-333333333074'
  const checkinId = '33333333-3333-4333-8333-333333333075'

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  function seedOrder(status = 'pending_payment') {
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'ORD-FASE7D',
      customer_id: customerId,
      reservation_id: null,
      subtotal: 1200,
      discount_total: 0,
      tax_total: 0,
      shipping_total: 0,
      total: 1200,
      currency: 'MXN',
      status,
      source: 'Centro de control',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
      customers: { display_name: 'Cliente Fase 7D', first_name: 'Cliente', last_name: 'Fase 7D' },
    }]
  }

  function seedPayment(status = 'paid') {
    supabaseMock.tableData.payments = [{
      id: paymentId,
      order_id: orderId,
      provider: 'manual',
      amount: 1200,
      currency: 'MXN',
      status,
      payment_method_type: 'transferencia',
      payment_reference: 'QA-FASE7D',
      refunded_amount: status === 'refunded' ? 1200 : 0,
      provider_environment: 'manual',
      paid_at: '2026-08-03T00:00:00.000Z',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
      orders: {
        order_number: 'ORD-FASE7D',
        total: 1200,
        status: 'paid',
        customers: { display_name: 'Cliente Fase 7D', first_name: 'Cliente', last_name: 'Fase 7D' },
      },
    }]
  }

  function seedPass() {
    supabaseMock.tableData.access_passes = [{
      id: passId,
      reservation_id: '33333333-3333-4333-8333-333333333076',
      order_id: orderId,
      pass_number: 'PASS-FASE7D',
      status: 'published',
      valid_from: null,
      valid_until: null,
      used_at: null,
      issued_at: '2026-08-03T00:00:00.000Z',
      created_at: '2026-08-03T00:00:00.000Z',
      reservations: {
        reservation_number: 'RES-FASE7D',
        people_count: 2,
        customers: { display_name: 'Cliente Fase 7D', first_name: 'Cliente', last_name: 'Fase 7D' },
        experiences: { title: 'Cata real' },
      },
      orders: { order_number: 'ORD-FASE7D', status: 'paid' },
    }]
  }

  it('rechaza órdenes administrativas sin sesión y bloquea customer', async () => {
    const unauth = await request(app).get('/api/admin/orders')
    expect(unauth.status).toBe(401)

    signInAs('customer')
    const customer = await request(app).get('/api/admin/orders').set('Authorization', 'Bearer customer-token')
    expect(customer.status).toBe(403)
  })

  it('lista órdenes reales, partidas y exportación sin UUIDs internos', async () => {
    signInAs('viewer')
    seedOrder()
    seedPayment()
    supabaseMock.tableData.order_items = [{
      id: '33333333-3333-4333-8333-333333333077',
      order_id: orderId,
      item_type: 'manual',
      name_snapshot: 'Cata privada',
      quantity: 2,
      unit_price: 600,
      subtotal: 1200,
      created_at: '2026-08-03T00:00:00.000Z',
    }]

    const list = await request(app).get('/api/admin/orders').set('Authorization', 'Bearer viewer-token')
    const items = await request(app).get(`/api/admin/orders/${orderId}/items`).set('Authorization', 'Bearer viewer-token')
    const exported = await request(app).get('/api/admin/orders/export').set('Authorization', 'Bearer viewer-token')

    expect(list.status).toBe(200)
    expect(list.body.data[0]).toMatchObject({ orderNumber: 'ORD-FASE7D', paidAmount: 1200 })
    expect(items.status).toBe(200)
    expect(items.body.data[0].nameSnapshot).toBe('Cata privada')
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('order_number')
    expect(exported.text).not.toContain(orderId)
  })

  it('crea orden mediante RPC e impide payloads inválidos', async () => {
    signInAs('operations')
    seedOrder()
    supabaseMock.rpcData.create_order_admin = orderId

    const invalid = await request(app)
      .post('/api/admin/orders')
      .set('Authorization', 'Bearer operations-token')
      .send({ customerId, items: [{ nameSnapshot: 'Sin cantidad', quantity: 0, unitPrice: 100 }] })
    const created = await request(app)
      .post('/api/admin/orders')
      .set('Authorization', 'Bearer operations-token')
      .send({
        customerId,
        items: [{ nameSnapshot: 'Cata privada', quantity: 2, unitPrice: 600 }],
      })

    expect(invalid.status).toBe(422)
    expect(created.status).toBe(201)
    expect(created.body.data.orderNumber).toBe('ORD-FASE7D')
  })

  it('registra pago manual, reembolso y webhook deshabilitado sin simular cobros', async () => {
    signInAs('finance')
    seedOrder('paid')
    seedPayment()
    supabaseMock.rpcData.record_manual_payment = paymentId
    supabaseMock.rpcData.register_refund = paymentId

    const manual = await request(app)
      .post('/api/admin/payments/manual')
      .set('Authorization', 'Bearer finance-token')
      .send({
        orderId,
        amount: 1200,
        paymentMethodType: 'transferencia',
        paymentReference: 'QA-FASE7D',
        notes: 'Pago controlado',
      })
    const refund = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', 'Bearer finance-token')
      .send({ amount: 100, reason: 'Ajuste controlado' })
    const webhook = await request(app)
      .post('/api/webhooks/payments/provider')
      .send({ providerEventId: 'evt_1', eventType: 'payment.updated', payloadHash: 'abcdef1234567890' })

    expect(manual.status).toBe(201)
    expect(manual.body.data.providerEnvironment).toBe('manual')
    expect(refund.status).toBe(200)
    expect(webhook.status).toBe(503)
    expect(webhook.body.error.message).toBe('Proveedor de pago no configurado')
  })

  it('emite pase QR, valida acceso, registra check-in y bloquea doble uso', async () => {
    signInAs('operations')
    seedPass()
    supabaseMock.tableData.checkins = [{
      id: checkinId,
      access_pass_id: passId,
      checked_in_at: '2026-08-03T00:00:00.000Z',
      notes: 'Check-in real',
      reversed_at: null,
      created_at: '2026-08-03T00:00:00.000Z',
      access_passes: {
        pass_number: 'PASS-FASE7D',
        reservations: { reservation_number: 'RES-FASE7D', experiences: { title: 'Cata real' } },
      },
    }]
    supabaseMock.rpcData.issue_access_pass = passId
    supabaseMock.rpcData.validate_access_pass = {
      valid: true,
      accessPassId: passId,
      passNumber: 'PASS-FASE7D',
      guestName: 'Cliente Fase 7D',
      peopleCount: 2,
    }
    supabaseMock.rpcData.register_checkin = checkinId

    const pass = await request(app)
      .post('/api/admin/access-passes')
      .set('Authorization', 'Bearer operations-token')
      .send({ reservationId: '33333333-3333-4333-8333-333333333076' })
    const validate = await request(app)
      .post('/api/admin/access-passes/validate')
      .set('Authorization', 'Bearer operations-token')
      .send({ code: 'hdl_token_seguro_de_prueba' })
    const checkin = await request(app)
      .post('/api/admin/checkins')
      .set('Authorization', 'Bearer operations-token')
      .send({ accessPassId: passId })

    supabaseMock.rpcError = new Error('PASS_ALREADY_USED')
    const duplicated = await request(app)
      .post('/api/admin/checkins')
      .set('Authorization', 'Bearer operations-token')
      .send({ accessPassId: passId })

    expect(pass.status).toBe(201)
    expect(pass.body.data.qrToken).toMatch(/^hdl_/)
    expect(JSON.stringify(pass.body)).not.toContain('qr_token_hash')
    expect(validate.status).toBe(200)
    expect(validate.body.data.valid).toBe(true)
    expect(checkin.status).toBe(201)
    expect(duplicated.status).toBe(409)
  })

  it('revoca pase y revierte check-in con autorización', async () => {
    signInAs('operations')
    seedPass()
    supabaseMock.tableData.checkins = [{
      id: checkinId,
      access_pass_id: passId,
      checked_in_at: '2026-08-03T00:00:00.000Z',
      reversed_at: '2026-08-03T01:00:00.000Z',
      reversal_reason: 'Prueba controlada',
      created_at: '2026-08-03T00:00:00.000Z',
      access_passes: { pass_number: 'PASS-FASE7D' },
    }]
    supabaseMock.rpcData.revoke_access_pass = passId
    supabaseMock.rpcData.reverse_checkin = checkinId

    const revoke = await request(app)
      .post(`/api/admin/access-passes/${passId}/revoke`)
      .set('Authorization', 'Bearer operations-token')
      .send({ reason: 'Prueba controlada' })
    const reverse = await request(app)
      .post(`/api/admin/checkins/${checkinId}/reverse`)
      .set('Authorization', 'Bearer operations-token')
      .send({ reason: 'Prueba controlada' })

    expect(revoke.status).toBe(200)
    expect(reverse.status).toBe(200)
    expect(reverse.body.data.status).toBe('reversed')
  })
})

describe('Fase 7E Wine Club, inventario, logística y distribuidores API', () => {
  const adminUser = {
    id: '44444444-4444-4444-8444-444444444001',
    email: 'admin.fase7e@alqia.tech',
    created_at: '2026-08-03T00:00:00.000Z',
    email_confirmed_at: '2026-08-03T00:00:00.000Z',
  }
  const customerId = '44444444-4444-4444-8444-444444444002'
  const planId = '44444444-4444-4444-8444-444444444003'
  const membershipId = '44444444-4444-4444-8444-444444444004'
  const wineId = '44444444-4444-4444-8444-444444444005'
  const locationId = '44444444-4444-4444-8444-444444444006'
  const locationTwoId = '44444444-4444-4444-8444-444444444007'
  const inventoryItemId = '44444444-4444-4444-8444-444444444008'
  const orderId = '44444444-4444-4444-8444-444444444009'
  const shipmentId = '44444444-4444-4444-8444-444444444010'
  const distributorId = '44444444-4444-4444-8444-444444444011'
  const distributorOrderId = '44444444-4444-4444-8444-444444444012'

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  function seedMembership() {
    supabaseMock.tableData.customers = [{
      id: customerId,
      first_name: 'Cliente',
      last_name: 'Wine Club',
      display_name: 'Cliente Wine Club',
      email: 'cliente.fase7e@alqia.tech',
    }]
    supabaseMock.tableData.membership_plans = [{
      id: planId,
      name: 'Plan Fase 7E',
      tier: 'premium',
      price: 1200,
      currency: 'MXN',
    }]
    supabaseMock.tableData.memberships = [{
      id: membershipId,
      customer_id: customerId,
      membership_plan_id: planId,
      membership_number: 'MBR-FASE7E',
      status: 'active',
      starts_at: '2026-08-03T00:00:00.000Z',
      renewal_date: '2027-08-03',
      expires_at: '2027-08-03T00:00:00.000Z',
      points_balance: 20,
      customers: { display_name: 'Cliente Wine Club', first_name: 'Cliente', last_name: 'Wine Club', email: 'cliente.fase7e@alqia.tech' },
      membership_plans: { name: 'Plan Fase 7E', tier: 'premium', price: 1200 },
    }]
    supabaseMock.tableData.membership_benefits = [{
      id: '44444444-4444-4444-8444-444444444013',
      membership_plan_id: planId,
      name: 'Degustación privada',
      benefit_type: 'experience',
      value: 1,
      metadata: {},
    }]
    supabaseMock.tableData.loyalty_transactions = [{
      id: '44444444-4444-4444-8444-444444444014',
      customer_id: customerId,
      membership_id: membershipId,
      points: 20,
      transaction_type: 'adjustment',
      reason: 'Alta controlada',
      created_at: '2026-08-03T00:00:00.000Z',
    }]
  }

  function seedInventory() {
    supabaseMock.tableData.inventory_locations = [
      { id: locationId, name: 'Cava principal', code: 'CAVA', type: 'warehouse', active: true, created_at: '2026-08-03T00:00:00.000Z' },
      { id: locationTwoId, name: 'Tienda', code: 'SHOP', type: 'store', active: true, created_at: '2026-08-03T00:00:00.000Z' },
    ]
    supabaseMock.tableData.inventory_items = [{
      id: inventoryItemId,
      wine_id: wineId,
      location_id: locationId,
      sku: 'QA-FASE7E-WINE',
      product_name: 'Vino Fase 7E',
      lot_code: 'L-7E',
      quantity: 12,
      reserved_quantity: 2,
      minimum_quantity: 4,
      unit_cost: 250,
      status: 'active',
      updated_at: '2026-08-03T00:00:00.000Z',
      wines: { name: 'Vino Fase 7E', sku: 'QA-FASE7E-WINE' },
      inventory_locations: { name: 'Cava principal', code: 'CAVA', type: 'warehouse' },
    }]
    supabaseMock.tableData.inventory_movements = [{
      id: '44444444-4444-4444-8444-444444444015',
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      movement_type: 'receive',
      quantity: 12,
      reason: 'Recepción inicial',
      created_at: '2026-08-03T00:00:00.000Z',
      inventory_items: { product_name: 'Vino Fase 7E', sku: 'QA-FASE7E-WINE', wines: { name: 'Vino Fase 7E' } },
      inventory_locations: { name: 'Cava principal', code: 'CAVA' },
    }]
  }

  function seedShipment() {
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'ORD-FASE7E',
      status: 'paid',
      total: 900,
      customers: { display_name: 'Cliente Wine Club', first_name: 'Cliente', last_name: 'Wine Club' },
    }]
    supabaseMock.tableData.shipments = [{
      id: shipmentId,
      order_id: orderId,
      shipment_number: 'SHP-FASE7E',
      carrier: 'Mensajería controlada',
      tracking_number: 'TRACK-7E',
      destination: 'Aguascalientes',
      status_text: 'pending',
      shipping_cost: 120,
      incident_count: 0,
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
      orders: { order_number: 'ORD-FASE7E', status: 'paid', customers: { display_name: 'Cliente Wine Club' } },
      carriers: null,
    }]
    supabaseMock.tableData.shipment_events = [{
      id: '44444444-4444-4444-8444-444444444016',
      shipment_id: shipmentId,
      status: 'pending',
      event_type: 'status_change',
      notes: 'Alta de envío',
      created_at: '2026-08-03T00:00:00.000Z',
    }]
  }

  function seedDistributor() {
    supabaseMock.tableData.distributors = [{
      id: distributorId,
      distributor_number: 'DST-FASE7E',
      name: 'Distribuidor Fase 7E',
      contact_name: 'Operaciones',
      email: 'distribuidor.fase7e@alqia.tech',
      phone: '+524491110000',
      zone: 'Bajío',
      distributor_type: 'wholesale',
      operational_status: 'active',
      commercial_terms: 'Pago contra entrega',
      price_list_name: 'Mayoreo',
      credit_limit: 10000,
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.distributor_contacts = [{
      id: '44444444-4444-4444-8444-444444444017',
      distributor_id: distributorId,
      name: 'Compras',
      role_title: 'Compras',
      email: 'compras.fase7e@alqia.tech',
      active: true,
      is_primary: true,
    }]
    supabaseMock.tableData.distributor_orders = [{
      id: distributorOrderId,
      distributor_id: distributorId,
      order_number: 'DOR-FASE7E',
      status: 'submitted',
      subtotal: 1000,
      total: 1000,
      currency: 'MXN',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
      distributors: { name: 'Distribuidor Fase 7E', zone: 'Bajío' },
    }]
    supabaseMock.tableData.distributor_order_items = [{
      id: '44444444-4444-4444-8444-444444444018',
      distributor_order_id: distributorOrderId,
      name_snapshot: 'Vino Fase 7E',
      sku_snapshot: 'QA-FASE7E-WINE',
      quantity: 4,
      unit_price: 250,
      subtotal: 1000,
    }]
  }

  it('rechaza endpoints Fase 7E sin sesión y bloquea customer', async () => {
    const unauth = await request(app).get('/api/admin/memberships')
    expect(unauth.status).toBe(401)

    signInAs('customer')
    const customer = await request(app).get('/api/admin/inventory').set('Authorization', 'Bearer customer-token')
    expect(customer.status).toBe(403)
  })

  it('lista Wine Club, beneficios, puntos y exporta sin UUID interno', async () => {
    signInAs('marketing')
    seedMembership()

    const list = await request(app).get('/api/admin/memberships').set('Authorization', 'Bearer marketing-token')
    const benefits = await request(app).get(`/api/admin/memberships/${membershipId}/benefits`).set('Authorization', 'Bearer marketing-token')
    const loyalty = await request(app).get(`/api/admin/memberships/${membershipId}/loyalty`).set('Authorization', 'Bearer marketing-token')
    const exported = await request(app).get('/api/admin/memberships/export').set('Authorization', 'Bearer marketing-token')

    expect(list.status).toBe(200)
    expect(list.body.data[0]).toMatchObject({ membershipNumber: 'MBR-FASE7E', pointsBalance: 20 })
    expect(benefits.status).toBe(200)
    expect(loyalty.status).toBe(200)
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('membership_number')
    expect(exported.text).not.toContain(membershipId)
  })

  it('crea membresía y opera estados/puntos mediante RPC segura', async () => {
    signInAs('admin')
    seedMembership()
    supabaseMock.rpcData.assign_membership = membershipId
    supabaseMock.rpcData.pause_membership = membershipId
    supabaseMock.rpcData.resume_membership = membershipId
    supabaseMock.rpcData.adjust_loyalty_points = membershipId

    const invalid = await request(app)
      .post('/api/admin/memberships')
      .set('Authorization', 'Bearer admin-token')
      .send({ customerId, planId: 'plan-invalido' })
    const created = await request(app)
      .post('/api/admin/memberships')
      .set('Authorization', 'Bearer admin-token')
      .send({ customerId, planId })
    const paused = await request(app)
      .post(`/api/admin/memberships/${membershipId}/pause`)
      .set('Authorization', 'Bearer admin-token')
      .send({ reason: 'Pausa controlada' })
    const resumed = await request(app)
      .post(`/api/admin/memberships/${membershipId}/resume`)
      .set('Authorization', 'Bearer admin-token')
      .send({})
    const points = await request(app)
      .post(`/api/admin/memberships/${membershipId}/loyalty-adjustment`)
      .set('Authorization', 'Bearer admin-token')
      .send({ points: 5, reason: 'Ajuste controlado' })

    expect(invalid.status).toBe(422)
    expect(created.status).toBe(201)
    expect(paused.status).toBe(200)
    expect(resumed.status).toBe(200)
    expect(points.status).toBe(201)
  })

  it('lista inventario, movimientos, alertas y exporta sin identificadores internos', async () => {
    signInAs('viewer')
    seedInventory()

    const summary = await request(app).get('/api/admin/inventory').set('Authorization', 'Bearer viewer-token')
    const items = await request(app).get('/api/admin/inventory/items').set('Authorization', 'Bearer viewer-token')
    const movements = await request(app).get('/api/admin/inventory/movements').set('Authorization', 'Bearer viewer-token')
    const exported = await request(app).get('/api/admin/inventory/export').set('Authorization', 'Bearer viewer-token')

    expect(summary.status).toBe(200)
    expect(summary.body.data.items[0]).toMatchObject({ productName: 'Vino Fase 7E', available: 10 })
    expect(items.status).toBe(200)
    expect(movements.status).toBe(200)
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('product')
    expect(exported.text).not.toContain(inventoryItemId)
  })

  it('crea ubicaciones, productos y movimientos de inventario mediante RPC', async () => {
    signInAs('operations')
    seedInventory()
    supabaseMock.rpcData.create_inventory_item = inventoryItemId
    supabaseMock.rpcData.receive_inventory = inventoryItemId
    supabaseMock.rpcData.reserve_inventory = inventoryItemId
    supabaseMock.rpcData.release_inventory = inventoryItemId
    supabaseMock.rpcData.transfer_inventory = inventoryItemId
    supabaseMock.rpcData.adjust_inventory = inventoryItemId

    const location = await request(app)
      .post('/api/admin/inventory/locations')
      .set('Authorization', 'Bearer operations-token')
      .send({ name: 'Almacén QA', code: 'QA7E', type: 'warehouse' })
    const item = await request(app)
      .post('/api/admin/inventory/items')
      .set('Authorization', 'Bearer operations-token')
      .send({ wineId, locationId, sku: 'QA-FASE7E-WINE', minimumQuantity: 2 })
    const receive = await request(app)
      .post('/api/admin/inventory/receive')
      .set('Authorization', 'Bearer operations-token')
      .send({ inventoryItemId, quantity: 5, reason: 'Recepción controlada' })
    const reserve = await request(app)
      .post('/api/admin/inventory/reserve')
      .set('Authorization', 'Bearer operations-token')
      .send({ inventoryItemId, quantity: 1 })
    const release = await request(app)
      .post('/api/admin/inventory/release')
      .set('Authorization', 'Bearer operations-token')
      .send({ inventoryItemId, quantity: 1 })
    const transfer = await request(app)
      .post('/api/admin/inventory/transfer')
      .set('Authorization', 'Bearer operations-token')
      .send({ inventoryItemId, toLocationId: locationTwoId, quantity: 1, reason: 'Traspaso controlado' })
    const adjust = await request(app)
      .post('/api/admin/inventory/adjust')
      .set('Authorization', 'Bearer operations-token')
      .send({ inventoryItemId, quantityDelta: 1, reason: 'Conteo físico' })

    expect(location.status).toBe(201)
    expect(item.status).toBe(201)
    expect(receive.status).toBe(201)
    expect(reserve.status).toBe(201)
    expect(release.status).toBe(200)
    expect(transfer.status).toBe(200)
    expect(adjust.status).toBe(200)
  })

  it('lista logística, historial y opera estados, incidencias y entrega', async () => {
    signInAs('operations')
    seedShipment()
    supabaseMock.rpcData.create_shipment = shipmentId
    supabaseMock.rpcData.update_shipment_status = shipmentId
    supabaseMock.rpcData.register_shipment_incident = shipmentId
    supabaseMock.rpcData.mark_shipment_delivered = shipmentId

    const list = await request(app).get('/api/admin/shipments').set('Authorization', 'Bearer operations-token')
    const history = await request(app).get(`/api/admin/shipments/${shipmentId}/history`).set('Authorization', 'Bearer operations-token')
    const created = await request(app)
      .post('/api/admin/shipments')
      .set('Authorization', 'Bearer operations-token')
      .send({ orderId, carrier: 'Mensajería controlada', destination: 'Aguascalientes' })
    const shipped = await request(app)
      .post(`/api/admin/shipments/${shipmentId}/status`)
      .set('Authorization', 'Bearer operations-token')
      .send({ status: 'shipped', notes: 'Guía registrada' })
    const incident = await request(app)
      .post(`/api/admin/shipments/${shipmentId}/incident`)
      .set('Authorization', 'Bearer operations-token')
      .send({ notes: 'Incidencia controlada' })
    const delivered = await request(app)
      .post(`/api/admin/shipments/${shipmentId}/deliver`)
      .set('Authorization', 'Bearer operations-token')
      .send({ notes: 'Entregado' })

    expect(list.status).toBe(200)
    expect(history.status).toBe(200)
    expect(created.status).toBe(201)
    expect(shipped.status).toBe(200)
    expect(incident.status).toBe(201)
    expect(delivered.status).toBe(200)
  })

  it('lista distribuidores, contactos, órdenes y exporta sin UUID interno', async () => {
    signInAs('finance')
    seedDistributor()

    const distributors = await request(app).get('/api/admin/distributors').set('Authorization', 'Bearer finance-token')
    const contacts = await request(app).get(`/api/admin/distributors/${distributorId}/contacts`).set('Authorization', 'Bearer finance-token')
    const orders = await request(app).get('/api/admin/distributor-orders').set('Authorization', 'Bearer finance-token')
    const items = await request(app).get(`/api/admin/distributor-orders/${distributorOrderId}/items`).set('Authorization', 'Bearer finance-token')
    const exported = await request(app).get('/api/admin/distributors/export').set('Authorization', 'Bearer finance-token')

    expect(distributors.status).toBe(200)
    expect(distributors.body.data[0]).toMatchObject({ name: 'Distribuidor Fase 7E', status: 'active' })
    expect(contacts.status).toBe(200)
    expect(orders.status).toBe(200)
    expect(items.status).toBe(200)
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('distributor_number')
    expect(exported.text).not.toContain(distributorId)
  })

  it('crea distribuidores, contactos y órdenes con aprobación operativa', async () => {
    signInAs('operations')
    seedDistributor()
    supabaseMock.rpcData.create_distributor_order = distributorOrderId
    supabaseMock.rpcData.approve_distributor_order = distributorOrderId
    supabaseMock.rpcData.fulfill_distributor_order = distributorOrderId

    const distributor = await request(app)
      .post('/api/admin/distributors')
      .set('Authorization', 'Bearer operations-token')
      .send({ name: 'Distribuidor Fase 7E', email: 'distribuidor.fase7e@alqia.tech', operationalStatus: 'active' })
    const contact = await request(app)
      .post(`/api/admin/distributors/${distributorId}/contacts`)
      .set('Authorization', 'Bearer operations-token')
      .send({ name: 'Compras', email: 'compras.fase7e@alqia.tech', isPrimary: true })
    const invalidOrder = await request(app)
      .post('/api/admin/distributor-orders')
      .set('Authorization', 'Bearer operations-token')
      .send({ distributorId, items: [] })
    const order = await request(app)
      .post('/api/admin/distributor-orders')
      .set('Authorization', 'Bearer operations-token')
      .send({ distributorId, items: [{ nameSnapshot: 'Vino Fase 7E', quantity: 4, unitPrice: 250 }] })
    const approved = await request(app)
      .post(`/api/admin/distributor-orders/${distributorOrderId}/approve`)
      .set('Authorization', 'Bearer operations-token')
      .send({})
    const delivered = await request(app)
      .post(`/api/admin/distributor-orders/${distributorOrderId}/deliver`)
      .set('Authorization', 'Bearer operations-token')
      .send({})

    expect(distributor.status).toBe(201)
    expect(contact.status).toBe(201)
    expect(invalidOrder.status).toBe(422)
    expect(order.status).toBe(201)
    expect(approved.status).toBe(200)
    expect(delivered.status).toBe(200)
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
