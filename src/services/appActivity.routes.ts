import type { AppActivityEventName } from './appActivity.service'

export type AppRouteActivity = {
  eventName: AppActivityEventName
  entityType?: 'wine' | 'experience' | 'event' | 'cabin' | 'restaurant' | 'quote_request' | 'membership' | 'reservation' | 'cart' | 'order'
  entityId?: string
}

export function eventForAppPath(pathname: string): AppRouteActivity | null {
  const path = pathname.replace(/^\/app(?=\/|$)/, '') || '/'
  if (path === '/home') return { eventName: 'home_viewed' }
  if (path === '/vinos' || path === '/tienda') return { eventName: 'wine_list_viewed' }
  if (/^\/(vinos|tienda)\/[^/]+$/.test(path)) {
    const parts = path.split('/')
    return { eventName: 'wine_viewed', entityType: 'wine', entityId: parts[parts.length - 1] }
  }
  if (path === '/experiencias') return { eventName: 'experience_list_viewed' }
  if (/^\/experiencias\/[^/]+$/.test(path)) {
    const parts = path.split('/')
    return { eventName: 'experience_viewed', entityType: 'experience', entityId: parts[parts.length - 1] }
  }
  if (path === '/eventos' || path === '/eventos-magnos' || path === '/nuestros-eventos') return { eventName: 'event_list_viewed' }
  if (/^\/nuestros-eventos\/[^/]+$/.test(path)) return { eventName: 'event_list_viewed', entityType: 'event' }
  if (/^\/(eventos|eventos-magnos)\/[^/]+$/.test(path)) {
    const parts = path.split('/')
    return { eventName: 'event_viewed', entityType: 'event', entityId: parts[parts.length - 1] }
  }
  if (path === '/cabanas') return { eventName: 'cabin_viewed', entityType: 'cabin' }
  if (path === '/restaurantes') return { eventName: 'restaurant_viewed', entityType: 'restaurant' }
  if (path === '/celebra') return { eventName: 'quote_started', entityType: 'quote_request' }
  if (path === '/membresias' || path === '/club') return { eventName: 'membership_viewed', entityType: 'membership' }
  if (path === '/mapa') return { eventName: 'map_opened' }
  if (path === '/sommelier') return { eventName: 'sommelier_opened' }
  if (path === '/reservacion') return { eventName: 'reservation_started', entityType: 'reservation' }
  if (path === '/carrito') return { eventName: 'cart_viewed', entityType: 'cart' }
  if (path === '/checkout') return { eventName: 'checkout_started', entityType: 'order' }
  return null
}
