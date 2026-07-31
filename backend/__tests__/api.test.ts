import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createApp } from '../src/app'
import { env } from '../src/config/env'
import { checkSupabaseReachable } from '../src/config/supabase'
import { errorHandler, type AppError } from '../src/middleware/errorHandler'
import { execSync } from 'child_process'
import { resolve } from 'path'

const supabaseMock = vi.hoisted(() => ({
  error: null as unknown,
  throwError: null as unknown,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          abortSignal: vi.fn(async () => {
            if (supabaseMock.throwError) throw supabaseMock.throwError
            return { data: [], error: supabaseMock.error }
          }),
        })),
      })),
    })),
  })),
}))

const app = createApp()
const originalSupabaseUrl = env.SUPABASE_URL
const originalSupabaseAnonKey = env.SUPABASE_ANON_KEY
const originalSupabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

beforeEach(() => {
  supabaseMock.error = null
  supabaseMock.throwError = null
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

  it('reporta Supabase ok cuando la consulta tecnica no devuelve error', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.supabase).toMatchObject({
      configured: true,
      reachable: true,
      healthy: true,
      status: 'ok',
    })
  })

  it('reporta configuracion faltante sin llamar la consulta tecnica', async () => {
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

  it('clasifica error de autenticacion', async () => {
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
