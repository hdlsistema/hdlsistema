import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const service = readFileSync(new URL('../src/modules/executiveAssistant/executiveAssistant.service.ts', import.meta.url), 'utf8')
const plainText = readFileSync(new URL('../src/modules/ai/plainText.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/059_carlos_executive_ai_assistant.sql', import.meta.url), 'utf8')
const accessExpansionMigration = readFileSync(new URL('../migrations/060_add_carlos_aleman_executive_ai_access.sql', import.meta.url), 'utf8')

describe('executive assistant privacy and access contract', () => {
  it('keeps precise operational lookups local and excludes raw sensitive payloads', () => {
    expect(service).toContain('answerPreciseLocalQuestion')
    expect(service).toContain('answerEventAttendanceQuestion')
    expect(service).toContain('Revisé datos reales de Eventos/Experiencias, Reservaciones, Tipos de boleto, Pases QR y Check-ins')
    expect(service).toMatch(/const preciseAnswer = await answerPreciseLocalQuestion\(payload\.message\)[\s\S]*return \{ answer: plainAiResponse\(preciseAnswer\)/)
    expect(service).toContain('Resumen agregado sin datos personales')
    expect(service).not.toContain('provider_response')
    expect(service).not.toContain('qr_token_hash')
    expect(service).not.toContain('device_info')
    expect(service).not.toContain('auth.users')
    expect(service).not.toContain('recentAppActivity')
    expect(service).not.toContain('recentReservations: dashboard')
    expect(service).not.toContain('recentOrders: dashboard')
  })

  it('forces plain text answers without asterisks or Markdown formatting', () => {
    expect(service).toContain('plainAiResponseInstruction')
    expect(service).toContain('plainAiResponse(preciseAnswer)')
    expect(service).toContain('plainAiResponse(answer)')
    expect(plainText).toContain('No uses Markdown, asteriscos')
  })

  it('keeps formatting instructions out of precise event matching', () => {
    expect(service).toContain("'responde'")
    expect(service).toContain("'asteriscos'")
    expect(service).toContain("'resumen'")
    expect(service).toContain("'asistencia'")
    expect(service).toContain('function preciseTermScore')
    expect(service).toContain('aforo|asist')
    expect(service).toContain('Math.ceil(terms.length * 0.6)')
    expect(service).toContain('rankByPreciseTerms(events')
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
