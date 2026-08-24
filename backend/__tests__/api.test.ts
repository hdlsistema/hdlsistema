import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createApp } from '../src/app'
import { env } from '../src/config/env'
import { checkSupabaseReachable } from '../src/config/supabase'
import { errorHandler, type AppError } from '../src/middleware/errorHandler'
import { canAccessContent } from '../src/modules/content/content.permissions'
import { parseContentPatch } from '../src/modules/content/content.schemas'
import {
  enqueueAndProcessTransactionalEmail,
  enqueueTransactionalEmail,
} from '../src/modules/communications/communications.service'
import { renderEmailTemplate } from '../src/modules/communications/template.service'
import { communicationEventTypes } from '../src/modules/communications/communications.schemas'
import { execSync } from 'child_process'
import { createHmac } from 'crypto'
import { resolve } from 'path'

const supabaseMock = vi.hoisted(() => ({
  error: null as unknown,
  throwError: null as unknown,
  rpcError: null as unknown,
  rpcData: {} as Record<string, unknown>,
  rpcCalls: [] as Array<{ name: string; args?: Record<string, unknown> }>,
  authUser: null as { id: string; email: string; created_at: string; email_confirmed_at: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null,
  authUsers: [] as Array<{ id: string; email: string; created_at: string; email_confirmed_at: string | null; last_sign_in_at?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }>,
  createdAuthUser: null as { id: string; email: string } | null,
  createUserPayload: null as Record<string, unknown> | null,
  updateUserPayload: null as Record<string, unknown> | null,
  tableData: {} as Record<string, unknown[]>,
  selectQueries: [] as string[],
}))

const stripeMock = vi.hoisted(() => ({
  paymentIntentsCreate: vi.fn(),
  paymentIntentsRetrieve: vi.fn(),
  customersCreate: vi.fn(),
  customerSessionsCreate: vi.fn(),
  paymentMethodsList: vi.fn(),
  refundsCreate: vi.fn(),
  constructEvent: vi.fn(),
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
        listUsers: vi.fn(async () => ({ data: { users: supabaseMock.authUsers }, error: null })),
        getUserById: vi.fn(async (id: string) => {
          const user = supabaseMock.authUsers.find((candidate) => candidate.id === id) ?? null
          return user ? { data: { user }, error: null } : { data: { user: null }, error: new Error('not found') }
        }),
        createUser: vi.fn(async (payload: Record<string, unknown>) => {
          supabaseMock.createUserPayload = payload
          return supabaseMock.createdAuthUser
            ? { data: { user: supabaseMock.createdAuthUser }, error: null }
            : { data: { user: null }, error: new Error('blocked') }
        }),
        updateUserById: vi.fn(async (id: string, payload: Record<string, unknown>) => {
          supabaseMock.updateUserPayload = payload
          const existingUser = supabaseMock.authUsers.find((candidate) => candidate.id === id) ??
            (supabaseMock.authUser?.id === id ? supabaseMock.authUser : null)
          const nextUser = existingUser
            ? {
                ...existingUser,
                app_metadata: {
                  ...(existingUser.app_metadata ?? {}),
                  ...((payload.app_metadata as Record<string, unknown> | undefined) ?? {}),
                },
                user_metadata: {
                  ...(existingUser.user_metadata ?? {}),
                  ...((payload.user_metadata as Record<string, unknown> | undefined) ?? {}),
                },
              }
            : null
          if (nextUser && supabaseMock.authUser?.id === id) supabaseMock.authUser = nextUser
          const index = supabaseMock.authUsers.findIndex((candidate) => candidate.id === id)
          if (nextUser && index >= 0) supabaseMock.authUsers[index] = nextUser
          return { data: { user: nextUser }, error: null }
        }),
      },
    },
    from: vi.fn((table: string) => {
      const state = {
        table,
        filters: [] as Array<{ column: string; value: unknown }>,
        nullFilters: [] as string[],
        neqFilters: [] as Array<{ column: string; value: unknown }>,
        inFilters: [] as Array<{ column: string; values: unknown[] }>,
        containsFilters: [] as Array<{ column: string; value: Record<string, unknown> }>,
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
            state.neqFilters.every((filter) => record[filter.column] !== filter.value) &&
            state.inFilters.every((filter) => filter.values.includes(record[filter.column])) &&
            state.containsFilters.every((filter) => {
              const candidate = record[filter.column]
              return Boolean(candidate && typeof candidate === 'object' && Object.entries(filter.value).every(([key, value]) => (candidate as Record<string, unknown>)[key] === value))
            })
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
        select: vi.fn((query?: string) => {
          if (query) supabaseMock.selectQueries.push(query)
          return builder
        }),
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
        neq: vi.fn((column: string, value: unknown) => {
          state.neqFilters.push({ column, value })
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
        contains: vi.fn((column: string, value: Record<string, unknown>) => {
          state.containsFilters.push({ column, value })
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
	                : state.operation === 'upsert'
	                  ? { data: insertRecord(), error: null, count: 1 }
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
          if (state.operation === 'insert' || state.operation === 'upsert') return { data: insertRecord(), error: null }
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
    rpc: vi.fn(async (name: string, args?: Record<string, unknown>) => {
      supabaseMock.rpcCalls.push({ name, args })
      if (supabaseMock.throwError) throw supabaseMock.throwError
      if (supabaseMock.rpcError) return { data: null, error: supabaseMock.rpcError }
      return { data: supabaseMock.rpcData[name] ?? '00000000-0000-0000-0000-000000000099', error: null }
    }),
  })),
}))

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: stripeMock.paymentIntentsCreate,
      retrieve: stripeMock.paymentIntentsRetrieve,
    },
    customers: {
      create: stripeMock.customersCreate,
    },
    customerSessions: {
      create: stripeMock.customerSessionsCreate,
    },
    paymentMethods: {
      list: stripeMock.paymentMethodsList,
    },
    refunds: {
      create: stripeMock.refundsCreate,
    },
    webhooks: {
      constructEvent: stripeMock.constructEvent,
    },
  })),
}))

const app = createApp()
const originalSupabaseUrl = env.SUPABASE_URL
const originalSupabaseAnonKey = env.SUPABASE_ANON_KEY
const originalSupabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const originalStripeSecretKey = env.STRIPE_SECRET_KEY
const originalStripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET
const originalStripeEnvironment = env.STRIPE_ENVIRONMENT

beforeEach(() => {
  vi.unstubAllGlobals()
  supabaseMock.error = null
  supabaseMock.throwError = null
  supabaseMock.rpcError = null
  supabaseMock.rpcData = {}
  supabaseMock.rpcCalls = []
  supabaseMock.authUser = null
  supabaseMock.authUsers = []
  supabaseMock.createdAuthUser = null
  supabaseMock.createUserPayload = null
  supabaseMock.updateUserPayload = null
  supabaseMock.tableData = {}
  supabaseMock.selectQueries = []
  stripeMock.paymentIntentsCreate.mockReset()
  stripeMock.paymentIntentsRetrieve.mockReset()
  stripeMock.customersCreate.mockReset()
  stripeMock.customerSessionsCreate.mockReset()
  stripeMock.paymentMethodsList.mockReset()
  stripeMock.refundsCreate.mockReset()
  stripeMock.constructEvent.mockReset()
  ;(env as Record<string, string>).SUPABASE_URL = originalSupabaseUrl
  ;(env as Record<string, string>).SUPABASE_ANON_KEY = originalSupabaseAnonKey
  ;(env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY =
    originalSupabaseServiceRoleKey
  ;(env as Record<string, string>).RESEND_API_KEY = ''
  ;(env as Record<string, string>).RESEND_FROM_EMAIL = ''
  ;(env as Record<string, string>).RESEND_REPLY_TO_EMAIL = ''
  ;(env as Record<string, string>).RESEND_WEBHOOK_SECRET = ''
  ;(env as Record<string, string>).FIREBASE_PROJECT_ID = ''
  ;(env as Record<string, string>).FIREBASE_CLIENT_EMAIL = ''
  ;(env as Record<string, string>).FIREBASE_PRIVATE_KEY = ''
  ;(env as Record<string, string>).STRIPE_SECRET_KEY = originalStripeSecretKey
  ;(env as Record<string, string>).STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret
  ;(env as Record<string, string>).STRIPE_ENVIRONMENT = originalStripeEnvironment
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
    expect(res.body.push?.android?.provider).toBe('firebase')
    expect(res.body.push?.android?.transport).toBe('fcm_http_v1')
    expect(typeof res.body.push?.android?.configured).toBe('boolean')
    expect(res.body.push?.ios?.provider).toBe('firebase')
    expect(res.body.push?.ios?.transport).toBe('fcm_on_apns')
    expect(typeof res.body.push?.ios?.configured).toBe('boolean')
    expect(typeof res.body.push?.ios?.directApnsConfigured).toBe('boolean')
    expect(res.body.push?.directApns?.provider).toBe('apns')
    expect(res.body.push?.directApns?.enabled).toBe(false)
    expect(res.body.payments?.stripe?.provider).toBe('stripe')
    expect(typeof res.body.payments?.stripe?.configured).toBe('boolean')
    expect(typeof res.body.payments?.stripe?.webhookConfigured).toBe('boolean')
    expect(['test', 'live']).toContain(res.body.payments?.stripe?.environment)
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
  it('/api/auth/register crea una cuenta customer confirmada sin aceptar privilegios', async () => {
    supabaseMock.createdAuthUser = {
      id: '00000000-0000-0000-0000-000000000088',
      email: 'nuevo.cliente@example.com',
    }

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'NUEVO.CLIENTE@example.com',
        password: 'Password123!',
        firstName: 'Nuevo',
        lastName: 'Cliente',
        preferredLanguage: 'en',
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ email: 'nuevo.cliente@example.com', emailConfirmed: true })
    expect(supabaseMock.createUserPayload).toMatchObject({
      email: 'nuevo.cliente@example.com',
      email_confirm: true,
      user_metadata: expect.objectContaining({ preferred_language: 'en' }),
    })
    expect(supabaseMock.createUserPayload).not.toHaveProperty('app_metadata')
    expect(supabaseMock.tableData.audit_logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'customer_self_registered', entity_id: supabaseMock.createdAuthUser.id }),
    ]))
    expect(supabaseMock.tableData.communication_events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_type: 'customer.welcome',
        aggregate_id: supabaseMock.createdAuthUser.id,
        idempotency_key: `customer.welcome:${supabaseMock.createdAuthUser.id}`,
      }),
    ]))
    expect(supabaseMock.tableData.email_outbox).toEqual(expect.arrayContaining([
      expect.objectContaining({
        template_key: 'customer.welcome',
        recipient_email: 'nuevo.cliente@example.com',
        locale: 'en-US',
        provider: 'resend',
      }),
    ]))
  })

  it('/api/auth/register rechaza atributos administrativos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'ataque@example.com',
        password: 'Password123!',
        firstName: 'Ataque',
        lastName: 'Prueba',
        role: 'admin',
      })

    expect(res.status).toBe(422)
    expect(supabaseMock.createUserPayload).toBeNull()
  })

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

  it('/api/auth/welcome cubre OAuth y evita duplicar la bienvenida', async () => {
    supabaseMock.authUser = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'oauth.customer@example.com',
      created_at: '2026-08-16T00:00:00.000Z',
      email_confirmed_at: '2026-08-16T00:00:00.000Z',
      app_metadata: { provider: 'google' },
    }
    supabaseMock.tableData.customers = [{
      id: '00000000-0000-0000-0000-000000000003',
      user_id: supabaseMock.authUser.id,
      customer_number: 'HDL-OAUTH',
      first_name: 'Cliente',
      last_name: 'Google',
      email: supabaseMock.authUser.email,
      status: 'published',
    }]
    supabaseMock.tableData.profiles = [{
      id: supabaseMock.authUser.id,
      preferred_language: 'es',
    }]

    const first = await request(app)
      .post('/api/auth/welcome')
      .set('Authorization', 'Bearer valid-token')
    const second = await request(app)
      .post('/api/auth/welcome')
      .set('Authorization', 'Bearer valid-token')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(supabaseMock.tableData.communication_events).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox[0]).toMatchObject({
      template_key: 'customer.welcome',
      recipient_email: 'oauth.customer@example.com',
      locale: 'es-MX',
      provider: 'resend',
    })
  })

  it('/api/admin/users requiere autenticación', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('/api/admin/users lista staff y administradores sin mezclar clientes puros', async () => {
    const owner = {
      id: '00000000-0000-0000-0000-000000000101',
      email: 'pgaribay@alqia.tech',
      created_at: '2026-08-20T00:00:00.000Z',
      email_confirmed_at: '2026-08-20T00:00:00.000Z',
      user_metadata: { name: 'Patricia Garibay' },
    }
    supabaseMock.authUser = owner
    supabaseMock.authUsers = [
      owner,
      {
        id: '00000000-0000-0000-0000-000000000102',
        email: 'cliente.puro@example.com',
        created_at: '2026-08-20T00:00:00.000Z',
        email_confirmed_at: '2026-08-20T00:00:00.000Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        email: 'host.evento@example.com',
        created_at: '2026-08-20T00:00:00.000Z',
        email_confirmed_at: '2026-08-20T00:00:00.000Z',
        app_metadata: { staff_account: true, managed_password_locked: true },
      },
      {
        id: '00000000-0000-0000-0000-000000000104',
        email: 'carlos.salas@example.com',
        created_at: '2026-08-20T00:00:00.000Z',
        email_confirmed_at: '2026-08-20T00:00:00.000Z',
        user_metadata: { full_name: 'Carlos Salas' },
      },
    ]
    supabaseMock.tableData.user_roles = [
      { user_id: owner.id, roles: { code: 'super_admin' } },
      { user_id: '00000000-0000-0000-0000-000000000102', roles: { code: 'customer' } },
      { user_id: '00000000-0000-0000-0000-000000000103', roles: { code: 'customer' } },
      { user_id: '00000000-0000-0000-0000-000000000103', roles: { code: 'operations' } },
      { user_id: '00000000-0000-0000-0000-000000000104', roles: { code: 'super_admin' } },
    ]
    supabaseMock.tableData.profiles = [{
      id: owner.id,
      first_name: '',
      last_name: '',
      display_name: 'pgaribay@alqia.tech',
    }]
    supabaseMock.tableData.customers = [
      {
        id: '00000000-0000-0000-0000-000000000202',
        user_id: '00000000-0000-0000-0000-000000000102',
        first_name: 'Cliente',
        last_name: 'Puro',
        display_name: 'Cliente Puro',
        email: 'cliente.puro@example.com',
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        user_id: '00000000-0000-0000-0000-000000000103',
        first_name: 'Host',
        last_name: 'Evento',
        display_name: 'Host Evento',
        email: 'host.evento@example.com',
      },
    ]

    const res = await request(app)
      .get('/api/admin/users?perPage=100')
      .set('Authorization', 'Bearer owner-token')

    expect(res.status).toBe(200)
    const emails = res.body.users.map((user: { email: string }) => user.email)
    expect(emails).toContain('pgaribay@alqia.tech')
    expect(emails).toContain('carlos.salas@example.com')
    expect(emails).toContain('host.evento@example.com')
    expect(emails).not.toContain('cliente.puro@example.com')
    expect(res.body.users).toEqual(expect.arrayContaining([
      expect.objectContaining({
        email: 'pgaribay@alqia.tech',
        displayName: 'Patricia Garibay',
        accountLabel: 'Super administrador',
        accountType: 'admin',
      }),
      expect.objectContaining({
        email: 'carlos.salas@example.com',
        displayName: 'Carlos Salas',
        accountLabel: 'Super administrador',
        accountType: 'admin',
      }),
      expect.objectContaining({
        email: 'host.evento@example.com',
        displayName: 'Host Evento',
        accountLabel: 'Cliente + staff',
        accountType: 'customer_staff',
        isCustomer: true,
      }),
    ]))
  })

  it('/api/admin/users convierte un cliente existente a cliente + staff sin quitar su rol customer', async () => {
    const owner = {
      id: '00000000-0000-0000-0000-000000000111',
      email: 'pgaribay@alqia.tech',
      created_at: '2026-08-20T00:00:00.000Z',
      email_confirmed_at: '2026-08-20T00:00:00.000Z',
    }
    const customer = {
      id: '00000000-0000-0000-0000-000000000112',
      email: 'cliente.staff@example.com',
      created_at: '2026-08-20T00:00:00.000Z',
      email_confirmed_at: '2026-08-20T00:00:00.000Z',
    }
    supabaseMock.authUser = owner
    supabaseMock.authUsers = [owner, customer]
    supabaseMock.tableData.roles = [
      { id: '00000000-0000-0000-0000-000000000301', code: 'customer' },
      { id: '00000000-0000-0000-0000-000000000302', code: 'operations' },
    ]
    supabaseMock.tableData.user_roles = [
      { user_id: owner.id, roles: { code: 'admin' } },
      { user_id: customer.id, roles: { code: 'customer' } },
    ]
    supabaseMock.tableData.customers = [{
      id: '00000000-0000-0000-0000-000000000212',
      user_id: customer.id,
      first_name: 'Cliente',
      last_name: 'Staff',
      display_name: 'Cliente Staff',
      email: customer.email,
    }]

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', 'Bearer owner-token')
      .send({
        email: customer.email,
        password: 'Hacienda2026!Staff',
        roles: ['operations'],
        permissions: ['entries.view', 'entries.scan'],
        financialAccess: false,
      })

    expect(res.status).toBe(200)
    expect(supabaseMock.createUserPayload).toBeNull()
    expect(supabaseMock.updateUserPayload).toMatchObject({
      password: 'Hacienda2026!Staff',
      app_metadata: expect.objectContaining({
        staff_account: true,
        managed_password_locked: true,
        must_change_password: false,
      }),
    })
    expect(res.body).toMatchObject({
      id: customer.id,
      email: customer.email,
      displayName: 'Cliente Staff',
      roles: expect.arrayContaining(['customer', 'operations']),
      permissions: expect.arrayContaining(['entries.view', 'entries.scan']),
      isCustomer: true,
      isStaff: true,
      accountType: 'customer_staff',
      accountLabel: 'Cliente + staff',
    })
    expect(supabaseMock.tableData.audit_logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'admin_customer_promoted_to_staff', entity_id: customer.id }),
    ]))
  })

  it('obliga una contraseña robusta y registra el cambio de primer acceso', async () => {
    supabaseMock.authUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'direccion@haciendadeletras.com',
      created_at: '2026-08-12T00:00:00.000Z',
      email_confirmed_at: '2026-08-12T00:00:00.000Z',
      app_metadata: { must_change_password: true },
    }

    const weak = await request(app)
      .post('/api/auth/initial-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ password: 'corta' })
    const changed = await request(app)
      .post('/api/auth/initial-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ password: 'Hacienda2026!Segura' })

    expect(weak.status).toBe(422)
    expect(changed.status).toBe(200)
    expect(changed.body.data.mustChangePassword).toBe(false)
    expect(supabaseMock.updateUserPayload).toMatchObject({
      password: 'Hacienda2026!Segura',
      app_metadata: expect.objectContaining({
        must_change_password: false,
        password_changed_at: expect.any(String),
      }),
    })
    expect(supabaseMock.authUser?.app_metadata?.must_change_password).toBe(false)
    expect(supabaseMock.tableData.audit_logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'initial_password_changed', entity_id: supabaseMock.authUser.id }),
    ]))
  })
})

