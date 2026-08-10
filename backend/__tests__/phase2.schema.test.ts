import { describe, expect, it } from 'vitest'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { checkSupabaseReachable } from '../src/config/supabase'

config({ path: resolve(__dirname, '../../.env.local') })
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '../.env') })

type ValidationResult = {
  index_count: number
  seed_counts: {
    roles: number
    wines: number
    events: number
    settings: number
    promotions: number
    experiences: number
    membership_plans: number
  }
  policy_count: number
  rls_disabled: string[]
  missing_tables: string[]
  missing_buckets: string[]
  pgvector_exists: boolean
  helper_functions: {
    has_role: boolean
    is_admin: boolean
    current_customer_id: boolean
    reserve_experience_slot: boolean
  }
  foreign_key_count: number
  public_table_count: number
  audit_trigger_count: number
  system_health_exists: boolean
  updated_at_trigger_count: number
}

const hasManagementConfig = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_ACCESS_TOKEN,
)

const describePhase2 = hasManagementConfig ? describe : describe.skip

describe('vinculación Auth a customer', () => {
  it('mantiene el trigger de perfil/customer y el evento de registro idempotente', () => {
    const authMigration = readFileSync(resolve(__dirname, '../migrations/018_auth_customer_role.sql'), 'utf8')
    const activityMigration = readFileSync(resolve(__dirname, '../migrations/033_customer_app_traceability.sql'), 'utf8')

    expect(authMigration).toContain('after insert on auth.users')
    expect(authMigration).toContain('on conflict (user_id) do update')
    expect(authMigration).toContain("where code = 'customer'")
    expect(activityMigration).toContain('after insert on public.customers')
    expect(activityMigration).toContain("'customer_signup_completed'")
    expect(activityMigration).toContain('on conflict do nothing')
  })
})

async function runValidation(): Promise<ValidationResult> {
  const supabaseUrl = process.env.SUPABASE_URL as string
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN as string
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  const query = readFileSync(resolve(__dirname, '../scripts/validate_phase2.sql'), 'utf8')

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
    },
  )

  expect(response.ok).toBe(true)

  const body = (await response.json()) as Array<{ validation: ValidationResult }>
  return body[0].validation
}

describePhase2('Fase 2 Supabase schema', () => {
  it('tiene tablas, relaciones, indices, RLS, buckets y seeds requeridos', async () => {
    const validation = await runValidation()

    expect(validation.missing_tables).toEqual([])
    expect(validation.missing_buckets).toEqual([])
    expect(validation.rls_disabled).toEqual([])
    expect(validation.public_table_count).toBeGreaterThanOrEqual(58)
    expect(validation.foreign_key_count).toBeGreaterThanOrEqual(70)
    expect(validation.index_count).toBeGreaterThanOrEqual(120)
    expect(validation.policy_count).toBeGreaterThanOrEqual(80)
    expect(validation.updated_at_trigger_count).toBeGreaterThanOrEqual(25)
    expect(validation.audit_trigger_count).toBeGreaterThanOrEqual(8)
    expect(validation.system_health_exists).toBe(true)
    expect(validation.pgvector_exists).toBe(true)
  })

  it('tiene roles, helper functions y seeds idempotentes', async () => {
    const validation = await runValidation()

    expect(validation.helper_functions).toEqual({
      has_role: true,
      is_admin: true,
      current_customer_id: true,
      reserve_experience_slot: true,
    })
    expect(validation.seed_counts.roles).toBe(7)
    expect(validation.seed_counts.wines).toBe(3)
    expect(validation.seed_counts.experiences).toBe(2)
    expect(validation.seed_counts.events).toBe(2)
    expect(validation.seed_counts.promotions).toBe(2)
    expect(validation.seed_counts.membership_plans).toBe(2)
    expect(validation.seed_counts.settings).toBeGreaterThanOrEqual(5)
  })

  it('mantiene Supabase health real en ok', async () => {
    await expect(checkSupabaseReachable()).resolves.toEqual({
      reachable: true,
      healthy: true,
      status: 'ok',
    })
  })
})
