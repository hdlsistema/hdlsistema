import { createContext, useContext, type MouseEvent } from 'react'

export type GuestPromptOptions = {
  from?: string
  title?: string
  message?: string
}

export type GuestLinkEvent = Pick<MouseEvent<HTMLElement>, 'preventDefault'>

export type MobileGuestAccessContextValue = {
  requestAuth: (options?: GuestPromptOptions) => void
  guardLink: (event: GuestLinkEvent, target: string, options?: GuestPromptOptions) => boolean
}

const defaultContext: MobileGuestAccessContextValue = {
  requestAuth: () => undefined,
  guardLink: () => true,
}

export const MobileGuestAccessContext = createContext<MobileGuestAccessContextValue>(defaultContext)

const PUBLIC_GUEST_PATHS = [
  '/',
  '/auth/callback',
  '/home',
  '/login',
  '/recuperar',
  '/registro',
  '/reset-password',
  '/vinos',
  '/tienda',
  '/experiencias',
  '/eventos',
  '/nuestros-eventos',
  '/eventos-magnos',
  '/promociones',
  '/cabanas',
  '/restaurantes',
  '/mapa',
  '/politica-de-privacidad',
  '/terminos-y-condiciones',
]

const PRIVATE_GUEST_PATHS = [
  '/carrito',
  '/checkout',
  '/pago',
  '/perfil',
  '/privacidad-cuenta',
  '/eliminar-cuenta',
  '/reservacion',
  '/celebra',
  '/membresias',
  '/club',
  '/sommelier',
  '/gift-card',
  '/gift-cards',
  '/qr',
  '/accesses',
  '/pedidos',
  '/historial',
  '/notificaciones',
  '/control',
]

function stripQueryAndHash(value: string) {
  return value.split('#')[0]?.split('?')[0] || '/'
}

function matchesPath(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function normalizeMobileGuestPath(target: string) {
  const rawTarget = String(target || '/').trim() || '/'
  let rawPath = rawTarget

  try {
    if (/^[a-z][a-z\d+.-]*:/i.test(rawTarget)) {
      rawPath = new URL(rawTarget).pathname
    }
  } catch {
    rawPath = rawTarget
  }

  const path = stripQueryAndHash(rawPath).replace(/^\/app(?=\/|$)/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function isMobileGuestPublicPath(target: string) {
  const path = normalizeMobileGuestPath(target)
  if (PRIVATE_GUEST_PATHS.some((prefix) => matchesPath(path, prefix))) return false
  return PUBLIC_GUEST_PATHS.some((prefix) => matchesPath(path, prefix))
}

export function useMobileGuestAccess() {
  return useContext(MobileGuestAccessContext)
}
