import { z } from 'zod'

const uuid = z.string().uuid()

export const shipmentStatusSchema = z.enum(['pending', 'preparing', 'ready', 'shipped', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled'])

export const shipmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  orderId: uuid.optional(),
  carrierId: uuid.optional(),
  status: shipmentStatusSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'estimated_delivery_at', 'delivered_at', 'status_text']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const createCarrierSchema = z.object({
  name: z.string().min(1).max(160),
  carrierType: z.string().max(80).default('manual'),
  contactName: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const createShipmentSchema = z.object({
  orderId: uuid,
  carrierId: uuid.nullable().optional(),
  carrier: z.string().max(160).nullable().optional(),
  serviceLevel: z.string().max(80).nullable().optional(),
  trackingNumber: z.string().max(160).nullable().optional(),
  origin: z.string().max(260).nullable().optional(),
  destination: z.string().max(500).nullable().optional(),
  estimatedDeliveryAt: z.string().datetime().nullable().optional(),
  shippingCost: z.coerce.number().min(0).default(0),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchShipmentSchema = z.object({
  carrierId: uuid.nullable().optional(),
  carrier: z.string().max(160).nullable().optional(),
  serviceLevel: z.string().max(80).nullable().optional(),
  trackingNumber: z.string().max(160).nullable().optional(),
  origin: z.string().max(260).nullable().optional(),
  destination: z.string().max(500).nullable().optional(),
  estimatedDeliveryAt: z.string().datetime().nullable().optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const shipmentStatusActionSchema = z.object({
  status: shipmentStatusSchema,
  notes: z.string().max(500).nullable().optional(),
}).strict()

export const shipmentIncidentSchema = z.object({
  notes: z.string().min(1).max(1000),
  evidenceStoragePath: z.string().max(500).nullable().optional(),
}).strict()

export const shipmentDeliverSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
  evidenceStoragePath: z.string().max(500).nullable().optional(),
}).strict()

export type ShipmentListQuery = z.infer<typeof shipmentListQuerySchema>
export type CreateCarrierPayload = z.infer<typeof createCarrierSchema>
export type CreateShipmentPayload = z.infer<typeof createShipmentSchema>
export type PatchShipmentPayload = z.infer<typeof patchShipmentSchema>
