import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('entry QR expiry policy', () => {
  it('emite y valida QR de entrada con vencimiento 12 horas despues del evento o reservacion', () => {
    const issuer = readFileSync(resolve(__dirname, '../src/modules/checkin/accessPassIssuer.ts'), 'utf8')
    const migration = readFileSync(resolve(__dirname, '../migrations/073_entry_qr_expiry_12h.sql'), 'utf8')

    expect(issuer).toContain('ACCESS_QR_EXPIRY_HOURS = 12')
    expect(issuer).toContain('accessExpiryFromWindow(eventStartsAt, eventEndsAt)')
    expect(migration).toContain("interval '12 hours'")
    expect(migration).toContain('access_pass_effective_valid_until')
    expect(migration).toContain('validate_access_pass')
    expect(migration).toContain('register_checkin')
    expect(migration).toContain('qrExpiryPolicy')
  })
})
