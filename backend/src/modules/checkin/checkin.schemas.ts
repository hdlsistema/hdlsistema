import { z } from 'zod'

const uuid = z.string().uuid()

export const accessPassListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: z.enum(['draft', 'published', 'archived', 'inactive', 'scheduled']).optional(),
  reservationId: uuid.optional(),
  orderId: uuid.optional(),
  orderBy: z.enum(['created_at', 'issued_at', 'used_at', 'status']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const issueAccessPassSchema = z.object({
  reservationId: uuid.nullable().optional(),
  orderId: uuid.nullable().optional(),
  eventTicketTypeId: uuid.nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const revokeAccessPassSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const validateAccessPassSchema = z.object({
  code: z.string().min(12).max(500),
}).strict()

export const checkinListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  accessPassId: uuid.optional(),
  status: z.enum(['active', 'reversed']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['checked_in_at', 'created_at']).default('checked_in_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const registerCheckinSchema = z.object({
  accessPassId: uuid,
  requestId: z.string().max(160).optional(),
  notes: z.string().max(1000).nullable().optional(),
  evidenceStoragePath: z.string().max(400).nullable().optional(),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const reverseCheckinSchema = z.object({
  reason: z.string().min(1).max(500),
}).strict()

export type AccessPassListQuery = z.infer<typeof accessPassListQuerySchema>
export type IssueAccessPassPayload = z.infer<typeof issueAccessPassSchema>
export type CheckinListQuery = z.infer<typeof checkinListQuerySchema>
export type RegisterCheckinPayload = z.infer<typeof registerCheckinSchema>
