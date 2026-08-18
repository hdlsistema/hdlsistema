import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const service = readFileSync(new URL('../src/modules/executiveAssistant/executiveAssistant.service.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/059_carlos_executive_ai_assistant.sql', import.meta.url), 'utf8')
const accessExpansionMigration = readFileSync(new URL('../migrations/060_add_carlos_aleman_executive_ai_access.sql', import.meta.url), 'utf8')

describe('executive assistant privacy and access contract', () => {
  it('sends only aggregate operational fields and excludes identifying customer fields', () => {
    expect(service).toContain('Resumen agregado sin datos personales')
    expect(service).not.toMatch(/select\([^)]*(email|phone|first_name|last_name|address|notes|reservation_number|order_number)/)
    expect(service).not.toContain('recentAppActivity')
    expect(service).not.toContain('recentReservations: dashboard')
    expect(service).not.toContain('recentOrders: dashboard')
  })

  it('is read-only and restricted to the three approved real identities', () => {
    expect(service).toContain('No puedes crear, editar, confirmar, cancelar ni eliminar registros')
    expect(migration).toContain('5d816bfe-1ff3-40ae-ab45-5f0e7ef9a62b')
    expect(migration).toContain('630902da-1ade-4ce1-935d-9a534caaf5cd')
    expect(migration).toContain('26f0de80-f99d-4f16-b071-c5d5199f100e')
    expect(migration).toContain('auth.uid() = user_id')
    expect(accessExpansionMigration).toContain('630902da-1ade-4ce1-935d-9a534caaf5cd')
    expect(accessExpansionMigration).toContain('on conflict (user_id) do update')
  })
})