describe('Dashboard operativo real', () => {
  const adminUser = {
    id: '00000000-0000-0000-0000-000000000040',
    email: 'admin@alqia.tech',
    created_at: '2026-08-10T00:00:00.000Z',
    email_confirmed_at: '2026-08-10T00:00:00.000Z',
  }

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  it('requiere sesión administrativa', async () => {
    const res = await request(app).get('/api/admin/dashboard')
    expect(res.status).toBe(401)
  })

  it('bloquea a customer', async () => {
    signInAs('customer')
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
  })

  it('resume únicamente registros persistidos para un admin', async () => {
    signInAs('admin')
    supabaseMock.tableData.customers = [{ id: 'customer-1', archived_at: null }]
    supabaseMock.tableData.reservations = [
      {
        id: 'reservation-1', reservation_number: 'RES-001', status: 'confirmed', people_count: 2,
        total: 1300, currency: 'MXN', created_at: '2026-08-10T10:00:00.000Z',
      },
      {
        id: 'reservation-2', reservation_number: 'RES-002', status: 'pending', people_count: 4,
        total: 2600, currency: 'MXN', created_at: '2026-08-10T09:00:00.000Z',
      },
    ]
    supabaseMock.tableData.orders = [
      {
        id: 'order-1', order_number: 'ORD-001', status: 'pending_payment', total: 1300,
        currency: 'MXN', created_at: '2026-08-10T10:00:00.000Z',
      },
    ]
    supabaseMock.tableData.payments = [
      { id: 'payment-1', status: 'paid', amount: 1000, refunded_amount: 0, currency: 'MXN' },
      { id: 'payment-2', status: 'partially_refunded', amount: 700, refunded_amount: 200, currency: 'MXN' },
    ]
    supabaseMock.tableData.experience_slots = [
      {
        id: 'slot-1', start_at: '2026-12-10T18:00:00.000Z', end_at: '2026-12-10T19:30:00.000Z',
        capacity: 12, reserved_count: 3, status: 'published', is_bookable: true,
        operational_status: 'open', experiences: { title: 'Cata real' },
      },
      {
        id: 'slot-blocked', start_at: '2026-12-11T18:00:00.000Z', end_at: '2026-12-11T19:30:00.000Z',
        capacity: 100, reserved_count: 100, status: 'inactive', is_bookable: false,
        operational_status: 'blocked', experiences: { title: 'Horario bloqueado' },
      },
    ]
    supabaseMock.tableData.carts = [
      { id: 'cart-active', cart_status: 'active' },
      { id: 'cart-converted', cart_status: 'converted' },
    ]
    supabaseMock.tableData.customer_app_events = [
      { id: 'event-checkout', customer_id: 'customer-1', session_id: 'session-1', event_name: 'checkout_started', occurred_at: '2026-08-12T00:00:00.000Z' },
      { id: 'event-session', customer_id: 'customer-1', session_id: 'session-1', event_name: 'app_session_started', occurred_at: '2026-08-12T00:00:00.000Z' },
    ]
    supabaseMock.tableData.map_pois = [{ id: 'poi-1', status: 'published', visible_in_app: true, deleted_at: null, archived_at: null }]

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer admin-token')

    expect(res.status).toBe(200)
    expect(res.body.data.metrics).toMatchObject({
      customers: 1,
      activeReservations: 2,
      pendingReservations: 1,
      confirmedReservations: 1,
      pendingPaymentOrders: 1,
      confirmedPayments: 1,
      collected: [{ currency: 'MXN', amount: 1500 }],
      activeCarts: 1,
      convertedCarts: 1,
      checkoutStarted: 1,
      visitorsRecent: 1,
      occupancyRate: 25,
      conversionRate: 50,
      publishedMapPois: 1,
    })
    expect(res.body.data.upcomingSlots).toMatchObject([{ experienceTitle: 'Cata real', available: 9 }])
    expect(JSON.stringify(res.body)).not.toContain('simulad')
  })
})

describe('Notificaciones administrativas reales', () => {
  const adminUser = {
    id: '00000000-0000-0000-0000-000000000045',
    email: 'admin.notifications@alqia.tech',
    created_at: '2026-08-10T00:00:00.000Z',
    email_confirmed_at: '2026-08-10T00:00:00.000Z',
  }

  function signInAs(role: string) {
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: role } }]
  }

  it('requiere sesión administrativa', async () => {
    const res = await request(app).get('/api/admin/notifications')

    expect(res.status).toBe(401)
  })

  it('bloquea customer y no expone alertas simuladas', async () => {
    signInAs('customer')

    const res = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
    expect(JSON.stringify(res.body)).not.toContain('Catas del sábado')
    expect(JSON.stringify(res.body)).not.toContain('pagos pendientes')
  })

  it('lista notificaciones persistidas para admin', async () => {
    signInAs('admin')
    supabaseMock.tableData.notifications = [
      {
        id: '00000000-0000-0000-0000-000000000046',
        channel: 'control',
        title: 'Nueva solicitud de cotización',
        body: 'Cliente Real solicita información para una boda con 80 personas.',
        status: 'pending',
        sent_at: '2026-08-10T10:00:00.000Z',
        read_at: null,
        created_at: '2026-08-10T10:00:00.000Z',
      },
    ]

    const res = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', 'Bearer admin-token')

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject([
      {
        id: '00000000-0000-0000-0000-000000000046',
        channel: 'control',
        title: 'Nueva solicitud de cotización',
        body: 'Cliente Real solicita información para una boda con 80 personas.',
        status: 'pending',
      },
    ])
    expect(res.body.unreadCount).toBe(1)
    expect(JSON.stringify(res.body)).not.toContain('Campaña de cena romántica')
  })

  it('marca la notificación operativa como leída', async () => {
    signInAs('admin')
    const notificationId = '00000000-0000-0000-0000-000000000047'
    supabaseMock.tableData.notifications = [{
      id: notificationId,
      channel: 'control',
      title: 'Nueva reservación desde la app',
      body: 'Cliente Real creó una reservación.',
      status: 'pending',
      data: { deepLink: '/control/reservaciones?reservationId=reservation-real' },
      read_at: null,
      created_at: '2026-08-16T10:00:00.000Z',
    }]

    const res = await request(app)
      .post(`/api/admin/notifications/${notificationId}/read`)
      .set('Authorization', 'Bearer admin-token')

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: notificationId, status: 'read' })
    expect(supabaseMock.tableData.notifications[0]).toMatchObject({ status: 'read' })
  })
})

