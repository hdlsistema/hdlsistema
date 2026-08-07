import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('premium customer app experience', () => {
  it('mantiene aliases de app cliente y separa Centro de Control en el build web', () => {
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

  it('usa tabs principales de App Hacienda de Letras sin rutas hardcodeadas de web', () => {
    const tabs = readFileSync(resolve(__dirname, '../app/components/mobile/BottomTabs.tsx'), 'utf8')

    expect(tabs).toContain("to: appPath('/home')")
    expect(tabs).toContain("to: appPath('/vinos')")
    expect(tabs).toContain("to: appPath('/experiencias')")
    expect(tabs).toContain("to: appPath('/carrito')")
    expect(tabs).toContain("to: appPath('/perfil')")
    expect(tabs).not.toContain("to: '/app/club'")
  })

  it('declara un build movil independiente para Capacitor', () => {
    const packageJson = readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
    const capacitorConfig = readFileSync(resolve(__dirname, '../../capacitor.config.ts'), 'utf8')
    const mobileHtml = readFileSync(resolve(__dirname, '../mobile/index.html'), 'utf8')
    const mobileVite = readFileSync(resolve(__dirname, '../../vite.mobile.config.ts'), 'utf8')

    expect(packageJson).toContain('"build:web"')
    expect(packageJson).toContain('"build:mobile"')
    expect(capacitorConfig).toContain("webDir: 'dist-mobile'")
    expect(mobileHtml).toContain('/main.tsx')
    expect(mobileVite).toContain("root: resolve(__dirname, 'src/mobile')")
    expect(mobileVite).toContain("outDir: resolve(__dirname, 'dist-mobile')")
  })

  it('mantiene el router movil aislado del OS y del Centro de Control', () => {
    const mobileRouter = readFileSync(resolve(__dirname, '../mobile/MobileRouter.tsx'), 'utf8')
    const mobileEntry = readFileSync(resolve(__dirname, '../mobile/main.tsx'), 'utf8')

    expect(mobileEntry).toContain("import AppMobile from './AppMobile'")
    expect(mobileRouter).toContain('<MobileShell />')
    expect(mobileRouter).toContain('path="home"')
    expect(mobileRouter).toContain('path="checkout"')
    expect(mobileRouter).not.toMatch(/LandingPage|ControlLayout|RoleRoute|DashboardPage|AppRouter/)
    expect(mobileRouter).not.toMatch(/\/control/)
  })
})
