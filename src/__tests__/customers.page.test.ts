import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CustomersPage layout CRM', () => {
  it('presenta clientes como tarjetas compactas con clasificacion, origen y audiencia', () => {
    const source = readFileSync(resolve(__dirname, '../app/pages/control/CustomersPage.tsx'), 'utf8')

    expect(source).toContain('control-customers-card-grid')
    expect(source).toContain('CustomerCard')
    expect(source).toContain('segmentProfiles')
    expect(source).toContain('campaignKey')
    expect(source).toContain('sourceOptions')
    expect(source).toContain('sourceGroup')
    expect(source).toContain('sourceFilter')
    expect(source).toContain('Hacienda / manual')
    expect(source).toContain('Audiencia campañas')
    expect(source).toContain('Campañas')
    expect(source).toContain('Megaphone')
    expect(source).toContain('Todas las clasificaciones')
    expect(source).not.toContain('tagId: tagFilter')
    expect(source).not.toContain('Todas las etiquetas')
    expect(source).not.toContain('control-master-detail')
    expect(source).not.toContain('linear-gradient')
  })
})
