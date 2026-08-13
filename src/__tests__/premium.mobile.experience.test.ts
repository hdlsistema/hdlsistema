import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { imageField } from '../app/utils/publicContent'

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
    const styles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')

    expect(shell).toContain('h-[100dvh]')
    expect(shell).toContain('const showAppChrome = !isAuthRoute')
    expect(shell).toContain('{showAppChrome ? <AppBottomNavigation cartCount={cartCount} /> : null}')
    expect(shell).toContain('{showAppChrome ? <AppEdgePanel /> : null}')
    expect(shell).toContain('overflow-x-hidden')
    expect(tabs).toContain('aria-label="Navegación principal"')
    expect(tabs).toContain('z-[90]')
    expect(tabs).toContain('app-bottom-nav__item')
    expect(tabs).toContain('app-bottom-nav__content')
    expect(styles).toContain('height: calc(70px + env(safe-area-inset-bottom))')
    expect(styles).toContain('width: 100%')
    expect(styles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))')
    expect(styles).toContain('font-size: clamp(8px, 2.2vw, 9.5px)')
  })

  it('mantiene el panel lateral dentro de la app, desplazable y cerrable', () => {
    const edgePanel = readFileSync(resolve(__dirname, '../app/components/mobile/AppEdgePanel.tsx'), 'utf8')

    expect(edgePanel).toContain("const PANEL_WIDTH = 'min(88vw, 356px)'")
    expect(edgePanel).toContain('overflow-y-auto')
    expect(edgePanel).toContain('backdrop-blur-[28px]')
    expect(edgePanel).toContain('PanelRightOpen')
    expect(edgePanel).toContain('onClick={() => closePanel()}')
    expect(edgePanel).toContain('onPointerMove={onPointerMove}')
    expect(edgePanel).toContain('/hacienda de letras logo 2.png')
    expect(edgePanel).not.toContain("|| 'HL'")
    expect(edgePanel).not.toContain('Sparkles')
  })

  it('refina la app nativa con tipografía editorial contenida e iconografía contextual', () => {
    const ui = readFileSync(resolve(__dirname, '../app/components/mobile/PremiumMobileUi.tsx'), 'utf8')
    const home = readFileSync(resolve(__dirname, '../app/pages/mobile/HomeScreen.tsx'), 'utf8')
    const sommelier = readFileSync(resolve(__dirname, '../app/pages/mobile/SommelierScreen.tsx'), 'utf8')
    const profile = readFileSync(resolve(__dirname, '../app/pages/mobile/ProfileScreen.tsx'), 'utf8')

    expect(ui).toContain('text-[clamp(23px,6vw,29px)]')
    expect(home).toContain('BedDouble')
    expect(home).toContain('UtensilsCrossed')
    expect(sommelier).toContain('MessageCircleMore')
    expect(`${ui}${home}${sommelier}${profile}`).not.toContain('Sparkles')
    expect(profile).toContain("id=\"notifications\"")
    expect(profile).toContain("id=\"orders\"")
  })

  it('ofrece acceso social real y controles de sesion circulares en el acceso movil', () => {
    const auth = readFileSync(resolve(__dirname, '../mobile/MobileAuthPages.tsx'), 'utf8')
    const authService = readFileSync(resolve(__dirname, '../services/auth.service.ts'), 'utf8')
    const styles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')

    expect(auth).toContain('SocialAuthActions')
    expect(auth).toContain('CheckControl name="remember"')
    expect(auth).toContain('CheckControl name="terms"')
    expect(auth).toContain('signInWithAppleNative')
    expect(authService).toContain("signInWithOAuth(provider: 'google' | 'apple')")
    expect(authService).toContain('requestNativeAppleCredential')
    expect(authService).toContain('signInWithIdToken')
    expect(authService).toContain("provider: 'apple'")
    expect(authService).toContain('nonce: credential.nonce')
    expect(styles).toContain('.native-auth-check__mark')
    expect(styles).toContain('.native-auth-social')
    expect(styles).toContain('.app-bottom-nav__item.is-active')
  })

  it('configura Sign in with Apple nativo y capabilities iOS sin secrets cliente', () => {
    const nativeAppleAuth = readFileSync(resolve(__dirname, '../services/nativeAppleAuth.ts'), 'utf8')
    const nativePlugin = readFileSync(resolve(__dirname, '../../ios/App/App/NativeAppleAuthPlugin.swift'), 'utf8')
    const bridge = readFileSync(resolve(__dirname, '../../ios/App/App/HdlBridgeViewController.swift'), 'utf8')
    const entitlements = readFileSync(resolve(__dirname, '../../ios/App/App/App.entitlements'), 'utf8')
    const xcodeProject = readFileSync(resolve(__dirname, '../../ios/App/App.xcodeproj/project.pbxproj'), 'utf8')

    expect(nativeAppleAuth).toContain("registerPlugin<NativeAppleAuthPlugin>('NativeAppleAuth')")
    expect(nativePlugin).toContain('AuthenticationServices')
    expect(nativePlugin).toContain('ASAuthorizationAppleIDProvider')
    expect(nativePlugin).toContain('request.nonce = sha256(nonce)')
    expect(nativePlugin).toContain('"identityToken": identityToken')
    expect(nativePlugin).toContain('"nonce": nonce')
    expect(bridge).toContain('registerPluginType(NativeAppleAuthPlugin.self)')
    expect(entitlements).toContain('com.apple.developer.applesignin')
    expect(entitlements).toContain('aps-environment')
    expect(xcodeProject).toContain('DEVELOPMENT_TEAM = XK3A98XNZ3')
    expect(xcodeProject).toContain('CODE_SIGN_STYLE = Automatic')
    expect(xcodeProject).toContain('CODE_SIGN_ENTITLEMENTS = App/App.entitlements')
    expect(xcodeProject).toContain('com.apple.SignInWithApple')
    expect(xcodeProject).toContain('com.apple.Push')
    expect(nativeAppleAuth).not.toMatch(/p8|private[_-]?key|client[_-]?secret/i)
    expect(nativePlugin).not.toMatch(/p8|private[_-]?key|client[_-]?secret/i)
  })

  it('usa backend productivo como fallback solo en el build movil de Capacitor', () => {
    const apiService = readFileSync(resolve(__dirname, '../services/api.ts'), 'utf8')

    expect(apiService).toContain("VITE_HDL_APP_TARGET === 'mobile'")
    expect(apiService).toContain('https://hdlsistema-production.up.railway.app')
    expect(apiService).toContain('(RAW_BASE || MOBILE_API_FALLBACK).replace')
  })

  it('normaliza covers publicos en snake_case y camelCase para mobile', () => {
    expect(imageField({ id: 'wine-1', cover_image_url: 'https://storage/wine.webp' }, '')).toBe('https://storage/wine.webp')
    expect(imageField({ id: 'service-1', coverImageUrl: 'https://storage/cabin.webp' }, '')).toBe('https://storage/cabin.webp')
    expect(imageField({ id: 'event-1', image_url: 'https://storage/event.webp' }, '')).toBe('https://storage/event.webp')
    expect(imageField({ id: 'fallback-1' }, '/fallback.webp')).toBe('/fallback.webp')
  })

  it('conecta Home, catalogo y detalle a vinos publicados desde API publica', () => {
    const home = readFileSync(resolve(__dirname, '../app/pages/mobile/HomeScreen.tsx'), 'utf8')
    const store = readFileSync(resolve(__dirname, '../app/pages/mobile/StoreScreen.tsx'), 'utf8')
    const detail = readFileSync(resolve(__dirname, '../app/pages/mobile/WineDetailScreen.tsx'), 'utf8')

    expect(home).toContain("usePublicContent('wines')")
    expect(home).toContain('wines.slice(0, 4)')
    expect(home).toContain('imageField(wine,')
    expect(store).toContain("usePublicContent('wines')")
    expect(store).toContain('imageField(wine,')
    expect(detail).toContain('galleryImages(wine')
    expect(detail).toContain('imageField(wine,')
  })

  it('mantiene experiencias y servicios comerciales server-driven con imagenes reales', () => {
    const experiences = readFileSync(resolve(__dirname, '../app/pages/mobile/ExperiencesScreen.tsx'), 'utf8')
    const cabins = readFileSync(resolve(__dirname, '../app/pages/mobile/CabinsScreen.tsx'), 'utf8')
    const restaurants = readFileSync(resolve(__dirname, '../app/pages/mobile/RestaurantsScreen.tsx'), 'utf8')
    const quote = readFileSync(resolve(__dirname, '../app/pages/mobile/QuoteRequestScreen.tsx'), 'utf8')
    const commercialHook = readFileSync(resolve(__dirname, '../app/hooks/usePublicCommercialServices.ts'), 'utf8')

    expect(experiences).toContain("usePublicContent('experiences')")
    expect(experiences).toContain('imageField(experience,')
    expect(cabins).toContain('usePublicCommercialServices()')
    expect(cabins).toContain('item.coverImageUrl')
    expect(restaurants).toContain('usePublicCommercialServices()')
    expect(restaurants).toContain('item.coverImageUrl')
    expect(quote).toContain('usePublicCommercialServices()')
    expect(quote).toContain('venueSpaces')
    expect(commercialHook).toMatch(/publicCommercialClient\s*\.services\(\)/)
    expect(commercialHook).toContain("setError('No fue posible cargar el contenido comercial.')")
    expect(commercialHook).not.toContain('commercial-services')
  })

  it('usa disclosure progresivo y sheets cristal en Celebra sin selects nativos', () => {
    const quote = readFileSync(resolve(__dirname, '../app/pages/mobile/QuoteRequestScreen.tsx'), 'utf8')
    const dateField = readFileSync(resolve(__dirname, '../app/components/shared/CrystalDateField.tsx'), 'utf8')
    const styles = readFileSync(resolve(__dirname, '../app/styles/globals.css'), 'utf8')

    expect(quote).toContain('ChoiceSheet')
    expect(quote).toContain('setEventSheetOpen(true)')
    expect(quote).toContain('setSpaceSheetOpen(true)')
    expect(quote).toContain("const [guestCount, setGuestCount] = useState('80')")
    expect(quote).toContain("setGuestCount(nextValue === '' ? '' : String(Math.max(1, Number(nextValue))))")
    expect(quote).toContain("const businessTypes = ['Cena empresarial', 'Integración de equipo', 'Evento de fin de año', 'Otro']")
    expect(quote).not.toContain('<select')
    expect(dateField).toContain('crystal-date-popover')
    expect(styles).toContain('html.hdl-mobile-app .crystal-date-popover')
    expect(styles).toContain('grid-template-columns: repeat(7, minmax(0, 1fr))')
  })

  it('mantiene experiencias con chips premium y reservacion con sheet cristal sin dropdown recortado', () => {
    const ui = readFileSync(resolve(__dirname, '../app/components/mobile/PremiumMobileUi.tsx'), 'utf8')
    const reservation = readFileSync(resolve(__dirname, '../app/pages/mobile/ReservationScreen.tsx'), 'utf8')

    expect(ui).toContain('-mx-[var(--app-pad)]')
    expect(ui).toContain('backdrop-blur-xl')
    expect(ui).toContain('bg-[linear-gradient(135deg,#8A1238,#61091F)]')
    expect(reservation).toContain('MobileChoiceSheet')
    expect(reservation).toContain('setExperienceSheetOpen(true)')
    expect(reservation).toContain('fixed inset-0 z-[160]')
    expect(reservation).not.toContain('<section className="overflow-hidden rounded-[1.35rem]')
  })

  it('muestra ordenes recuperables en carrito y permite reabrir checkout sin mostrar pagadas', () => {
    const cart = readFileSync(resolve(__dirname, '../app/pages/mobile/CartScreen.tsx'), 'utf8')
    const checkout = readFileSync(resolve(__dirname, '../app/pages/mobile/CheckoutScreen.tsx'), 'utf8')
    const paymentStatus = readFileSync(resolve(__dirname, '../app/pages/mobile/PaymentStatusScreen.tsx'), 'utf8')
    const profile = readFileSync(resolve(__dirname, '../app/pages/mobile/ProfileScreen.tsx'), 'utf8')

    expect(cart).toContain('isRecoverableOrder')
    expect(cart).toContain("new Set(['paid', 'fulfilled', 'refunded', 'cancelled'])")
    expect(cart).toContain('customerClient.orders(session.access_token)')
    expect(cart).toContain("`${appPath('/checkout')}?orderId=${encodeURIComponent(order.id)}`")
    expect(checkout).toContain('useSearchParams')
    expect(checkout).toContain('customerClient.order(session.access_token, requestedOrderId)')
    expect(checkout).toContain('customerClient.retryPayment(session.access_token, requestedOrderId')
    expect(paymentStatus).toContain("?orderId=${encodeURIComponent(orderId)}")
    expect(profile).toContain('translatedStatus(order.paymentStatus, t)')
    expect(profile).toContain('pendingOrdersCount')
  })

  it('renderiza Markdown seguro del Sommelier sin HTML arbitrario', () => {
    const sommelier = readFileSync(resolve(__dirname, '../app/pages/mobile/SommelierScreen.tsx'), 'utf8')

    expect(sommelier).toContain('renderSommelierMarkdown')
    expect(sommelier).toContain('renderInlineMarkdown')
    expect(sommelier).toContain('<strong')
    expect(sommelier).toContain('<ul')
    expect(sommelier).not.toContain('dangerouslySetInnerHTML')
  })

  it('no usa imagenes QA ni fallbacks locales como contenido comercial runtime', () => {
    const mobileFiles = [
      '../app/pages/mobile/HomeScreen.tsx',
      '../app/pages/mobile/ExperiencesScreen.tsx',
      '../app/pages/mobile/ExperienceDetailScreen.tsx',
      '../app/pages/mobile/EventsScreen.tsx',
      '../app/pages/mobile/EventDetailScreen.tsx',
      '../app/pages/mobile/ReservationScreen.tsx',
      '../app/pages/mobile/MapScreen.tsx',
      '../app/pages/mobile/SommelierScreen.tsx',
      '../mobile/MobileRouter.tsx',
    ].map((file) => readFileSync(resolve(__dirname, file), 'utf8')).join('\n')

    expect(mobileFiles).not.toMatch(/public\/qa|qa\/wines|qa\/hacienda-media/)
    expect(mobileFiles).not.toMatch(/romantic%20dinners|turismo\.jpeg|Slide-1\.webp|Logo-HDL-2\.svg/)
  })
})
