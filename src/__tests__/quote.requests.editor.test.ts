import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../app/pages/control/QuoteRequestsPage.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../services/commercial.service.ts', import.meta.url), 'utf8')

describe('expediente editable de cotizaciones', () => {
  it('separa origen app y manual y permite editar ambos con un formulario completo', () => {
    expect(page).toContain("setFormMode('create')")
    expect(page).toContain("setFormMode('edit')")
    expect(page).toContain('Los registros de la app y los capturados manualmente conservan el mismo nivel de edición.')
    for (const field of [
      'alternativeDate', 'preferredStartTime', 'preferredEndTime', 'foodRequired',
      'foodType', 'wineRequired', 'wineOption', 'requestedServices', 'companyName', 'source',
    ]) {
      expect(page).toContain(`quoteDraft.${field}`)
      expect(client).toContain(field)
    }
  })

  it('resuelve un deep link aunque la cotización no esté en la primera página', () => {
    expect(page).toContain('quoteRequestsClient.get(token, quoteId)')
  })
})
