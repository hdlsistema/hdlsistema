import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('premium customer app experience', () => {
  it('mantiene aliases de app cliente y separa Centro de Control', () => {
    const router = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')

    expect(router).toContain('path="tienda"')
    expect(router).toContain('path="tienda/:wineId"')
    expect(router).toContain('path="vinos"')
    expect(router).toContain('path="vinos/:wineId"')
    expect(router).toContain('path="club"')
    expect(router).toContain('path="membresias"')
    expect(router).toContain('path="/control"')
    expect(router).toContain('<RoleRoute allowedRoles={adminRoles}>')
    expect(router).toContain('<ControlLayout />')
    expect(router).not.toContain('path="/control" element={<MobileShell')
  })

  it('usa tabs principales de huésped sin promover Wine Club como tab principal', () => {
    const tabs = readFileSync(resolve(__dirname, '../app/components/mobile/BottomTabs.tsx'), 'utf8')

    expect(tabs).toContain("to: '/app/home'")
    expect(tabs).toContain("to: '/app/vinos'")
    expect(tabs).toContain("to: '/app/experiencias'")
    expect(tabs).toContain("to: '/app/carrito'")
    expect(tabs).toContain("to: '/app/perfil'")
    expect(tabs).not.toContain("to: '/app/club'")
  })
})
