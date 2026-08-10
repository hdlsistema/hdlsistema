import { apiFetch } from './api'

export type AppActivityEventName =
  | 'customer_signup_completed'
  | 'customer_login'
  | 'customer_logout'
  | 'customer_profile_updated'
  | 'home_viewed'
  | 'wine_list_viewed'
  | 'wine_viewed'
  | 'wine_search'
  | 'wine_filter_used'
  | 'experience_list_viewed'
  | 'experience_viewed'
  | 'event_list_viewed'
  | 'event_viewed'
  | 'membership_viewed'
  | 'map_opened'
  | 'map_poi_opened'
  | 'sommelier_opened'
  | 'reservation_started'
  | 'reservation_created'
  | 'reservation_rescheduled'
  | 'reservation_cancelled'
  | 'reservation_failed'
  | 'cart_created'
  | 'cart_item_added'
  | 'cart_item_removed'
  | 'cart_quantity_updated'
  | 'cart_viewed'
  | 'checkout_started'
  | 'checkout_payment_form_viewed'
  | 'checkout_payment_attempted'
  | 'payment_processing'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_refunded'

type ActivityEntity = 'customer' | 'wine' | 'experience' | 'event' | 'membership' | 'reservation' | 'cart' | 'cart_item' | 'order' | 'payment' | 'map_poi'
type Result = 'started' | 'succeeded' | 'failed' | 'cancelled' | 'processing'

type ActivityMetadata = {
  route?: string
  locale?: 'es' | 'en' | 'es-MX' | 'en-US'
  filter?: string
  sort?: string
  itemType?: 'wine' | 'experience' | 'event_ticket' | 'membership'
  quantity?: number
  result?: Result
  reason?: string
}

const sessionStorageKey = 'hdl_app_activity_session'
const sentEventKeys = new Set<string>()

function getSessionId() {
  const existing = window.sessionStorage.getItem(sessionStorageKey)
  if (existing) return existing
  const generated = `app-${crypto.randomUUID()}`
  window.sessionStorage.setItem(sessionStorageKey, generated)
  return generated
}

function cleanKey(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 180)
}

export function appActivityEventKey(eventName: AppActivityEventName, entityId?: string | null, scope?: string) {
  return cleanKey(`${getSessionId()}:${eventName}:${entityId ?? 'none'}:${scope ?? 'once'}`)
}

export function trackAppActivity(input: {
  eventName: AppActivityEventName
  entityType?: ActivityEntity | null
  entityId?: string | null
  metadata?: ActivityMetadata
  accessToken?: string | null
  eventKey?: string
}) {
  const eventKey = input.eventKey ?? appActivityEventKey(input.eventName, input.entityId, input.metadata?.route)
  if (sentEventKeys.has(eventKey)) return
  sentEventKeys.add(eventKey)

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`

  void apiFetch('/api/customer/activity', {
    method: 'POST',
    headers,
    timeoutMs: 2_500,
    body: JSON.stringify({
      sessionId: getSessionId(),
      eventName: input.eventName,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      eventKey,
      occurredAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    }),
  }).catch(() => {
    sentEventKeys.delete(eventKey)
  })
}
