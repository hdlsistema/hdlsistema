import { describe, expect, it } from 'vitest'
import { normalizeAccessQrCode } from '../app/utils/accessQr'

const passToken = 'hdl_pass_1234567890abcdef1234567890abcdef'

describe('check-in QR parser', () => {
  it('acepta el token nativo del boleto', () => {
    expect(normalizeAccessQrCode(passToken)).toBe(passToken)
  })

  it('extrae el token de URL o payload estructurado sin alterarlo', () => {
    expect(normalizeAccessQrCode(`https://www.haciendadeletras.com/acceso?token=${passToken}`)).toBe(passToken)
    expect(normalizeAccessQrCode(JSON.stringify({ qrToken: passToken }))).toBe(passToken)
  })

  it('rechaza texto que no pertenece a un pase Hacienda', () => {
    expect(normalizeAccessQrCode('buscar esto en Google')).toBe('')
  })
})
