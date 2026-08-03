import { z } from 'zod'

const uuid = z.string().uuid()

export const reservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])

export const reservationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: reservationStatusSchema.optional(),
  experienceId: uuid.optional(),
  customerId: uuid.optional(),
  reservationNumber: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'people_count', 'total']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const createReservationSchema = z.object({
  customerId: uuid.nullable().optional(),
  customerName: z.string().min(2).max(160).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(40).optional(),
  experienceSlotId: uuid,
  peopleCount: z.coerce.number().int().min(1),
  status: z.enum(['pending', 'confirmed']).default('pending'),
  customerNotes: z.string().max(1000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  source: z.string().max(80).default('Centro de control'),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchReservationSchema = z.object({
  customerNotes: z.string().max(1000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  source: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const cancelReservationSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const rescheduleReservationSchema = z.object({
  experienceSlotId: uuid,
}).strict()

export const changePartySizeSchema = z.object({
  peopleCount: z.coerce.number().int().min(1),
}).strict()

export const noteReservationSchema = z.object({
  note: z.string().min(1).max(2000),
}).strict()

export type ReservationListQuery = z.infer<typeof reservationListQuerySchema>
export type CreateReservationPayload = z.infer<typeof createReservationSchema>
export type PatchReservationPayload = z.infer<typeof patchReservationSchema>
