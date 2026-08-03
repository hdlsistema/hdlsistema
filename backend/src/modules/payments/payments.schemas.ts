import { z } from 'zod'

const uuid = z.string().uuid()

export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled',
])

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: paymentStatusSchema.optional(),
  provider: z.string().max(80).optional(),
  orderId: uuid.optional(),
  method: z.string().max(80).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'paid_at', 'amount', 'status']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const manualPaymentSchema = z.object({
  orderId: uuid,
  amount: z.coerce.number().positive(),
  paymentMethodType: z.string().min(1).max(80),
  paymentReference: z.string().min(1).max(160),
  receiptStoragePath: z.string().max(400).nullable().optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(1000).nullable().optional(),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const refundPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const paymentWebhookSchema = z.object({
  providerEventId: z.string().min(1).max(180),
  eventType: z.string().min(1).max(120),
  payloadHash: z.string().min(16).max(180),
  providerEnvironment: z.enum(['sandbox', 'provider']).default('provider'),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>
export type ManualPaymentPayload = z.infer<typeof manualPaymentSchema>
export type RefundPaymentPayload = z.infer<typeof refundPaymentSchema>
export type PaymentWebhookPayload = z.infer<typeof paymentWebhookSchema>
