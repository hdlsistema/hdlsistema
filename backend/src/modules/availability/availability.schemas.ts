import { z } from 'zod'

const uuid = z.string().uuid()
const isoDateTime = z.string().datetime({ offset: true })

export const availabilityQuerySchema = z.object({
  experienceId: uuid.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  status: z.enum(['open', 'blocked', 'closed', 'published', 'inactive']).optional(),
  availability: z.enum(['available', 'full', 'blocked']).optional(),
})

export const slotPayloadSchema = z.object({
  experienceId: uuid,
  startAt: isoDateTime,
  endAt: isoDateTime,
  capacity: z.coerce.number().int().min(1),
  priceOverride: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  isBookable: z.boolean().optional(),
  operationalStatus: z.enum(['open', 'blocked', 'closed']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const slotPatchSchema = z.object({
  startAt: isoDateTime.optional(),
  endAt: isoDateTime.optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  priceOverride: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  isBookable: z.boolean().optional(),
  operationalStatus: z.enum(['open', 'blocked', 'closed']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const blockSlotSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const blockoutPayloadSchema = z.object({
  experienceId: uuid.nullable().optional(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  reason: z.string().max(500).nullable().optional(),
  blockType: z.enum(['manual', 'maintenance', 'private_event', 'weather', 'operations', 'other']).optional(),
  appliesToAllExperiences: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const blockoutPatchSchema = blockoutPayloadSchema.partial().strict()

export const duplicateSlotsSchema = z.object({
  experienceId: uuid,
  sourceDate: z.string().date(),
  targetDates: z.array(z.string().date()).min(1).max(31),
}).strict()

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>
export type SlotPayload = z.infer<typeof slotPayloadSchema>
export type SlotPatch = z.infer<typeof slotPatchSchema>
export type BlockoutPayload = z.infer<typeof blockoutPayloadSchema>
export type BlockoutPatch = z.infer<typeof blockoutPatchSchema>
export type DuplicateSlotsPayload = z.infer<typeof duplicateSlotsSchema>
