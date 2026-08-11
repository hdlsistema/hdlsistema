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

  it('mantiene disponibles las rutas de navegacion de toda la app movil', () => {
    const mobileRouter = readFileSync(resolve(__dirname, '../mobile/MobileRouter.tsx'), 'utf8')

    for (const route of [
      'home', 'vinos', 'vinos/:wineId', 'experiencias', 'experiencias/:experienceId',
      'eventos', 'eventos/:eventId', 'reservacion', 'mapa', 'membresias',
      'sommelier', 'carrito', 'checkout', 'pago/procesando', 'pago/exitoso',
      'pago/fallido', 'perfil', 'login', 'registro', 'recuperar',
    ]) {
      expect(mobileRouter).toContain(`path="${route}"`)
    }
  })

  it('incluye los componentes de app en el escaneo de estilos del build movil', () => {
    const globalStyles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')

    expect(globalStyles).toContain('@source "../**/*.tsx"')
    expect(globalStyles).toContain('@source "../../mobile/**/*.tsx"')
    expect(globalStyles).toContain('html.hdl-mobile-app .app-bottom-nav')
    expect(globalStyles).toContain('html.hdl-mobile-app .mobile-shell-scroll')
  })

  it('incluye splash y onboarding nativos con el logotipo oficial, sin marcas inventadas', () => {
    const mobileApp = readFileSync(resolve(__dirname, '../mobile/AppMobile.tsx'), 'utf8')
    const mobileEntry = readFileSync(resolve(__dirname, '../mobile/main.tsx'), 'utf8')
    const launchGate = readFileSync(resolve(__dirname, '../mobile/MobileLaunchGate.tsx'), 'utf8')

    expect(mobileApp).toContain('<MobileLaunchGate>')
    expect(launchGate).toContain('MobileBrandSplash')
    expect(launchGate).toContain('/hacienda de letras logo 2.png')
    expect(launchGate).toContain("const ONBOARDING_KEY = 'hdl-mobile-onboarding-v3'")
    expect(launchGate).toContain('MobileOnboarding')
    expect(launchGate).toContain('mobile-onboarding')
    expect(launchGate).not.toContain('mobile-launch-screen__mark')
    expect(launchGate).not.toContain('LandingPage')
    expect(launchGate).not.toContain('/control')
    expect(mobileEntry).toContain("document.documentElement.classList.add('hdl-mobile-app')")
  })

  it('monta navegacion nativa solo fuera de las rutas de autenticacion', () => {
    const shell = readFileSync(resolve(__dirname, '../app/components/mobile/MobileShell.tsx'), 'utf8')
    const tabs = readFileSync(resolve(__dirname, '../app/components/mobile/BottomTabs.tsx'), 'utf8')

    expect(shell).toContain('h-[100dvh]')
    expect(shell).toContain('const showAppChrome = !isAuthRoute')
    expect(shell).toContain('{showAppChrome ? <AppBottomNavigation cartCount={cartCount} /> : null}')
    expect(shell).toContain('{showAppChrome ? <AppEdgePanel /> : null}')
    expect(shell).toContain('overflow-x-hidden')
    expect(tabs).toContain('aria-label="Navegación principal"')
    expect(tabs).toContain('z-[90]')
    expect(tabs).toContain('app-bottom-nav__item')
  })

  it('mantiene el panel lateral dentro de la app, desplazable y cerrable', () => {
    const edgePanel = readFileSync(resolve(__dirname, '../app/components/mobile/AppEdgePanel.tsx'), 'utf8')

    expect(edgePanel).toContain("const PANEL_WIDTH = 'min(82vw, 330px)'")
    expect(edgePanel).toContain('overflow-y-auto')
    expect(edgePanel).toContain('onClick={() => closePanel()}')
    expect(edgePanel).toContain('onPointerMove={onPointerMove}')
    expect(edgePanel).toContain('/hacienda de letras logo 2.png')
    expect(edgePanel).not.toContain("|| 'HL'")
  })

  it('ofrece acceso social real y controles de sesion circulares en el acceso movil', () => {
    const auth = readFileSync(resolve(__dirname, '../mobile/MobileAuthPages.tsx'), 'utf8')
    const authService = readFileSync(resolve(__dirname, '../services/auth.service.ts'), 'utf8')
    const styles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')

    expect(auth).toContain('SocialAuthActions')
    expect(auth).toContain('CheckControl name="remember"')
    expect(auth).toContain('CheckControl name="terms"')
    expect(authService).toContain("signInWithOAuth(provider: 'google' | 'apple')")
    expect(styles).toContain('.native-auth-check__mark')
    expect(styles).toContain('.native-auth-social')
    expect(styles).toContain('.app-bottom-nav__item.is-active')
  })
})
