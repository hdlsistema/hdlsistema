import { z } from 'zod'

const uuid = z.string().uuid()

export const membershipStatusSchema = z.enum(['pending', 'active', 'paused', 'cancelled', 'expired'])

export const membershipListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  customerId: uuid.optional(),
  planId: uuid.optional(),
  status: membershipStatusSchema.optional(),
  renewalFrom: z.string().date().optional(),
  renewalTo: z.string().date().optional(),
  expirationFrom: z.string().date().optional(),
  expirationTo: z.string().date().optional(),
  minPoints: z.coerce.number().int().min(0).optional(),
  maxPoints: z.coerce.number().int().min(0).optional(),
  active: z.coerce.boolean().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'renewal_date', 'expires_at', 'points_balance', 'status']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const createMembershipSchema = z.object({
  customerId: uuid,
  planId: uuid,
  startDate: z.string().datetime().optional(),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const patchMembershipSchema = z.object({
  planId: uuid.optional(),
  autoRenew: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const membershipReasonSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const loyaltyAdjustmentSchema = z.object({
  points: z.coerce.number().int().refine((value) => value !== 0),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const orderLoyaltySchema = z.object({
  orderId: uuid,
  points: z.coerce.number().int().min(1).optional(),
}).strict()

export type MembershipListQuery = z.infer<typeof membershipListQuerySchema>
export type CreateMembershipPayload = z.infer<typeof createMembershipSchema>
export type PatchMembershipPayload = z.infer<typeof patchMembershipSchema>