describe('Trazabilidad App a Centro de Control', () => {
  const customerUser = {
    id: '00000000-0000-0000-0000-000000000041',
    email: 'cliente.trace@alqia.tech',
    created_at: '2026-08-10T00:00:00.000Z',
    email_confirmed_at: '2026-08-10T00:00:00.000Z',
  }
  const customerId = '00000000-0000-0000-0000-000000000042'

  function authenticateAs(role: string) {
    supabaseMock.authUser = customerUser
    supabaseMock.tableData.user_roles = [{ user_id: customerUser.id, roles: { code: role } }]
  }

  it('acepta actividad no sensible sin sesión y no requiere autenticación para navegar', async () => {
    const res = await request(app)
      .post('/api/customer/activity')
      .send({
        sessionId: 'app-anonymous-session',
        eventName: 'wine_list_viewed',
        eventKey: 'app-anonymous-session:catalog:1',
        metadata: { route: '/app/vinos', locale: 'es' },
      })

    expect(res.status).toBe(202)
    expect(res.body.data).toEqual({ accepted: true, duplicate: false })
    expect(supabaseMock.tableData.customer_app_events).toMatchObject([{
      customer_id: null,
      event_name: 'wine_list_viewed',
      module: 'content',
    }])
  })

  it('vincula al customer autenticado, deduplica y lo expone solo a roles administrativos', async () => {
    authenticateAs('customer')
    supabaseMock.tableData.customers = [{ id: customerId, user_id: customerUser.id, display_name: 'Cliente Trace' }]
    const payload = {
      sessionId: 'app-authenticated-session',
      eventName: 'cart_item_added',
      entityType: 'cart',
      entityId: 'cart-trace-1',
      eventKey: 'app-authenticated-session:cart:add:1',
      metadata: { itemType: 'wine', quantity: 1 },
    }

    const first = await request(app).post('/api/customer/activity').set('Authorization', 'Bearer customer-token').send(payload)
    const duplicate = await request(app).post('/api/customer/activity').set('Authorization', 'Bearer customer-token').send(payload)
    const forbidden = await request(app).get('/api/admin/activity').set('Authorization', 'Bearer customer-token')

    expect(first.status).toBe(202)
    expect(duplicate.body.data).toEqual({ accepted: true, duplicate: true })
    expect(forbidden.status).toBe(403)
    expect(supabaseMock.tableData.customer_app_events).toMatchObject([{
      customer_id: customerId,
      event_name: 'cart_item_added',
      entity_id: 'cart-trace-1',
      module: 'cart',
    }])

    authenticateAs('admin')
    const admin = await request(app).get('/api/admin/activity').set('Authorization', 'Bearer admin-token')
    expect(admin.status).toBe(200)
    expect(admin.body.data).toHaveLength(1)
    expect(admin.body.data[0]).toMatchObject({ eventName: 'cart_item_added', module: 'cart' })
  })

  it('convierte una reservación de la app en alerta accionable del Centro de Control', async () => {
    authenticateAs('customer')
    supabaseMock.tableData.customers = [{ id: customerId, user_id: customerUser.id, display_name: 'Cliente Trace' }]

    const created = await request(app)
      .post('/api/customer/activity')
      .set('Authorization', 'Bearer customer-token')
      .send({
        sessionId: 'app-reservation-session',
        eventName: 'reservation_created',
        entityType: 'reservation',
        entityId: 'reservation-trace-1',
        eventKey: 'app-reservation-session:reservation:create:1',
        metadata: { result: 'succeeded' },
      })

    expect(created.status).toBe(202)
    expect(supabaseMock.tableData.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'control',
        title: 'Nueva reservación desde la app',
        status: 'pending',
        data: expect.objectContaining({
          eventName: 'reservation_created',
          entityId: 'reservation-trace-1',
          deepLink: '/control/reservaciones?reservationId=reservation-trace-1',
        }),
      }),
    ]))

    authenticateAs('admin')
    const alerts = await request(app).get('/api/admin/notifications').set('Authorization', 'Bearer admin-token')
    expect(alerts.status).toBe(200)
    expect(alerts.body.data[0].deepLink).toBe('/control/reservaciones?reservationId=reservation-trace-1')
  })

  it('deriva estados de carrito desde registros reales y conserva el umbral comercial sin inventarlo', async () => {
    authenticateAs('admin')
    supabaseMock.tableData.customers = [{ id: customerId, user_id: customerUser.id, display_name: 'Cliente Trace' }]
    supabaseMock.tableData.carts = [{
      id: 'cart-trace-1', customer_id: customerId, cart_status: 'active', currency: 'MXN',
      created_at: '2026-08-10T10:00:00.000Z', updated_at: '2026-08-10T10:05:00.000Z',
      customers: { id: customerId, display_name: 'Cliente Trace' },
      cart_items: [{ id: 'item-trace-1', cart_id: 'cart-trace-1', item_type: 'wine', item_id: 'wine-1', name_snapshot: 'Vino real', quantity: 2, unit_price_snapshot: 650, currency: 'MXN' }],
    }]
    supabaseMock.tableData.customer_app_events = [{
      id: 'event-trace-1', customer_id: customerId, session_id: 'app-authenticated-session', event_name: 'checkout_started', entity_type: 'cart', entity_id: 'cart-trace-1', source: 'backend', metadata: {}, occurred_at: '2026-08-10T10:06:00.000Z', created_at: '2026-08-10T10:06:00.000Z', module: 'checkout', status: 'started', result: 'started',
    }]

    const list = await request(app).get('/api/admin/carts').set('Authorization', 'Bearer admin-token')
    const detail = await request(app).get('/api/admin/carts/cart-trace-1').set('Authorization', 'Bearer admin-token')

    expect(list.status).toBe(200)
    expect(list.body.configuration.abandonmentThresholdMinutes).toBeNull()
    expect(list.body.data[0]).toMatchObject({ status: 'checkout_started', quantity: 2, estimatedValue: 1300 })
    expect(list.body.data[0].items[0]).toMatchObject({ unitPrice: 650, subtotal: 1300 })
    const cartsSelect = supabaseMock.selectQueries.find((query) => query.includes('cart_items('))
    expect(cartsSelect).toContain('unit_price_snapshot')
    expect(cartsSelect).not.toContain('unit_price,subtotal')
    expect(detail.status).toBe(200)
    expect(detail.body.data.events[0]).toMatchObject({ eventName: 'checkout_started' })
  })

  it('permite enviar una cotización real por Resend desde Centro de Control', async () => {
    authenticateAs('marketing')
    supabaseMock.tableData.quote_requests = [{
      id: '00000000-0000-0000-0000-000000000270',
      quote_number: 'HDL-COT-REAL',
      customer_id: customerId,
      user_id: customerUser.id,
      event_category: 'social',
      event_type: 'Boda',
      preferred_date: '2026-09-15',
      alternative_date: null,
      preferred_start_time: '18:00',
      preferred_end_time: '23:00',
      guest_count: 80,
      venue_space_id: null,
      venue_space_name: 'Jardín',
      food_required: 'yes',
      food_type: 'cena',
      wine_required: 'yes',
      wine_option: 'maridaje',
      requested_services: ['banquete'],
      contact_first_name: 'Cliente',
      contact_last_name: 'Cotización',
      contact_email: 'cliente.cotizacion@example.com',
      contact_phone: '4490000000',
      company_name: null,
      notes: 'Solicita propuesta formal.',
      status: 'new',
      source: 'mobile_app',
      assigned_to: null,
      admin_notes: null,
      contacted_at: null,
      quoted_at: null,
      closed_at: null,
      idempotency_key: 'quote-real',
      metadata: { language: 'es-MX' },
      created_at: '2026-08-12T00:00:00.000Z',
      updated_at: '2026-08-12T00:00:00.000Z',
      customers: { id: customerId, first_name: 'Cliente', last_name: 'Cotización', email: 'cliente.cotizacion@example.com', phone: '4490000000' },
    }]

    const res = await request(app)
      .post('/api/admin/quote-requests/00000000-0000-0000-0000-000000000270/send-quote')
      .set('Authorization', 'Bearer marketing-token')
      .send({
        subject: 'Propuesta Hacienda de Letras',
        message: 'Compartimos la propuesta solicitada para tu evento.',
        quoteAmount: 75000,
        currency: 'MXN',
        validUntil: '2026-09-01',
      })

    expect(res.status).toBe(202)
    expect(res.body.data.quote).toMatchObject({ status: 'quoted', quoteNumber: 'HDL-COT-REAL' })
    expect(res.body.data.email).toMatchObject({
      status: 'pending_configuration',
      recipientEmail: 'cliente.cotizacion@example.com',
      subject: 'Propuesta Hacienda de Letras',
    })
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox[0]).toMatchObject({
      template_key: 'quote.sent',
      recipient_email: 'cliente.cotizacion@example.com',
      status: 'pending_configuration',
    })
    expect(supabaseMock.tableData.audit_logs[0]).toMatchObject({ action: 'quote_email_sent' })
  })

  it('crea una cotización manual completa y permite editar el mismo expediente', async () => {
    authenticateAs('marketing')
    supabaseMock.tableData.quote_requests = []

    const create = await request(app)
      .post('/api/admin/quote-requests')
      .set('Authorization', 'Bearer marketing-token')
      .send({
        customerId: null,
        eventCategory: 'business',
        eventType: 'Cena empresarial',
        preferredDate: '2026-10-12',
        alternativeDate: '2026-10-19',
        preferredStartTime: '18:30',
        preferredEndTime: '23:00',
        guestCount: 120,
        venueSpaceId: null,
        venueSpaceName: 'Jardín Central',
        foodRequired: 'yes',
        foodType: 'Menú de tres tiempos',
        wineRequired: 'yes',
        wineOption: 'Maridaje Hacienda',
        requestedServices: ['Mobiliario', 'Música'],
        contactFirstName: 'Cliente',
        contactLastName: 'Manual',
        contactEmail: 'cliente.manual@example.com',
        contactPhone: '4490000000',
        companyName: 'Empresa Demo',
        notes: 'Primera versión',
        language: 'es',
        source: 'Centro de control',
        adminNotes: 'Captura manual',
        idempotencyKey: 'quote-manual-complete-2026',
      })

    expect(create.status).toBe(201)
    expect(create.body.data).toMatchObject({
      eventType: 'Cena empresarial',
      alternativeDate: '2026-10-19',
      preferredStartTime: '18:30',
      preferredEndTime: '23:00',
      foodRequired: 'yes',
      wineRequired: 'yes',
      source: 'Centro de control',
    })

    const edit = await request(app)
      .patch(`/api/admin/quote-requests/${create.body.data.id}`)
      .set('Authorization', 'Bearer marketing-token')
      .send({
        eventType: 'Cena de aniversario empresarial',
        guestCount: 135,
        venueSpaceName: 'Jardín Nogales',
        requestedServices: ['Mobiliario', 'Música', 'Fotografía'],
        source: 'mobile_app',
        status: 'in_progress',
        adminNotes: 'Expediente corregido desde Cotizaciones',
      })

    expect(edit.status).toBe(200)
    expect(edit.body.data).toMatchObject({
      eventType: 'Cena de aniversario empresarial',
      guestCount: 135,
      venueSpaceName: 'Jardín Nogales',
      requestedServices: ['Mobiliario', 'Música', 'Fotografía'],
      source: 'mobile_app',
      status: 'in_progress',
      adminNotes: 'Expediente corregido desde Cotizaciones',
    })
  })

  it('responde la IA ejecutiva sólo con permiso real y cifras operativas actuales', async () => {
    authenticateAs('admin')
    supabaseMock.tableData.executive_ai_access = [{
      user_id: customerUser.id,
      feature_code: 'executive_ai_assistant',
      active: true,
    }]
    supabaseMock.tableData.executive_ai_queries = []
    supabaseMock.tableData.customers = [{ id: customerId }]
    supabaseMock.tableData.reservations = []
    supabaseMock.tableData.orders = []
    supabaseMock.tableData.payments = []
    supabaseMock.tableData.order_items = [{ item_type: 'wine', name_snapshot: 'El Greco', quantity: 4, subtotal: 2400, created_at: new Date().toISOString() }]
    supabaseMock.tableData.experiences = []
    supabaseMock.tableData.events = []
    supabaseMock.tableData.lodging_stays = []
    supabaseMock.tableData.lodging_units = []
    supabaseMock.tableData.shipments = []
    supabaseMock.tableData.campaigns = []
    supabaseMock.tableData.promotions = []
    supabaseMock.tableData.memberships = []
    supabaseMock.tableData.quote_requests = [{ status: 'new', event_category: 'social', source: 'mobile_app', guest_count: 80, created_at: new Date().toISOString() }]
    supabaseMock.tableData.customer_app_events = []
    supabaseMock.tableData.inventory_items = []
    supabaseMock.tableData.experience_slots = []
    supabaseMock.tableData.carts = []
    supabaseMock.tableData.map_pois = []

    const status = await request(app)
      .get('/api/admin/executive-assistant/status')
      .set('Authorization', 'Bearer admin-token')
    const response = await request(app)
      .post('/api/admin/executive-assistant/message')
      .set('Authorization', 'Bearer admin-token')
      .send({ message: '¿Cuántas cotizaciones hay?', history: [] })

    expect(status.status).toBe(200)
    expect(status.body.data).toMatchObject({ enabled: true, readOnly: true })
    expect(response.status).toBe(200)
    expect(response.body.data.answer).toContain('1 solicitudes de cotización')
    expect(response.body.data.answer).toContain('mobile_app')
    expect(supabaseMock.tableData.executive_ai_queries[0]).toMatchObject({ status: 'completed', query_mode: 'text' })
  })

  it('responde ingresos de un evento con QR y check-ins reales sin usar mocks de respuesta', async () => {
    authenticateAs('admin')
    const eventId = 'event-salsa'
    const ticketTypeId = 'ticket-salsa'
    const reservationId = 'reservation-salsa'
    const operatorId = 'operator-scan'
    const eventRelation = {
      id: eventId,
      title: 'Noche de salsa, vino y terraza',
      start_at: '2026-08-24T03:00:00.000Z',
      end_at: '2026-08-24T07:00:00.000Z',
      capacity: 80,
      sold_count: 2,
      reserved_count: 2,
      cover_image_url: null,
    }
    const customerRelation = {
      display_name: 'Patty Garibay',
      first_name: 'Patty',
      last_name: 'Garibay',
    }
    const ticketTypeRelation = {
      id: ticketTypeId,
      name: 'Acceso general',
      capacity: 80,
      sold_count: 2,
      reserved_count: 2,
      events: eventRelation,
    }
    const reservationRelation = {
      id: reservationId,
      reservation_number: 'RES-SALSA-001',
      reservation_type: 'event',
      people_count: 2,
      status: 'confirmed',
      source: 'mobile_app',
      total: 400,
      currency: 'MXN',
      created_at: '2026-08-23T20:00:00.000Z',
      customers: customerRelation,
      events: eventRelation,
      event_ticket_types: ticketTypeRelation,
    }
    const firstPass = {
      id: 'pass-salsa-1',
      reservation_id: reservationId,
      event_ticket_type_id: ticketTypeId,
      pass_number: 'PASS-SALSA-001',
      status: 'issued',
      valid_until: '2026-08-24T19:00:00.000Z',
      issued_at: '2026-08-23T20:10:00.000Z',
      created_at: '2026-08-23T20:10:00.000Z',
      reservations: reservationRelation,
      event_ticket_types: ticketTypeRelation,
    }
    supabaseMock.tableData.executive_ai_access = [{
      user_id: customerUser.id,
      feature_code: 'executive_ai_assistant',
      active: true,
    }]
    supabaseMock.tableData.executive_ai_queries = []
    supabaseMock.tableData.events = [{
      ...eventRelation,
      slug: 'noche-salsa-vino-terraza',
      subtitle: 'Salsa y vino',
      description: 'Evento de salsa en terraza',
      venue: 'Restaurante Centro',
      status: 'published',
      visible_in_app: true,
      sales_enabled: true,
      created_at: '2026-08-20T00:00:00.000Z',
      updated_at: '2026-08-20T00:00:00.000Z',
    }]
    supabaseMock.tableData.experiences = []
    supabaseMock.tableData.reservations = [reservationRelation]
    supabaseMock.tableData.event_ticket_types = [ticketTypeRelation]
    supabaseMock.tableData.access_passes = [
      firstPass,
      {
        ...firstPass,
        id: 'pass-salsa-2',
        pass_number: 'PASS-SALSA-002',
      },
    ]
    supabaseMock.tableData.checkins = [{
      id: 'checkin-salsa-1',
      access_pass_id: 'pass-salsa-1',
      checked_in_by: operatorId,
      checked_in_at: '2026-08-24T03:30:00.000Z',
      reversed_at: null,
      created_at: '2026-08-24T03:30:00.000Z',
      access_passes: firstPass,
    }]
    supabaseMock.tableData.profiles = [{
      id: operatorId,
      display_name: 'Recepción Hacienda',
      first_name: 'Recepción',
      last_name: 'Hacienda',
    }]

    const response = await request(app)
      .post('/api/admin/executive-assistant/message')
      .set('Authorization', 'Bearer admin-token')
      .send({ message: 'CEO: ¿cuántas personas han ingresado al evento salsa?', history: [] })

    expect(response.status).toBe(200)
    expect(response.body.data.answer).toContain('Para Noche de salsa, vino y terraza')
    expect(response.body.data.answer).toContain('han ingresado 1 persona por QR leído')
    expect(response.body.data.answer).toContain('Hay 2 pases activos, 1 pendiente')
    expect(response.body.data.answer).toContain('Recepción Hacienda')
    expect(response.body.data.answer).toContain('Eventos/Experiencias, Reservaciones, Tipos de boleto, Pases QR y Check-ins')
    expect(supabaseMock.tableData.executive_ai_queries[0]).toMatchObject({ status: 'completed', query_mode: 'text' })
  })

  it('responde folios exactos de órdenes con partidas, pago y logística reales', async () => {
    authenticateAs('admin')
    const orderId = 'order-direct-1'
    supabaseMock.tableData.executive_ai_access = [{
      user_id: customerUser.id,
      feature_code: 'executive_ai_assistant',
      active: true,
    }]
    supabaseMock.tableData.executive_ai_queries = []
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'ORD-20260824-REAL001',
      customer_id: 'customer-real-1',
      reservation_id: null,
      subtotal: 900,
      discount_total: 0,
      tax_total: 0,
      shipping_total: 0,
      total: 900,
      currency: 'MXN',
      status: 'paid',
      source: 'mobile_app',
      paid_at: '2026-08-24T02:00:00.000Z',
      requires_shipping: true,
      shipping_status: 'assigned',
      created_at: '2026-08-24T01:50:00.000Z',
      updated_at: '2026-08-24T02:00:00.000Z',
      customers: {
        display_name: 'Marlén Molina',
        first_name: 'Marlén',
        last_name: 'Molina',
        source: 'mobile_app',
        segment: 'cliente',
      },
    }]
    supabaseMock.tableData.order_items = [{
      id: 'item-direct-1',
      order_id: orderId,
      item_type: 'wine',
      name_snapshot: 'Dulce Apapacho',
      sku_snapshot: 'DULCE-001',
      quantity: 2,
      unit_price: 450,
      subtotal: 900,
      created_at: '2026-08-24T01:51:00.000Z',
    }]
    supabaseMock.tableData.payments = [{
      id: 'payment-direct-1',
      order_id: orderId,
      provider: 'stripe',
      amount: 900,
      currency: 'MXN',
      status: 'paid',
      payment_method_type: 'card',
      payment_reference: 'Pago app',
      paid_at: '2026-08-24T02:00:00.000Z',
      refunded_amount: 0,
      provider_environment: 'test',
      created_at: '2026-08-24T01:59:00.000Z',
      updated_at: '2026-08-24T02:00:00.000Z',
    }]
    supabaseMock.tableData.shipments = [{
      id: 'shipment-direct-1',
      order_id: orderId,
      shipment_number: 'SHIP-REAL001',
      carrier: 'Estafeta',
      tracking_number: 'GUIA-REAL-001',
      status_text: 'guía asignada',
      created_at: '2026-08-24T02:10:00.000Z',
      updated_at: '2026-08-24T02:10:00.000Z',
    }]

    const response = await request(app)
      .post('/api/admin/executive-assistant/message')
      .set('Authorization', 'Bearer admin-token')
      .send({ message: 'Dime todo de la orden ORD-20260824-REAL001', history: [] })

    expect(response.status).toBe(200)
    expect(response.body.data.answer).toContain('Orden ORD-20260824-REAL001')
    expect(response.body.data.answer).toContain('cliente Marlén Molina')
    expect(response.body.data.answer).toContain('origen App')
    expect(response.body.data.answer).toContain('total $900.00')
    expect(response.body.data.answer).toContain('2 x Dulce Apapacho')
    expect(response.body.data.answer).toContain('stripe: paid')
    expect(response.body.data.answer).toContain('Estafeta GUIA-REAL-001')
    expect(response.body.data.answer).toContain('Consulta local de solo lectura')
    expect(supabaseMock.tableData.executive_ai_queries[0]).toMatchObject({ status: 'completed', query_mode: 'text' })
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

  it('devuelve contenido público sin caché persistente y sin credenciales', async () => {
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
    expect(res.headers['cache-control']).toContain('no-store')
    expect(JSON.stringify(res.body)).not.toContain('SERVICE_ROLE')
    expect(JSON.stringify(res.body)).not.toContain('eyJhbGci')
  })

  it('sirve contenido público traducido con fallback a español', async () => {
    const wineId = '00000000-0000-0000-0000-000000000021'
    supabaseMock.tableData.wines = [
      {
        id: wineId,
        slug: 'vino-reserva',
        name: 'Reserva Especial',
        subtitle: 'Selección de la casa',
        status: 'published',
        locale: 'es-MX',
        visible_in_app: true,
      },
    ]
    supabaseMock.tableData.content_translations = [
      {
        id: '00000000-0000-0000-0000-000000000022',
        entity_type: 'wine',
        entity_id: wineId,
        locale: 'en-US',
        slug: 'estate-reserve',
        title: 'Estate Reserve',
        subtitle: 'House selection',
        publication_status: 'published',
        translation_status: 'ready',
        visible_in_app: true,
      },
    ]

    const list = await request(app).get('/api/public/wines?locale=en-US')
    const detail = await request(app).get('/api/public/wines/estate-reserve?locale=en-US')

    expect(list.status).toBe(200)
    expect(list.body.data[0]).toMatchObject({
      slug: 'estate-reserve',
      name: 'Estate Reserve',
      subtitle: 'House selection',
      locale: 'en-US',
    })
    expect(detail.status).toBe(200)
    expect(detail.body.data).toMatchObject({
      id: wineId,
      slug: 'estate-reserve',
      name: 'Estate Reserve',
    })
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

  it('mantiene campañas fuera de la app y opera envío masivo con audiencia consentida', async () => {
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000260',
      email: 'marketing@alqia.tech',
      created_at: '2026-08-12T00:00:00.000Z',
      email_confirmed_at: '2026-08-12T00:00:00.000Z',
    }
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: 'marketing' } }]
    supabaseMock.tableData.campaigns = [{
      id: '00000000-0000-0000-0000-000000000261',
      name: 'Vendimia Privada',
      channel: 'email',
      status: 'draft',
      visible_in_app: false,
      audience_definition: { segment: 'wine_club' },
      content: { subject: 'Invitación Hacienda', body: 'Te esperamos en Hacienda de Letras.' },
      created_at: '2026-08-12T00:00:00.000Z',
      updated_at: '2026-08-12T00:00:00.000Z',
    }]
    supabaseMock.tableData.customers = [
      {
        id: '00000000-0000-0000-0000-000000000262',
        user_id: '00000000-0000-0000-0000-000000000263',
        customer_number: 'CLI-001',
        first_name: 'Cliente',
        last_name: 'Consentido',
        email: 'cliente.consentido@example.com',
        segment: 'wine_club',
        marketing_email_consent: true,
        marketing_push_consent: true,
        total_spend: 1500,
        total_visits: 2,
        preferred_language: 'es-MX',
        metadata: { city: 'Aguascalientes' },
        status: 'published',
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000264',
        email: 'sin.consentimiento@example.com',
        segment: 'wine_club',
        marketing_email_consent: false,
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ]

    const preview = await request(app)
      .post('/api/admin/campaigns/audience-preview')
      .set('Authorization', 'Bearer marketing-token')
      .send({ segment: 'wine_club', channels: ['email', 'push', 'in_app'] })
    const send = await request(app)
      .post('/api/admin/campaigns/00000000-0000-0000-0000-000000000261/send')
      .set('Authorization', 'Bearer marketing-token')
      .send({ audience: { segment: 'wine_club' }, channels: ['email', 'push', 'in_app'] })
    const publicCampaigns = await request(app).get('/api/public/campaigns')

    expect(preview.status).toBe(200)
    expect(preview.body.data).toMatchObject({
      total: 1,
      consentRequired: 'channel_specific_marketing_consent',
      channels: ['email', 'push', 'in_app'],
      channelTotals: { email: 1, push: 1, in_app: 1 },
    })
    expect(send.status).toBe(202)
    expect(send.body.data).toMatchObject({ recipients: 1, pending: 0, sent: 1, channels: ['email', 'push', 'in_app'] })
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox[0]).toMatchObject({
      template_key: 'campaign.marketing',
      recipient_email: 'cliente.consentido@example.com',
      status: 'pending_configuration',
    })
    expect(supabaseMock.tableData.campaign_recipients).toHaveLength(1)
    expect(supabaseMock.tableData.notifications).toHaveLength(1)
    expect(supabaseMock.tableData.campaign_recipient_deliveries).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', customer_id: '00000000-0000-0000-0000-000000000262' }),
      expect.objectContaining({ channel: 'push', customer_id: '00000000-0000-0000-0000-000000000262' }),
      expect.objectContaining({ channel: 'in_app', customer_id: '00000000-0000-0000-0000-000000000262' }),
    ]))
    expect(supabaseMock.tableData.campaigns[0]).toMatchObject({
      status: 'completed',
      visible_in_app: false,
    })
    expect(publicCampaigns.status).toBe(404)
  })

  it('marca el canal email como enviado cuando Resend acepta la campaña', async () => {
    ;(env as Record<string, string>).RESEND_API_KEY = 'test_resend_key'
    ;(env as Record<string, string>).RESEND_FROM_EMAIL = 'Hacienda de Letras <notificaciones@admhaciendadeletras.com>'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'email_campaign_123' }),
    })))

    const adminUser = {
      id: '00000000-0000-0000-0000-000000000275',
      email: 'marketing@alqia.tech',
      created_at: '2026-08-12T00:00:00.000Z',
      email_confirmed_at: '2026-08-12T00:00:00.000Z',
    }
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: 'marketing' } }]
    supabaseMock.tableData.campaigns = [{
      id: '00000000-0000-0000-0000-000000000276',
      name: 'QA Resend aceptado',
      channel: 'email',
      status: 'draft',
      visible_in_app: false,
      audience_definition: { emails: ['mau@alqia.tech'] },
      content: { subject: 'Prueba real de campaña', body: 'Validación de estado real del outbox.' },
      created_at: '2026-08-12T00:00:00.000Z',
      updated_at: '2026-08-12T00:00:00.000Z',
    }]
    supabaseMock.tableData.customers = [{
      id: '00000000-0000-0000-0000-000000000277',
      email: 'mau@alqia.tech',
      first_name: 'Mau',
      segment: 'cliente',
      marketing_email_consent: true,
      preferred_language: 'es-MX',
      status: 'published',
      created_at: '2026-08-01T00:00:00.000Z',
    }]

    const send = await request(app)
      .post('/api/admin/campaigns/00000000-0000-0000-0000-000000000276/send')
      .set('Authorization', 'Bearer marketing-token')
      .send({ audience: { emails: ['mau@alqia.tech'] }, channels: ['email'] })

    const outbox = supabaseMock.tableData.email_outbox[0] as { id?: string; status?: string; provider_message_id?: string }
    expect(send.status).toBe(202)
    expect(send.body.data).toMatchObject({ recipients: 1, pending: 0, sent: 1, failed: 0, channels: ['email'] })
    expect(outbox).toMatchObject({ status: 'sent', provider_message_id: 'email_campaign_123' })
    expect(supabaseMock.tableData.campaign_recipient_deliveries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'email',
        customer_id: '00000000-0000-0000-0000-000000000277',
        provider_reference: outbox.id,
        status: 'sent',
        error_code: null,
      }),
    ]))
  })

  it('permite probar campañas con una lista exacta de correos sin ampliar audiencia', async () => {
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000270',
      email: 'marketing@alqia.tech',
      created_at: '2026-08-12T00:00:00.000Z',
      email_confirmed_at: '2026-08-12T00:00:00.000Z',
    }
    supabaseMock.authUser = adminUser
    supabaseMock.tableData.user_roles = [{ user_id: adminUser.id, roles: { code: 'marketing' } }]
    supabaseMock.tableData.campaigns = [{
      id: '00000000-0000-0000-0000-000000000271',
      name: 'QA campaña controlada',
      channel: 'email',
      status: 'draft',
      visible_in_app: false,
      audience_definition: { segment: 'cliente' },
      content: { subject: 'Prueba QA Hacienda', body: 'Validación controlada de campaña.' },
      created_at: '2026-08-12T00:00:00.000Z',
      updated_at: '2026-08-12T00:00:00.000Z',
    }]
    supabaseMock.tableData.customers = [
      {
        id: '00000000-0000-0000-0000-000000000272',
        email: 'pcgaribayg@gmail.com',
        first_name: 'Patricia',
        segment: 'cliente',
        marketing_email_consent: true,
        preferred_language: 'es-MX',
        status: 'published',
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000273',
        email: 'mau@alqia.tech',
        first_name: 'Mau',
        segment: 'cliente',
        marketing_email_consent: true,
        preferred_language: 'es-MX',
        status: 'published',
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000274',
        email: 'otra.persona@example.com',
        first_name: 'Otra',
        segment: 'cliente',
        marketing_email_consent: true,
        preferred_language: 'es-MX',
        status: 'published',
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ]

    const audience = {
      emails: ['pcgaribayg@gmail.com', 'mau@alqia.tech'],
      channels: ['email'],
    }
    const preview = await request(app)
      .post('/api/admin/campaigns/audience-preview')
      .set('Authorization', 'Bearer marketing-token')
      .send(audience)
    const send = await request(app)
      .post('/api/admin/campaigns/00000000-0000-0000-0000-000000000271/send')
      .set('Authorization', 'Bearer marketing-token')
      .send({ audience, channels: ['email'] })

    expect(preview.status).toBe(200)
    expect(preview.body.data).toMatchObject({
      total: 2,
      channels: ['email'],
      channelTotals: { email: 2 },
    })
    expect(preview.body.data.sample.map((item: { email: string }) => item.email).sort()).toEqual([
      'mau@alqia.tech',
      'pcgaribayg@gmail.com',
    ])
    expect(send.status).toBe(202)
    expect(send.body.data).toMatchObject({ recipients: 2, pending: 2, sent: 0, channels: ['email'] })
    expect(supabaseMock.tableData.email_outbox.map((item) => (item as { recipient_email: string }).recipient_email).sort()).toEqual([
      'mau@alqia.tech',
      'pcgaribayg@gmail.com',
    ])
    expect(supabaseMock.tableData.campaign_recipient_deliveries).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', customer_id: '00000000-0000-0000-0000-000000000272', status: 'pending_configuration' }),
      expect.objectContaining({ channel: 'email', customer_id: '00000000-0000-0000-0000-000000000273', status: 'pending_configuration' }),
    ]))
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
    supabaseMock.tableData.reservations = [{
      id: '11111111-1111-4111-8111-111111111074',
      reservation_number: 'RES-FASE7B-PENDING',
      customer_id: '11111111-1111-4111-8111-111111111075',
      reservation_type: 'experience',
      people_count: 2,
      subtotal: 1300,
      discount_total: 0,
      tax_total: 0,
      total: 1300,
      currency: 'MXN',
      status: 'pending',
      payment_status: 'not_required',
      source: 'Centro de control',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    }]
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
      item_id: '33333333-3333-4333-8333-333333333078',
      item_type: 'wine',
      name_snapshot: 'Precioso Regalo',
      sku_snapshot: 'PR-750',
      quantity: 2,
      unit_price: 600,
      subtotal: 1200,
      metadata: {},
      created_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.wines = [{
      id: '33333333-3333-4333-8333-333333333078',
      cover_image_url: 'https://cdn.haciendadeletras.test/precioso-regalo.webp',
    }]

    const list = await request(app).get('/api/admin/orders').set('Authorization', 'Bearer viewer-token')
    const items = await request(app).get(`/api/admin/orders/${orderId}/items`).set('Authorization', 'Bearer viewer-token')
    const exported = await request(app).get('/api/admin/orders/export').set('Authorization', 'Bearer viewer-token')

    expect(list.status).toBe(200)
    expect(list.body.data[0]).toMatchObject({
      orderNumber: 'ORD-FASE7D',
      paidAmount: null,
      financialRestricted: true,
      itemSummary: 'Precioso Regalo',
      itemImageUrl: 'https://cdn.haciendadeletras.test/precioso-regalo.webp',
      itemTypes: ['wine'],
      itemCount: 1,
      totalQuantity: 2,
    })
    expect(items.status).toBe(200)
    expect(items.body.data[0].nameSnapshot).toBe('Precioso Regalo')
    expect(items.body.data[0].imageUrl).toBe('https://cdn.haciendadeletras.test/precioso-regalo.webp')
    expect(items.body.data[0].unitPrice).toBeNull()
    expect(exported.status).toBe(403)
  })

  it('crea orden mediante RPC e impide payloads inválidos', async () => {
    signInAs('admin')
    seedOrder()
    supabaseMock.rpcData.create_order_admin = orderId

    const invalid = await request(app)
      .post('/api/admin/orders')
      .set('Authorization', 'Bearer admin-token')
      .send({ customerId, items: [{ nameSnapshot: 'Sin cantidad', quantity: 0, unitPrice: 100 }] })
    const created = await request(app)
      .post('/api/admin/orders')
      .set('Authorization', 'Bearer admin-token')
      .send({
        customerId,
        items: [{ nameSnapshot: 'Cata privada', quantity: 2, unitPrice: 600 }],
      })

    expect(invalid.status).toBe(422)
    expect(created.status).toBe(201)
    expect(created.body.data.orderNumber).toBe('ORD-FASE7D')
  })

  it('registra pago manual, reembolso y webhook deshabilitado sin simular cobros', async () => {
    signInAs('admin')
    seedOrder('paid')
    seedPayment()
    supabaseMock.rpcData.record_manual_payment = paymentId
    supabaseMock.rpcData.register_refund = paymentId

    const manual = await request(app)
      .post('/api/admin/payments/manual')
      .set('Authorization', 'Bearer admin-token')
      .send({
        orderId,
        amount: 1200,
        paymentMethodType: 'transferencia',
        paymentReference: 'QA-FASE7D',
        notes: 'Pago controlado',
      })
    const refund = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', 'Bearer admin-token')
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

  it('encola correo transaccional al marcar una orden enviada', async () => {
    signInAs('operations')
    seedOrder('paid')
    supabaseMock.tableData.orders = [{
      ...(supabaseMock.tableData.orders[0] as Record<string, unknown>),
      requires_shipping: true,
      shipping_status: 'tracking_assigned',
      customers: {
        display_name: 'Cliente Fase 7D',
        first_name: 'Cliente',
        last_name: 'Fase 7D',
        email: 'cliente.fase7d@alqia.tech',
      },
    }]
    supabaseMock.tableData.order_shipping_addresses = [{
      id: '33333333-3333-4333-8333-333333333078',
      order_id: orderId,
      recipient_name: 'Cliente Fase 7D',
      phone: '4490000000',
      email: 'cliente.fase7d@alqia.tech',
      line1: 'Calle Hacienda 123',
      city: 'Aguascalientes',
      state: 'Aguascalientes',
      postal_code: '20000',
      country: 'MX',
      created_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.shipments = [{
      id: '33333333-3333-4333-8333-333333333079',
      order_id: orderId,
      carrier: 'Paquetería',
      tracking_number: 'TRACK-FASE7D',
      tracking_url: 'https://tracking.example.invalid/TRACK-FASE7D',
      shipping_cost: 0,
      status_text: 'tracking_assigned',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z',
    }]

    const shipped = await request(app)
      .post(`/api/admin/orders/${orderId}/shipping/ship`)
      .set('Authorization', 'Bearer operations-token')
      .send({})

    expect(shipped.status).toBe(200)
    expect(shipped.body.data.shippingStatus).toBe('shipped')
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox[0]).toMatchObject({
      template_key: 'order.shipped',
      recipient_email: 'cliente.fase7d@alqia.tech',
    })
    expect(supabaseMock.tableData.communication_events[0]).toMatchObject({
      event_type: 'order.shipped',
      aggregate_id: orderId,
    })
    expect(supabaseMock.tableData.audit_logs).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'order_shipped', entity_id: orderId })]),
    )
  })

  it('asigna guía y la publica al cliente mediante correo, buzón y enlace de rastreo', async () => {
    signInAs('operations')
    seedOrder('paid')
    supabaseMock.tableData.orders = [{
      ...(supabaseMock.tableData.orders[0] as Record<string, unknown>),
      requires_shipping: true,
      shipping_status: 'preparing',
      customers: {
        user_id: '33333333-3333-4333-8333-333333333090',
        display_name: 'Cliente Fase 7D',
        first_name: 'Cliente',
        last_name: 'Fase 7D',
        email: 'cliente.fase7d@alqia.tech',
      },
    }]
    supabaseMock.tableData.user_preferences = [{
      user_id: '33333333-3333-4333-8333-333333333090',
      transactional_push: true,
    }]
    supabaseMock.tableData.order_shipping_addresses = [{
      id: '33333333-3333-4333-8333-333333333078', order_id: orderId,
      recipient_name: 'Cliente Fase 7D', line1: 'Calle Hacienda 123', city: 'Aguascalientes',
      state: 'Aguascalientes', postal_code: '20000', country: 'MX', created_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.shipments = [{
      id: '33333333-3333-4333-8333-333333333079', order_id: orderId,
      shipping_cost: 0, status_text: 'preparing', created_at: '2026-08-03T00:00:00.000Z', updated_at: '2026-08-03T00:00:00.000Z',
    }]

    const response = await request(app)
      .post(`/api/admin/orders/${orderId}/shipping/tracking`)
      .set('Authorization', 'Bearer operations-token')
      .send({ carrier: 'DHL', trackingNumber: 'HDL-TRACK-001', trackingUrl: 'https://tracking.example.com/HDL-TRACK-001' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      shippingStatus: 'tracking_assigned',
      shipment: { carrier: 'DHL', trackingNumber: 'HDL-TRACK-001', trackingUrl: 'https://tracking.example.com/HDL-TRACK-001' },
    })
    expect(supabaseMock.tableData.email_outbox).toEqual(expect.arrayContaining([
      expect.objectContaining({ template_key: 'order.tracking_assigned', recipient_email: 'cliente.fase7d@alqia.tech' }),
    ]))
    expect(supabaseMock.tableData.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Guía asignada', data: expect.objectContaining({ orderId, status: 'tracking_assigned' }) }),
    ]))
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
  const archivedInventoryItemId = '44444444-4444-4444-8444-444444444019'
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
    supabaseMock.tableData.profiles = [
      { id: adminUser.id, first_name: 'Operador', last_name: 'QA', display_name: 'Operador QA' },
    ]
    supabaseMock.tableData.inventory_locations = [
      { id: locationId, name: 'Cava principal', code: 'CAVA', type: 'warehouse', active: true, created_at: '2026-08-03T00:00:00.000Z' },
      { id: locationTwoId, name: 'Tienda', code: 'SHOP', type: 'store', active: true, created_at: '2026-08-03T00:00:00.000Z' },
    ]
    supabaseMock.tableData.inventory_items = [
      {
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
        wines: { name: 'Vino Fase 7E', sku: 'QA-FASE7E-WINE', cover_image_url: 'https://cdn.haciendadeletras.test/vino-fase7e.webp' },
        inventory_locations: { name: 'Cava principal', code: 'CAVA', type: 'warehouse' },
      },
      {
        id: archivedInventoryItemId,
        wine_id: wineId,
        location_id: locationTwoId,
        sku: 'QA-ARCHIVED-WINE',
        product_name: 'Vino archivado',
        lot_code: 'L-ARCH',
        quantity: 1,
        reserved_quantity: 0,
        minimum_quantity: 1,
        unit_cost: 200,
        status: 'archived',
        updated_at: '2026-08-03T00:00:00.000Z',
        wines: { name: 'Vino archivado', sku: 'QA-ARCHIVED-WINE', cover_image_url: null },
        inventory_locations: { name: 'Tienda', code: 'SHOP', type: 'store' },
      },
    ]
    supabaseMock.tableData.inventory_movements = [{
      id: '44444444-4444-4444-8444-444444444015',
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      movement_type: 'receive',
      quantity: 12,
      from_location_id: null,
      to_location_id: locationId,
      reason: 'Recepción inicial',
      created_by: adminUser.id,
      metadata: { origin: 'control_center', module: 'Inventario' },
      created_at: '2026-08-03T00:00:00.000Z',
      inventory_items: { product_name: 'Vino Fase 7E', sku: 'QA-FASE7E-WINE', wines: { name: 'Vino Fase 7E' } },
      inventory_locations: { name: 'Cava principal', code: 'CAVA' },
      to_location: { name: 'Cava principal', code: 'CAVA', type: 'warehouse' },
    }]
  }

  function seedShipment() {
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'ORD-FASE7E',
      status: 'paid',
      requires_shipping: true,
      shipping_status: 'pending_preparation',
      total: 900,
      currency: 'MXN',
      source: 'control_center',
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
      orders: { order_number: 'ORD-FASE7E', status: 'paid', requires_shipping: true, source: 'control_center', total: 900, currency: 'MXN', created_at: '2026-08-03T00:00:00.000Z', customers: { display_name: 'Cliente Wine Club' } },
      carriers: null,
    }]
    supabaseMock.tableData.order_items = [{
      id: '44444444-4444-4444-8444-444444444091',
      order_id: orderId,
      item_id: wineId,
      item_type: 'wine',
      name_snapshot: 'Vino Fase 7E',
      quantity: 2,
      unit_price: 450,
      subtotal: 900,
      metadata: {},
      created_at: '2026-08-03T00:00:00.000Z',
    }]
    supabaseMock.tableData.wines = [{
      id: wineId,
      cover_image_url: 'https://cdn.haciendadeletras.test/vino-fase7e.webp',
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
    expect(exported.status).toBe(403)
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
    expect(summary.body.data.items[0]).toMatchObject({
      productName: 'Vino Fase 7E',
      imageUrl: 'https://cdn.haciendadeletras.test/vino-fase7e.webp',
      available: 10,
    })
    expect(summary.body.data.items).toHaveLength(1)
    expect(JSON.stringify(summary.body.data.items)).not.toContain('Vino archivado')
    expect(items.status).toBe(200)
    expect(items.body.data).toHaveLength(1)
    expect(movements.status).toBe(200)
    expect(movements.body.data[0]).toMatchObject({
      actorName: 'Operador QA',
      toLocationName: 'Cava principal',
      metadata: { origin: 'control_center', module: 'Inventario' },
    })
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('product')
    expect(exported.text).not.toContain(inventoryItemId)

    const archived = await request(app).get('/api/admin/inventory/items?status=archived').set('Authorization', 'Bearer viewer-token')
    expect(archived.status).toBe(200)
    expect(archived.body.data[0]).toMatchObject({ id: archivedInventoryItemId, status: 'archived' })
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
    const archived = await request(app)
      .patch(`/api/admin/inventory/items/${inventoryItemId}`)
      .set('Authorization', 'Bearer operations-token')
      .send({ status: 'archived', metadata: { archivedFrom: 'control_center' } })
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
    expect(archived.status).toBe(200)
    expect(archived.body.data.status).toBe('archived')
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
    expect(list.body.data[0]).toMatchObject({
      orderType: 'wine',
      productSummary: 'Vino Fase 7E',
      productImageUrl: 'https://cdn.haciendadeletras.test/vino-fase7e.webp',
      productTypes: ['wine'],
      itemCount: 1,
      totalQuantity: 2,
      orderTotal: 900,
      currency: 'MXN',
    })
    expect(history.status).toBe(200)
    expect(created.status).toBe(201)
    expect(shipped.status).toBe(200)
    expect(incident.status).toBe(201)
    expect(delivered.status).toBe(200)
  })

  it('rechaza crear logística para órdenes que no requieren envío físico', async () => {
    signInAs('operations')
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'ORD-FASE7E-NO-SHIPPING',
      status: 'paid',
      requires_shipping: false,
      shipping_status: 'not_required',
      total: 600,
      customers: { display_name: 'Cliente Experiencia', first_name: 'Cliente', last_name: 'Experiencia' },
    }]
    supabaseMock.tableData.order_items = [{
      id: '44444444-4444-4444-8444-444444444090',
      order_id: orderId,
      item_type: 'experience_reservation',
      name_snapshot: 'Cata de vinos',
      quantity: 2,
      unit_price: 300,
      subtotal: 600,
    }]

    const response = await request(app)
      .post('/api/admin/shipments')
      .set('Authorization', 'Bearer operations-token')
      .send({ orderId, carrier: 'Mensajería controlada', destination: 'Aguascalientes' })

    expect(response.status).toBe(422)
    expect(response.body.error.message).toBe('Esta orden no requiere envío')
    expect(supabaseMock.rpcCalls.some((call) => call.name === 'create_shipment')).toBe(false)
  })

  it('lista distribuidores, contactos, órdenes y exporta sin UUID interno', async () => {
    signInAs('admin')
    seedDistributor()

    const distributors = await request(app).get('/api/admin/distributors').set('Authorization', 'Bearer admin-token')
    const contacts = await request(app).get(`/api/admin/distributors/${distributorId}/contacts`).set('Authorization', 'Bearer admin-token')
    const orders = await request(app).get('/api/admin/distributor-orders').set('Authorization', 'Bearer admin-token')
    const items = await request(app).get(`/api/admin/distributor-orders/${distributorOrderId}/items`).set('Authorization', 'Bearer admin-token')
    const exported = await request(app).get('/api/admin/distributors/export').set('Authorization', 'Bearer admin-token')

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
    expect(invalidOrder.status).toBe(403)
    expect(order.status).toBe(403)
    expect(approved.status).toBe(403)
    expect(delivered.status).toBe(403)
  })
})

