import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('conocimiento público provisional del Sommelier', () => {
  it('conserva fuentes y las separa de los datos operativos actuales', () => {
    const migration = readFileSync(resolve(__dirname, '../migrations/058_sommelier_public_reference_knowledge.sql'), 'utf8')
    const service = readFileSync(resolve(__dirname, '../src/modules/sommelier/sommelier.service.ts'), 'utf8')

    expect(migration).toContain('source_url')
    expect(migration).toContain('requires_client_validation')
    expect(migration).toContain('historical_source_2008')
    expect(migration).toContain('No está documentado por Hacienda el origen oficial')
    expect(service).toContain('DATOS OPERATIVOS ACTUALES DEL BACKEND (prioridad máxima)')
    expect(service).toContain('una referencia web jamás los sustituye')
    expect(service).toContain('Nunca inventes parentescos')
  })
})
