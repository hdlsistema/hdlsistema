import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('dashboard operativo compacto', () => {
  it('mantiene KPIs reales y no incrusta el listado infinito de actividad de la App', () => {
    const dashboard = readFileSync(resolve(__dirname, '../app/pages/control/DashboardPage.tsx'), 'utf8')
    const activityPage = readFileSync(resolve(__dirname, '../app/pages/control/AppActivityPage.tsx'), 'utf8')

    expect(dashboard).toContain('dashboardClient.get')
    expect(dashboard).toContain('summary?.metrics')
    expect(dashboard).not.toContain('Actividad reciente de la App')
    expect(dashboard).not.toContain('summary.recentActivity.map')
    expect(activityPage).toContain('title="Actividad"')
  })
})