describe('Fase 8B customer app API', () => {
  const customerUser = {
    id: '55555555-5555-4555-8555-555555555001',
    email: 'cliente.fase8b@alqia.tech',
    created_at: '2026-08-04T00:00:00.000Z',
    email_confirmed_at: '2026-08-04T00:00:00.000Z',
  }
  const customerId = '55555555-5555-4555-8555-555555555002'
  const reservationId = '55555555-5555-4555-8555-555555555003'
  const experienceId = '55555555-5555-4555-8555-555555555004'
  const slotId = '55555555-5555-4555-8555-555555555005'
  const membershipId = '55555555-5555-4555-8555-555555555006'

  function signInCustomer() {
    supabaseMock.authUser = customerUser
    supabaseMock.tableData.user_roles = [{ user_id: customerUser.id, roles: { code: 'customer' } }]
  }

  function seedCustomerRows() {
    supabaseMock.tableData.customers = [{
      id: customerId,
      user_id: customerUser.id,
      customer_number: 'CUS-FASE8B',
      first_name: 'Cliente',
      last_name: 'Fase 8B',
      email: customerUser.email,
      phone: null,
      status: 'active',
    }]
    supabaseMock.tableData.reservations = [
      {
        id: reservationId,
        reservation_number: 'RES-FASE8B',
        customer_id: customerId,
        user_id: customerUser.id,
        experience_id: experienceId,
        experience_slot_id: slotId,
        people_count: 2,
        subtotal: 900,
        total: 900,
        currency: 'MXN',
        status: 'confirmed',
        customer_notes: null,
        created_at: '2026-08-04T00:00:00.000Z',
        updated_at: '2026-08-04T00:00:00.000Z',
        experiences: { id: experienceId, title: 'Cata Fase 8B', slug: 'cata-fase8b', cover_image_url: null, location: 'Hacienda' },
        experience_slots: { id: slotId, start_at: '2026-08-10T18:00:00.000Z', end_at: '2026-08-10T20:00:00.000Z', capacity: 12, confirmed_count: 2 },
      },
      {
        id: '55555555-5555-4555-8555-555555555099',
        reservation_number: 'RES-AJENA',
        customer_id: '55555555-5555-4555-8555-555555555098',
        user_id: '55555555-5555-4555-8555-555555555097',
        people_count: 1,
        subtotal: 450,
        total: 450,
        currency: 'MXN',
        status: 'confirmed',
        created_at: '2026-08-04T00:00:00.000Z',
        updated_at: '2026-08-04T00:00:00.000Z',
      },
    ]
    supabaseMock.tableData.memberships = [{ id: membershipId, customer_id: customerId, status: 'active', created_at: '2026-08-04T00:00:00.000Z' }]
    supabaseMock.tableData.membership_benefits = [{
      id: '55555555-5555-4555-8555-555555555007',
      membership_id: membershipId,
      benefit_code: 'BENEFICIO_REAL',
      description: 'Beneficio visible para cliente',
      used_count: 0,
      created_at: '2026-08-04T00:00:00.000Z',
    }]
  }

  it('rechaza endpoints customer sin sesión', async () => {
    const res = await request(app).get('/api/customer/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('devuelve perfil customer propio sin secretos', async () => {
    signInCustomer()
    supabaseMock.rpcData.get_customer_profile = {
      profile: { id: customerUser.id, firstName: 'Cliente', lastName: 'Fase 8B' },
      customer: { id: customerId, customerNumber: 'CUS-FASE8B', firstName: 'Cliente', lastName: 'Fase 8B', status: 'active' },
      preferences: { language: 'es', marketingEmail: true, marketingPush: false, transactionalPush: true },
    }

    const res = await request(app).get('/api/customer/me').set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(200)
    expect(res.body.data.customer.customerNumber).toBe('CUS-FASE8B')
    expect(JSON.stringify(res.body)).not.toContain('customer-token')
    expect(JSON.stringify(res.body)).not.toContain('SERVICE_ROLE')
  })

  it('lista disponibilidad customer mediante RPC segura', async () => {
    signInCustomer()
    supabaseMock.rpcData.get_bookable_experience_slots = [{
      id: slotId,
      experience_id: experienceId,
      experience_title: 'Cata Fase 8B',
      start_at: '2026-08-10T18:00:00.000Z',
      end_at: '2026-08-10T20:00:00.000Z',
      available: 10,
      price: 450,
      is_bookable: true,
    }]

    const res = await request(app).get(`/api/customer/availability?experienceId=${experienceId}`).set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({ id: slotId, available: 10, price: 450 })
  })

  it('lista solo reservaciones propias del customer', async () => {
    signInCustomer()
    seedCustomerRows()

    const res = await request(app).get('/api/customer/reservations').set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ reservationNumber: 'RES-FASE8B', experienceTitle: 'Cata Fase 8B' })
    expect(JSON.stringify(res.body)).not.toContain('RES-AJENA')
  })

  it('crea, cancela y reprograma reservación propia mediante RPC', async () => {
    signInCustomer()
    seedCustomerRows()
    supabaseMock.rpcData.create_customer_reservation = reservationId
    supabaseMock.rpcData.cancel_customer_reservation = reservationId
    supabaseMock.rpcData.reschedule_customer_reservation = reservationId

    const created = await request(app)
      .post('/api/customer/reservations')
      .set('Authorization', 'Bearer customer-token')
      .send({ experienceSlotId: slotId, peopleCount: 2, language: 'es', idempotencyKey: 'fase8b-reservation' })
    const cancelled = await request(app)
      .post(`/api/customer/reservations/${reservationId}/cancel`)
      .set('Authorization', 'Bearer customer-token')
      .send({ reason: 'Cambio de plan' })
    const rescheduled = await request(app)
      .post(`/api/customer/reservations/${reservationId}/reschedule`)
      .set('Authorization', 'Bearer customer-token')
      .send({ experienceSlotId: slotId, idempotencyKey: 'fase8b-reschedule' })

    expect(created.status).toBe(201)
    expect(cancelled.status).toBe(200)
    expect(rescheduled.status).toBe(200)
  })

  it('valida payload inválido y mantiene errores seguros', async () => {
    signInCustomer()
    const res = await request(app)
      .post('/api/customer/reservations')
      .set('Authorization', 'Bearer customer-token')
      .send({ customerId: customerId, peopleCount: 0 })

    expect(res.status).toBe(422)
    expect(JSON.stringify(res.body)).not.toContain('customer-token')
  })

  it('lee membresía, beneficios y puntos reales del customer', async () => {
    signInCustomer()
    seedCustomerRows()
    supabaseMock.rpcData.get_customer_membership = {
      id: membershipId,
      membershipNumber: 'MBR-FASE8B',
      status: 'active',
      pointsBalance: 30,
      plan: { name: 'Wine Club' },
    }
    supabaseMock.rpcData.get_customer_loyalty_summary = {
      pointsBalance: 30,
      transactions: [{ id: '55555555-5555-4555-8555-555555555008', transactionType: 'earn', points: 30, createdAt: '2026-08-04T00:00:00.000Z' }],
    }

    const membership = await request(app).get('/api/customer/membership').set('Authorization', 'Bearer customer-token')
    const benefits = await request(app).get('/api/customer/membership/benefits').set('Authorization', 'Bearer customer-token')
    const loyalty = await request(app).get('/api/customer/membership/loyalty').set('Authorization', 'Bearer customer-token')

    expect(membership.status).toBe(200)
    expect(membership.body.data.membershipNumber).toBe('MBR-FASE8B')
    expect(benefits.status).toBe(200)
    expect(benefits.body.data[0].benefitCode).toBe('BENEFICIO_REAL')
    expect(loyalty.status).toBe(200)
    expect(loyalty.body.data.pointsBalance).toBe(30)
  })
})

