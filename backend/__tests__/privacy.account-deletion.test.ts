import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  accountDeletionListQuerySchema,
  authenticatedAccountDeletionRequestSchema,
  confirmAccountDeletionSchema,
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
    expect(accountDeletionListQuerySchema.parse({ status: 'pending_processing' })).toMatchObject({ page: 1, perPage: 25 })
    expect(() => accountDeletionListQuerySchema.parse({ status: 'deleted_immediately' })).toThrow()
    expect(() => patchAccountDeletionRequestSchema.parse({})).toThrow()
    expect(() => patchAccountDeletionRequestSchema.parse({ status: 'completed' })).toThrow()
    expect(patchAccountDeletionRequestSchema.parse({ status: 'in_progress' })).toEqual({ status: 'in_progress' })
    expect(confirmAccountDeletionSchema.parse({ token: 'signed-token-value-for-test' })).toEqual({ token: 'signed-token-value-for-test' })
  })

  it('persiste confirmación por correo, cola operativa y ejecución real', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/042_account_deletion_requests.sql'), 'utf8')
    const executionMigration = readFileSync(resolve(__dirname, '../migrations/076_account_deletion_confirmed_execution.sql'), 'utf8')
    const routes = readFileSync(resolve(__dirname, '../src/modules/privacy/privacy.routes.ts'), 'utf8')
    const service = readFileSync(resolve(__dirname, '../src/modules/privacy/privacy.service.ts'), 'utf8')
    const communications = readFileSync(resolve(__dirname, '../src/modules/communications/communications.schemas.ts'), 'utf8')

    expect(migration).toContain('create table if not exists public.account_deletion_requests')
    expect(migration).toContain('create table if not exists public.account_deletion_request_history')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('uq_account_deletion_active_email')
    expect(executionMigration).toContain('confirmation_token_hash')
    expect(executionMigration).toContain('pending_processing')
    expect(executionMigration).toContain("when status in ('rejected', 'cancelled') then 'completed'")
    expect(executionMigration).toContain("where status in ('awaiting_email_confirmation','pending_processing','in_progress','technical_error')")
    expect(executionMigration).not.toContain("when status in ('rejected', 'cancelled') then 'technical_error'")
    expect(executionMigration).toContain('create table if not exists public.apple_sign_in_tokens')
    expect(routes).toContain("publicRouter.post('/account-deletion-requests'")
    expect(routes).toContain("publicRouter.post('/account-deletion-requests/confirm'")
    expect(routes).toContain("customerRouter.post(")
    expect(routes).toContain("adminRouter.patch(")
    expect(routes).toContain("adminRouter.post(")
    expect(service).toContain('sendRequiredTransactionalEmail')
    expect(service).toContain('confirmAccountDeletion')
    expect(service).toContain('externalBase')
    expect(service).toContain('https://admhaciendadeletras.com')
    expect(service).toContain('ban_duration')
    expect(service).toContain('auth.admin.signOut')
    expect(service).toContain('auth.admin.deleteUser')
    expect(service).toContain('revokeAppleSignInTokensForUser')
    expect(service).not.toContain("status: 'rejected'")
    expect(communications).toContain("'account_deletion.confirmation'")
    expect(communications).toContain("'account_deletion.completed'")
  })
})
