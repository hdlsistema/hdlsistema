import { z } from 'zod'

const uuid = z.string().uuid()

export const orderStatusSchema = z.enum([
  'draft',
  'pending_payment',
  'paid',
  'processing',
  'fulfilled',
  'cancelled',
  'refunded',
])

export const shippingStatusSchema = z.enum([
  'not_required',
  'pending_preparation',
  'preparing',
  'awaiting_tracking',
  'tracking_assigned',
  'shipped',
  'delivered',
  'cancelled',
])

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: orderStatusSchema.optional(),
  shippingStatus: shippingStatusSchema.optional(),
  customerId: uuid.optional(),
  reservationId: uuid.optional(),
  orderNumber: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  payment: z.enum(['with_payment', 'without_payment']).optional(),
  minTotal: z.coerce.number().min(0).optional(),
  maxTotal: z.coerce.number().min(0).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'total', 'status']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const orderItemSchema = z.object({
  itemType: z.string().min(1).max(80).default('manual'),
  itemId: uuid.optional(),
  nameSnapshot: z.string().min(1).max(180),
  skuSnapshot: z.string().max(80).nullable().optional(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const createOrderSchema = z.object({
  customerId: uuid,
  reservationId: uuid.nullable().optional(),
  items: z.array(orderItemSchema).min(1),
  source: z.string().max(80).default('Centro de control'),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  source: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const orderStatusActionSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const orderShippingActionSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
}).strict()

export const orderTrackingSchema = z.object({
  carrier: z.string().trim().min(1).max(120),
  trackingNumber: z.string().trim().min(1).max(120),
  trackingUrl: z.string().trim().url().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
}).strict()

export const orderShipSchema = z.object({
  confirmWithoutTracking: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
}).strict()

export type OrderListQuery = z.infer<typeof orderListQuerySchema>
export type CreateOrderPayload = z.infer<typeof createOrderSchema>
export type PatchOrderPayload = z.infer<typeof patchOrderSchema>
export type OrderShippingActionPayload = z.infer<typeof orderShippingActionSchema>
export type OrderTrackingPayload = z.infer<typeof orderTrackingSchema>
export type OrderShipPayload = z.infer<typeof orderShipSchema>
