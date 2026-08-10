import { z } from 'zod'

export const appEventNames = [
  'customer_signup_completed',
  'customer_login',
  'customer_logout',
  'customer_profile_updated',
  'home_viewed',
  'wine_list_viewed',
  'wine_viewed',
  'wine_search',
  'wine_filter_used',
  'experience_list_viewed',
  'experience_viewed',
  'event_list_viewed',
  'event_viewed',
  'membership_viewed',
  'map_opened',
  'map_poi_opened',
  'sommelier_opened',
  'reservation_started',
  'reservation_created',
  'reservation_rescheduled',
  'reservation_cancelled',
  'reservation_failed',
  'cart_created',
  'cart_item_added',
  'cart_item_removed',
  'cart_quantity_updated',
  'cart_viewed',
  'checkout_started',
  'checkout_payment_form_viewed',
  'checkout_payment_attempted',
  'payment_processing',
  'payment_succeeded',
  'payment_failed',
  'payment_cancelled',
  'payment_refunded',
] as const

export type AppEventName = typeof appEventNames[number]

const safeIdentifier = z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9:_-]+$/)

const metadataSchema = z.object({
  route: z.string().trim().min(1).max(180).optional(),
  locale: z.enum(['es', 'en', 'es-MX', 'en-US']).optional(),
  filter: z.string().trim().min(1).max(80).optional(),
  sort: z.string().trim().min(1).max(80).optional(),
  itemType: z.enum(['wine', 'experience', 'event_ticket', 'membership']).optional(),
  quantity: z.number().int().min(0).max(99).optional(),
  result: z.enum(['started', 'succeeded', 'failed', 'cancelled', 'processing']).optional(),
  reason: z.string().trim().min(1).max(80).optional(),
}).strict()

export const appActivityEventSchema = z.object({
  sessionId: safeIdentifier,
  eventName: z.enum(appEventNames),
  entityType: z.enum(['customer', 'wine', 'experience', 'event', 'membership', 'reservation', 'cart', 'cart_item', 'order', 'payment', 'map_poi']).nullable().optional(),
  entityId: safeIdentifier.nullable().optional(),
  eventKey: safeIdentifier,
  occurredAt: z.string().datetime().optional(),
  metadata: metadataSchema.default({}),
})

export const activityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  customerId: z.string().uuid().optional(),
  customer: z.string().trim().min(2).max(120).optional(),
  eventName: z.enum(appEventNames).optional(),
  module: z.enum(['account', 'content', 'reservation', 'cart', 'checkout', 'payment']).optional(),
  result: z.enum(['started', 'succeeded', 'failed', 'cancelled', 'processing']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const cartsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['active', 'checkout_started', 'abandoned', 'converted']).optional(),
  customerId: z.string().uuid().optional(),
  customer: z.string().trim().min(2).max(120).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export type AppActivityEventPayload = z.infer<typeof appActivityEventSchema>
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>
export type CartsListQuery = z.infer<typeof cartsListQuerySchema>