describe('Fase 8C customer cart and checkout API', () => {
  const customerUser = {
    id: '66666666-6666-4666-8666-666666666001',
    email: 'cliente.fase8c@alqia.tech',
    created_at: '2026-08-04T00:00:00.000Z',
    email_confirmed_at: '2026-08-04T00:00:00.000Z',
  }
  const customerId = '66666666-6666-4666-8666-666666666002'
  const cartItemId = '66666666-6666-4666-8666-666666666003'
  const wineId = '66666666-6666-4666-8666-666666666004'
  const orderId = '66666666-6666-4666-8666-666666666005'

  function signInCustomer() {
    supabaseMock.authUser = customerUser
    supabaseMock.tableData.user_roles = [{ user_id: customerUser.id, roles: { code: 'customer' } }]
    supabaseMock.tableData.customers = [{
      id: customerId,
      user_id: customerUser.id,
      customer_number: 'CUS-FASE8C',
      first_name: 'Cliente',
      last_name: 'Fase 8C',
      email: customerUser.email,
      status: 'active',
    }]
  }

  function cartPayload() {
    return {
      id: '66666666-6666-4666-8666-666666666010',
      status: 'active',
      currency: 'MXN',
      items: [{
        id: cartItemId,
        cartId: '66666666-6666-4666-8666-666666666010',
        itemType: 'wine',
        itemId: wineId,
        name: 'Vino Fase 8C',
        sku: 'QA8C-WINE',
        quantity: 2,
        unitPrice: 480,
        subtotal: 960,
        currency: 'MXN',
        metadata: { slug: 'vino-fase8c' },
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z',
      }],
      totals: {
        subtotal: 960,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        total: 960,
        currency: 'MXN',
        paymentStatus: 'pending_payment',
      },
      checkout: {
        canCheckout: true,
        paymentAvailable: false,
        paymentMessage: 'Tu orden fue creada. El pago en línea estará disponible próximamente.',
        fulfillmentMode: 'pickup_at_hacienda',
      },
      createdAt: '2026-08-04T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
    }
  }

  function orderPayload() {
    return {
      id: orderId,
      orderNumber: 'ORD-FASE8C',
      status: 'pending_payment',
      subtotal: 960,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      total: 960,
      currency: 'MXN',
      paymentStatus: 'pending_payment',
      paymentAvailable: false,
      source: 'app',
      createdAt: '2026-08-04T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
      items: [{ id: 'item-order', itemType: 'wine', itemId: wineId, name: 'Vino Fase 8C', quantity: 2, unitPrice: 480, subtotal: 960 }],
      checkout: { message: 'Tu orden fue creada. El pago en línea estará disponible próximamente.' },
    }
  }

  it('rechaza carrito customer sin sesión', async () => {
    const res = await request(app).get('/api/customer/cart')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('lee carrito propio sin secretos ni pagos ficticios', async () => {
    signInCustomer()
    supabaseMock.rpcData.get_customer_cart = cartPayload()

    const res = await request(app).get('/api/customer/cart').set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(200)
    expect(res.body.data.items[0]).toMatchObject({ name: 'Vino Fase 8C', quantity: 2 })
    expect(res.body.data.checkout.paymentAvailable).toBe(false)
    expect(JSON.stringify(res.body)).not.toContain('customer-token')
    expect(JSON.stringify(res.body)).not.toContain('SERVICE_ROLE')
  })

  it('agrega, actualiza, elimina y vacía partidas mediante RPC customer', async () => {
    signInCustomer()
    supabaseMock.rpcData.add_customer_cart_item = cartPayload()
    supabaseMock.rpcData.update_customer_cart_item = cartPayload()
    supabaseMock.rpcData.remove_customer_cart_item = { ...cartPayload(), items: [] }
    supabaseMock.rpcData.clear_customer_cart = { ...cartPayload(), items: [] }

    const added = await request(app)
      .post('/api/customer/cart/items')
      .set('Authorization', 'Bearer customer-token')
      .send({ itemType: 'wine', itemId: wineId, quantity: 1, idempotencyKey: 'fase8c-add-item' })
    const updated = await request(app)
      .patch(`/api/customer/cart/items/${cartItemId}`)
      .set('Authorization', 'Bearer customer-token')
      .send({ quantity: 3, idempotencyKey: 'fase8c-update-item' })
    const removed = await request(app)
      .delete(`/api/customer/cart/items/${cartItemId}`)
      .set('Authorization', 'Bearer customer-token')
    const cleared = await request(app)
      .delete('/api/customer/cart')
      .set('Authorization', 'Bearer customer-token')

    expect(added.status).toBe(201)
    expect(updated.status).toBe(200)
    expect(removed.status).toBe(200)
    expect(cleared.status).toBe(200)
  })

  it('rechaza payload manipulado con precio, total o customerId', async () => {
    signInCustomer()
    const res = await request(app)
      .post('/api/customer/cart/items')
      .set('Authorization', 'Bearer customer-token')
      .send({ itemType: 'wine', itemId: wineId, quantity: 1, unitPrice: 1, total: 1, customerId, idempotencyKey: 'fase8c-invalid' })

    expect(res.status).toBe(422)
    expect(JSON.stringify(res.body)).not.toContain('customer-token')
  })

  it('crea orden customer pending_payment sin crear pago ni marcar paid', async () => {
    signInCustomer()
    supabaseMock.rpcData.create_customer_order_from_cart = orderId
    supabaseMock.rpcData.get_customer_order_detail = orderPayload()
    supabaseMock.rpcData.get_customer_orders = [orderPayload()]

    const created = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', 'Bearer customer-token')
      .send({ idempotencyKey: 'fase8c-order', discountCode: 'QA8C' })
    const list = await request(app).get('/api/customer/orders').set('Authorization', 'Bearer customer-token')
    const detail = await request(app).get(`/api/customer/orders/${orderId}`).set('Authorization', 'Bearer customer-token')

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ orderNumber: 'ORD-FASE8C', status: 'pending_payment', paymentAvailable: false })
    expect(created.body.data.status).not.toBe('paid')
    expect(list.status).toBe(200)
    expect(list.body.data[0].orderNumber).toBe('ORD-FASE8C')
    expect(detail.status).toBe(200)
  })

  it('rechaza la compra física si falta cualquier campo del domicilio', async () => {
    signInCustomer()
    supabaseMock.rpcData.get_customer_cart = {
      ...cartPayload(),
      checkout: { ...cartPayload().checkout, fulfillmentMode: 'shipping' },
    }

    const created = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', 'Bearer customer-token')
      .send({
        idempotencyKey: 'fase8c-incomplete-shipping',
        shippingAddress: {
          label: 'Casa',
          recipientName: 'Cliente Fase 8C',
          phone: '4490000000',
          email: customerUser.email,
          line1: 'Calle Hacienda 123',
          line2: 'N/A',
          neighborhood: 'Centro',
          city: 'Aguascalientes',
          state: 'Aguascalientes',
          postalCode: '20000',
          country: 'MX',
        },
        saveAddress: true,
      })

    expect(created.status).toBe(422)
    expect(supabaseMock.rpcCalls.some((call) => call.name === 'create_customer_shipping_order_from_cart')).toBe(false)
  })

  it('crea la orden física y guarda su domicilio en una sola RPC transaccional', async () => {
    signInCustomer()
    supabaseMock.rpcData.get_customer_cart = {
      ...cartPayload(),
      checkout: { ...cartPayload().checkout, fulfillmentMode: 'shipping' },
    }
    supabaseMock.rpcData.create_customer_shipping_order_from_cart = orderId
    supabaseMock.rpcData.get_customer_order_detail = orderPayload()

    const created = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', 'Bearer customer-token')
      .send({
        idempotencyKey: 'fase8c-shipping-order',
        shippingAddress: {
          label: 'Casa',
          recipientName: 'Cliente Fase 8C',
          phone: '4490000000',
          email: customerUser.email,
          line1: 'Calle Hacienda 123',
          line2: 'N/A',
          neighborhood: 'Centro',
          city: 'Aguascalientes',
          state: 'Aguascalientes',
          postalCode: '20000',
          country: 'MX',
          references: 'Portón color vino',
          isDefault: true,
        },
        saveAddress: true,
      })
    expect(created.status).toBe(201)
    expect(supabaseMock.rpcCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'create_customer_shipping_order_from_cart',
        args: expect.objectContaining({
          p_idempotency_key: 'fase8c-shipping-order',
          p_save_address: true,
          p_shipping_address: expect.objectContaining({
            recipientName: 'Cliente Fase 8C',
            references: 'Portón color vino',
          }),
        }),
      }),
    ]))
  })

  it('bloquea customer en órdenes administrativas', async () => {
    signInCustomer()
    const res = await request(app).get('/api/admin/orders').set('Authorization', 'Bearer customer-token')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
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
    expect(res.headers['access-control-allow-credentials']).toBe('true')
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
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('acepta origen nativo Android de Capacitor', async () => {
    const res = await request(app)
      .get('/api/public/status')
      .set('Origin', 'https://localhost')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://localhost')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('acepta origen nativo Capacitor', async () => {
    const res = await request(app)
      .get('/api/public/status')
      .set('Origin', 'capacitor://localhost')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('capacitor://localhost')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('responde preflight para origen nativo Android de Capacitor', async () => {
    const res = await request(app)
      .options('/api/public/wines')
      .set('Origin', 'https://localhost')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization')

    expect([200, 204]).toContain(res.status)
    expect(res.headers['access-control-allow-origin']).toBe('https://localhost')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers['access-control-allow-methods']).toContain('GET')
    expect(res.headers['access-control-allow-headers']).toContain('Authorization')
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

// ─── Fase 8E. Comunicaciones transaccionales ────────────────────────────────
describe('Fase 8E communications API', () => {
  it('aplica la identidad elegante de Hacienda de Letras a todas las plantillas', () => {
    for (const eventType of communicationEventTypes) {
      const template = renderEmailTemplate(eventType, { customerName: 'Patricia' }, 'es-MX')
      expect(template.html).toContain('https://www.haciendadeletras.com/wp-content/uploads/2021/08/Logo.png')
      expect(template.html).not.toContain('https://admhaciendadeletras.com')
      expect(template.html).toContain('#5d0d24')
      expect(template.html).toContain('#c49a52')
      expect(template.html).toContain('El vino de Aguascalientes')
      expect(template.html).toContain('Hacienda de Letras')
      expect(template.html).toContain('href="https://www.haciendadeletras.com/"')
      expect(template.html).not.toMatch(/href="https:\/\/admhaciendadeletras\.com/)
      expect(template.subject).not.toContain('Bienvenida')
      expect(template.html).not.toContain('Bienvenida')
    }
  })

  it('usa Bienvenido en la comunicación de alta sin asumir el género por los datos del perfil', () => {
    const template = renderEmailTemplate('customer.welcome', { customerName: 'Alex' }, 'es-MX')
    expect(template.subject).toBe('Bienvenido a Hacienda de Letras')
    expect(template.html).toContain('Bienvenido a Hacienda de Letras')
    expect(template.html).toContain('Bienvenido a una historia')
    expect(template.html).toContain('href="https://www.haciendadeletras.com/"')
    expect(template.html).not.toMatch(/href="https:\/\/admhaciendadeletras\.com/)
    expect(template.html).not.toContain('Bienvenida')
  })

  it('nunca expone el centro de control como destino de un CTA para clientes', () => {
    const template = renderEmailTemplate('campaign.marketing', {
      ctaUrl: 'https://admhaciendadeletras.com/control/clientes',
    }, 'es-MX')
    expect(template.html).toContain('href="https://www.haciendadeletras.com/"')
    expect(template.html).not.toMatch(/href="https:\/\/admhaciendadeletras\.com/)
  })

  const adminUser = {
    id: '99999999-9999-4999-8999-999999999901',
    email: 'admin@alqia.tech',
    created_at: '2026-08-04T00:00:00.000Z',
    email_confirmed_at: '2026-08-04T00:00:00.000Z',
  }
  const customerUser = {
    id: '99999999-9999-4999-8999-999999999902',
    email: 'cliente@alqia.tech',
    created_at: '2026-08-04T00:00:00.000Z',
    email_confirmed_at: '2026-08-04T00:00:00.000Z',
  }

  function setRoles(role: string) {
    supabaseMock.tableData.user_roles = [{ user_id: supabaseMock.authUser?.id, roles: { code: role } }]
  }

  it('protege endpoints admin de comunicaciones', async () => {
    const unauth = await request(app).get('/api/admin/communications')
    expect(unauth.status).toBe(401)

    supabaseMock.authUser = customerUser
    setRoles('customer')
    const forbidden = await request(app).get('/api/admin/communications').set('Authorization', 'Bearer customer-token')
    expect(forbidden.status).toBe(403)

    supabaseMock.authUser = adminUser
    setRoles('super_admin')
    const allowed = await request(app).get('/api/admin/communications').set('Authorization', 'Bearer admin-token')
    expect(allowed.status).toBe(200)
    expect(allowed.body.provider).toMatchObject({ provider: 'resend', configured: false })
  })

  it('crea outbox como pending_configuration cuando Resend no está configurado', async () => {
    const { outbox } = await enqueueTransactionalEmail({
      eventType: 'reservation.created',
      aggregateType: 'reservations',
      aggregateId: '11111111-1111-4111-8111-111111111111',
      customerId: '22222222-2222-4222-8222-222222222222',
      userId: customerUser.id,
      recipientEmail: 'qa@example.com',
      locale: 'es',
      payload: { reservationNumber: 'RES-QA', status: 'pending' },
      idempotencyKey: 'phase8e-reservation-created',
    })

    expect(outbox.status).toBe('pending_configuration')
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
  })

  it('mantiene idempotencia por idempotency_key', async () => {
    const payload = {
      eventType: 'order.created' as const,
      aggregateType: 'orders',
      aggregateId: '11111111-1111-4111-8111-111111111112',
      recipientEmail: 'qa@example.com',
      payload: { orderNumber: 'ORD-QA' },
      idempotencyKey: 'phase8e-order-created',
    }

    await enqueueTransactionalEmail(payload)
    await enqueueTransactionalEmail(payload)

    expect(supabaseMock.tableData.communication_events).toHaveLength(1)
    expect(supabaseMock.tableData.email_outbox).toHaveLength(1)
  })

  it('procesa worker con proveedor Resend simulado sin imprimir secretos', async () => {
    ;(env as Record<string, string>).RESEND_API_KEY = 'test_resend_key'
    ;(env as Record<string, string>).RESEND_FROM_EMAIL = 'Hacienda de Letras <notificaciones@admhaciendadeletras.com>'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'email_123' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await enqueueAndProcessTransactionalEmail({
      eventType: 'order.pending_payment',
      aggregateType: 'orders',
      aggregateId: '11111111-1111-4111-8111-111111111113',
      recipientEmail: 'qa@example.com',
      payload: { orderNumber: 'ORD-QA', status: 'pending_payment' },
      idempotencyKey: 'phase8e-pending-payment',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]?.[1] as { body?: unknown } | undefined
    const requestBody = JSON.parse(String(init?.body ?? '{}')) as { from?: string }
    expect(requestBody.from).toBe('Hacienda de Letras <notificaciones@admhaciendadeletras.com>')
    expect(requestBody.from).not.toContain('<Hacienda de Letras <')
    const outbox = supabaseMock.tableData.email_outbox?.[0] as { status?: string; provider_message_id?: string }
    expect(outbox.status).toBe('sent')
    expect(outbox.provider_message_id).toBe('email_123')
    expect(result.outbox).toMatchObject({ status: 'sent', provider_message_id: 'email_123' })
  })

  it('deja reintento programado cuando el proveedor falla', async () => {
    ;(env as Record<string, string>).RESEND_API_KEY = 'test_resend_key'
    ;(env as Record<string, string>).RESEND_FROM_EMAIL = 'soporte@admhaciendadeletras.com'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ name: 'validation_error' }),
    })))

    const result = await enqueueAndProcessTransactionalEmail({
      eventType: 'membership.activated',
      aggregateType: 'memberships',
      aggregateId: '11111111-1111-4111-8111-111111111114',
      recipientEmail: 'qa@example.com',
      payload: { membershipNumber: 'MBR-QA' },
      idempotencyKey: 'phase8e-membership-activated',
    })

    const outbox = supabaseMock.tableData.email_outbox?.[0] as { status?: string; attempts?: number; error_code?: string }
    expect(outbox.status).toBe('queued')
    expect(outbox.attempts).toBe(1)
    expect(outbox.error_code).toBe('validation_error')
    expect(result.outbox).toMatchObject({ status: 'queued', attempts: 1, error_code: 'validation_error' })
  })

  it('renderiza plantillas por locale y no expone tokens del payload', () => {
    const template = renderEmailTemplate('reservation.rescheduled', {
      reservationNumber: 'RES-QA',
      token: 'secret-token',
      password: 'hidden',
    }, 'en')

    expect(template.locale).toBe('en-US')
    expect(template.subject).toBe('Reservation rescheduled')
    expect(template.html).not.toContain('secret-token')
    expect(template.text).not.toContain('hidden')
  })

  it('renderiza plantillas transaccionales en inglés con etiquetas y moneda localizadas', () => {
    const template = renderEmailTemplate('order.created', {
      customerName: 'QA Phase 8F',
      orderNumber: 'QA_FASE8F_ORDER',
      status: 'pending_payment',
      total: 1250,
      startAt: '2026-08-05T18:00:00.000Z',
    }, 'en-US')

    expect(template.locale).toBe('en-US')
    expect(template.subject).toBe('Order created')
    expect(template.html).toContain('Hello, QA Phase 8F')
    expect(template.html).toContain('Order')
    expect(template.html).toContain('MX$1,250.00')
    expect(template.html).not.toContain('Reservación')
    expect(template.text).toContain('This is a transactional message related to your activity with Hacienda de Letras.')
    expect(template.html).toContain('Hacienda de Letras')
    expect(template.html).toContain('www.haciendadeletras.com')
    expect(template.html).not.toMatch(/href="https:\/\/admhaciendadeletras\.com/)
  })

  it('renderiza correo elegante de guía con paquetería, rastreo y CTA externo seguro', () => {
    const template = renderEmailTemplate('order.tracking_assigned', {
      customerName: 'Cliente Hacienda',
      orderNumber: 'ORD-TRACKING-QA',
      carrier: 'DHL',
      trackingNumber: 'HDL-123456',
      trackingUrl: 'https://tracking.example.com/HDL-123456',
      shippingStatus: 'tracking_assigned',
    }, 'es-MX')

    expect(template.subject).toBe('La guía de tu pedido está lista')
    expect(template.html).toContain('Número de guía')
    expect(template.html).toContain('HDL-123456')
    expect(template.html).toContain('https://tracking.example.com/HDL-123456')
    expect(template.html).toContain('Rastrear mi pedido')
    expect(template.html).not.toContain('pendiente de aprobación')
  })

  it('rechaza webhook sin firma o con firma inválida', async () => {
    ;(env as Record<string, string>).RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from('phase8e-secret').toString('base64')}`
    const res = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'email.delivered', data: { email_id: 'email_123' } }))

    expect(res.status).toBe(400)
  })

  it('acepta webhook firmado e idempotente de Resend', async () => {
    const secret = Buffer.from('phase8e-secret')
    ;(env as Record<string, string>).RESEND_WEBHOOK_SECRET = `whsec_${secret.toString('base64')}`
    supabaseMock.tableData.email_outbox = [{
      id: '33333333-3333-4333-8333-333333333333',
      communication_event_id: '44444444-4444-4444-8444-444444444444',
      template_key: 'reservation.created',
      recipient_email: 'qa@example.com',
      locale: 'es-MX',
      subject: 'Reservación recibida',
      html_body: '<p>ok</p>',
      text_body: 'ok',
      payload: {},
      status: 'sent',
      attempts: 1,
      max_attempts: 3,
      scheduled_at: '2026-08-04T00:00:00.000Z',
      provider: 'resend',
      provider_message_id: 'email_123',
      idempotency_key: 'webhook-key',
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
    }]
    supabaseMock.tableData.campaign_recipient_deliveries = [{
      id: '33333333-3333-4333-8333-333333333334',
      campaign_id: '55555555-5555-4555-8555-555555555555',
      customer_id: '66666666-6666-4666-8666-666666666666',
      channel: 'email',
      status: 'sent',
      provider_reference: '33333333-3333-4333-8333-333333333333',
      delivered_at: null,
      error_code: null,
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
    }]
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'email_123' } })
    const id = 'msg_phase8e'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = createHmac('sha256', secret).update(`${id}.${timestamp}.${body}`).digest('base64')
    const first = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', id)
      .set('svix-timestamp', timestamp)
      .set('svix-signature', `v1,${signature}`)
      .send({ type: 'email.delivered', data: { email_id: 'email_123' } })
    const second = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', id)
      .set('svix-timestamp', timestamp)
      .set('svix-signature', `v1,${signature}`)
      .send({ type: 'email.delivered', data: { email_id: 'email_123' } })

    expect(first.status).toBe(202)
    expect(second.status).toBe(202)
    expect(supabaseMock.tableData.email_deliveries).toHaveLength(1)
    expect((supabaseMock.tableData.email_outbox[0] as { status?: string }).status).toBe('delivered')
    expect(supabaseMock.tableData.campaign_recipient_deliveries[0]).toMatchObject({
      status: 'delivered',
      error_code: null,
    })
    expect((supabaseMock.tableData.campaign_recipient_deliveries[0] as { delivered_at?: string | null }).delivered_at).toBeTruthy()
  })
})

describe('Fase 8D Stripe customer payments', () => {
  const userId = '55555555-5555-4555-8555-555555555501'
  const customerId = '55555555-5555-4555-8555-555555555502'
  const orderId = '55555555-5555-4555-8555-555555555503'

  function signInCustomer() {
    supabaseMock.authUser = {
      id: userId,
      email: 'cliente.prueba@alqia.tech',
      created_at: '2026-08-05T00:00:00.000Z',
      email_confirmed_at: '2026-08-05T00:00:00.000Z',
    }
    supabaseMock.tableData.user_roles = [{ user_id: userId, roles: { code: 'customer' } }]
    supabaseMock.tableData.customers = [{
      id: customerId,
      user_id: userId,
      email: 'cliente.prueba@alqia.tech',
      first_name: 'Cliente',
      last_name: 'QA',
      display_name: 'Cliente QA',
    }]
    supabaseMock.tableData.orders = [{
      id: orderId,
      order_number: 'QA_FASE8D_STRIPE_ORDER',
      user_id: userId,
      customer_id: customerId,
      subtotal: 960,
      discount_total: 0,
      tax_total: 0,
      shipping_total: 0,
      total: 960,
      currency: 'MXN',
      status: 'pending_payment',
      paid_at: null,
      metadata: {},
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: '2026-08-05T00:00:00.000Z',
    }]
    supabaseMock.tableData.order_items = [{
      id: '55555555-5555-4555-8555-555555555504',
      order_id: orderId,
      subtotal: 960,
    }]
    supabaseMock.tableData.payments = []
  }

  function mockPaymentIntent(status = 'requires_payment_method') {
    return {
      id: 'pi_fase8d_mock',
      client_secret: 'pi_fase8d_mock_secret_client',
      amount: 96000,
      currency: 'mxn',
      status,
      payment_method_types: ['card'],
      latest_charge: null,
      last_payment_error: null,
      metadata: {
        order_id: orderId,
        order_number: 'QA_FASE8D_STRIPE_ORDER',
      },
    }
  }

  it('rechaza payment-session sin sesión', async () => {
    const res = await request(app).post(`/api/customer/orders/${orderId}/payment-session`)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('bloquea el pago de una compra física sin domicilio completo', async () => {
    signInCustomer()
    supabaseMock.tableData.orders = [{
      ...(supabaseMock.tableData.orders[0] as Record<string, unknown>),
      requires_shipping: true,
      shipping_status: 'pending_preparation',
    }]
    supabaseMock.tableData.order_items = [{
      ...(supabaseMock.tableData.order_items[0] as Record<string, unknown>),
      item_type: 'wine',
    }]
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'

    const res = await request(app)
      .post(`/api/customer/orders/${orderId}/payment-session`)
      .set('Authorization', 'Bearer jwt-customer')
      .send({})

    expect(res.status).toBe(422)
    expect(stripeMock.paymentIntentsCreate).not.toHaveBeenCalled()
  })

  it('crea PaymentIntent con total backend y devuelve solo client_secret', async () => {
    signInCustomer()
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'
    ;(env as Record<string, string>).STRIPE_ENVIRONMENT = 'test'
    stripeMock.customersCreate.mockResolvedValue({ id: 'cus_fase8d_mock' })
    stripeMock.customerSessionsCreate.mockResolvedValue({ client_secret: 'cuss_fase8d_mock_secret' })
    stripeMock.paymentIntentsCreate.mockResolvedValue(mockPaymentIntent())

    const res = await request(app)
      .post(`/api/customer/orders/${orderId}/payment-session`)
      .set('Authorization', 'Bearer jwt-customer')
      .send({})

    expect(res.status).toBe(201)
    expect(stripeMock.paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 96000,
        currency: 'mxn',
        customer: 'cus_fase8d_mock',
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(orderId) }),
    )
    expect(res.body.data).toMatchObject({
      provider: 'stripe',
      clientSecret: 'pi_fase8d_mock_secret_client',
      customerSessionClientSecret: 'cuss_fase8d_mock_secret',
      amount: 960,
      currency: 'MXN',
    })
    expect(JSON.stringify(res.body)).not.toContain('sk_test_mock_phase8d')
    expect(supabaseMock.tableData.payments).toHaveLength(1)
    expect((supabaseMock.tableData.payments[0] as { provider?: string; status?: string }).provider).toBe('stripe')
  })

  it('permite payment-session para boletos de evento sin domicilio de envio', async () => {
    signInCustomer()
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'
    ;(env as Record<string, string>).STRIPE_ENVIRONMENT = 'test'
    supabaseMock.tableData.orders = [{
      ...(supabaseMock.tableData.orders[0] as Record<string, unknown>),
      requires_shipping: false,
      metadata: { fulfillmentMode: 'event_access', paymentAvailable: true },
    }]
    supabaseMock.tableData.order_items = [{
      ...(supabaseMock.tableData.order_items[0] as Record<string, unknown>),
      item_type: 'event_ticket',
      quantity: 2,
    }]
    supabaseMock.tableData.order_shipping_addresses = []
    stripeMock.customersCreate.mockResolvedValue({ id: 'cus_fase8d_event_mock' })
    stripeMock.customerSessionsCreate.mockResolvedValue({ client_secret: 'cuss_fase8d_event_secret' })
    stripeMock.paymentIntentsCreate.mockResolvedValue(mockPaymentIntent())

    const res = await request(app)
      .post(`/api/customer/orders/${orderId}/payment-session`)
      .set('Authorization', 'Bearer jwt-customer')
      .send({})

    expect(res.status).toBe(201)
    expect(stripeMock.paymentIntentsCreate).toHaveBeenCalled()
  })

  it('rechaza amount/currency enviados por frontend en payment-session', async () => {
    signInCustomer()
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'

    const res = await request(app)
      .post(`/api/customer/orders/${orderId}/payment-session`)
      .set('Authorization', 'Bearer jwt-customer')
      .send({ amount: 1, currency: 'USD' })

    expect(res.status).toBe(422)
    expect(stripeMock.paymentIntentsCreate).not.toHaveBeenCalled()
  })

  it('rechaza webhook Stripe con firma inválida', async () => {
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'
    ;(env as Record<string, string>).STRIPE_WEBHOOK_SECRET = 'whsec_mock_phase8d'
    stripeMock.constructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })

    const res = await request(app)
      .post('/api/webhooks/payments/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'invalid')
      .send(JSON.stringify({ id: 'evt_bad' }))

    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).not.toContain('whsec_mock_phase8d')
  })

  it('procesa payment_intent.succeeded y marca orden pagada desde webhook', async () => {
    signInCustomer()
    ;(env as Record<string, string>).STRIPE_SECRET_KEY = 'sk_test_mock_phase8d'
    ;(env as Record<string, string>).STRIPE_WEBHOOK_SECRET = 'whsec_mock_phase8d'
    supabaseMock.tableData.payments = [{
      id: '55555555-5555-4555-8555-555555555505',
      order_id: orderId,
      provider: 'stripe',
      provider_payment_id: 'pi_fase8d_mock',
      amount: 960,
      currency: 'MXN',
      status: 'pending',
      refunded_amount: 0,
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: '2026-08-05T00:00:00.000Z',
    }]
    stripeMock.constructEvent.mockReturnValue({
      id: 'evt_fase8d_succeeded',
      type: 'payment_intent.succeeded',
      livemode: false,
      api_version: '2026-08-05',
      data: {
        object: mockPaymentIntent('succeeded'),
      },
    })

    const res = await request(app)
      .post('/api/webhooks/payments/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid')
      .send(JSON.stringify({ id: 'evt_fase8d_succeeded' }))

    expect(res.status).toBe(202)
    expect((supabaseMock.tableData.orders[0] as { status?: string }).status).toBe('paid')
    expect((supabaseMock.tableData.payments[0] as { status?: string }).status).toBe('paid')
    expect((supabaseMock.tableData.payment_webhook_events[0] as { processed?: boolean }).processed).toBe(true)
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
