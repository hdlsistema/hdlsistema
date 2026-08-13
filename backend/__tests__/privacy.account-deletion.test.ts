import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  accountDeletionListQuerySchema,
  authenticatedAccountDeletionRequestSchema,
  patchAccountDeletionRequestSchema,
  publicAccountDeletionRequestSchema,
} from '../src/modules/privacy/privacy.schemas'

describe('backend de eliminación de cuenta', () => {
  it('requiere confirmación explícita y aceptación de conservación', () => {
    expect(() => publicAccountDeletionRequestSchema.parse({ email: 'persona@example.com' })).toThrow()
    expect(() => authenticatedAccountDeletionRequestSchema.parse({ confirmation: true })).toThrow()
    expect(publicAccountDeletionRequestSchema.parse({
      email: 'persona@example.com',
      confirmation: true,
      retentionAcknowledged: true,
    })).toMatchObject({ email: 'persona@example.com', locale: 'es' })
  })

  it('no acepta correo enviado por Mobile autenticado ni campos técnicos', () => {
    expect(() => authenticatedAccountDeletionRequestSchema.parse({
      email: 'manipulado@example.com',
      confirmation: true,
      retentionAcknowledged: true,
    })).toThrow()
    expect(() => publicAccountDeletionRequestSchema.parse({
      email: 'persona@example.com',
      confirmation: true,
      retentionAcknowledged: true,
      provider: 'externo',
    })).toThrow()
  })

  it('valida filtros administrativos y exige cambios reales', () => {
    expect(accountDeletionListQuerySchema.parse({ status: 'requested' })).toMatchObject({ page: 1, perPage: 25 })
    expect(() => accountDeletionListQuerySchema.parse({ status: 'deleted_immediately' })).toThrow()
    expect(() => patchAccountDeletionRequestSchema.parse({})).toThrow()
    expect(patchAccountDeletionRequestSchema.parse({ status: 'identity_verification' })).toEqual({ status: 'identity_verification' })
  })

  it('persiste cola, historial, RLS y no ejecuta borrado inmediato', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/042_account_deletion_requests.sql'), 'utf8')
    const routes = readFileSync(resolve(__dirname, '../src/modules/privacy/privacy.routes.ts'), 'utf8')
    const service = readFileSync(resolve(__dirname, '../src/modules/privacy/privacy.service.ts'), 'utf8')

    expect(migration).toContain('create table if not exists public.account_deletion_requests')
    expect(migration).toContain('create table if not exists public.account_deletion_request_history')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('uq_account_deletion_active_email')
    expect(routes).toContain("publicRouter.post('/account-deletion-requests'")
    expect(routes).toContain("customerRouter.post(")
    expect(routes).toContain("adminRouter.patch(")
    expect(service).toContain('La respuesta pública es deliberadamente neutra')
    expect(service).not.toMatch(/auth\.admin\.deleteUser|delete\(\)\.eq\('id'/)
  })
})
