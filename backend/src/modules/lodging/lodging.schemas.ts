import { z } from 'zod'

const uuid = z.string().uuid()

export const lodgingCalendarQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  unitId: uuid.optional(),
}).strict()

export const lodgingUnitPayloadSchema = z.object({
  cabinPackageId: uuid.nullable().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(30),
  baseRate: z.coerce.number().min(0),
  currency: z.string().trim().length(3).default('MXN'),
  operationalStatus: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  housekeepingStatus: z.enum(['clean', 'dirty', 'inspection', 'out_of_service']).default('clean'),
  coverImageUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const lodgingUnitPatchSchema = lodgingUnitPayloadSchema.partial().strict()

export const lodgingReservationPayloadSchema = z.object({
  customerId: uuid.nullable().optional(),
  customerName: z.string().trim().min(2).max(160).optional(),
  customerEmail: z.string().trim().email().optional(),
  customerPhone: z.string().trim().max(40).optional(),
  cabinPackageId: uuid,
  unitId: uuid.nullable().optional(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  peopleCount: z.coerce.number().int().min(1).max(30),
  status: z.enum(['pending', 'confirmed']).default('pending'),
  source: z.enum(['Centro de control', 'Teléfono', 'WhatsApp', 'Mostrador', 'Agencia', 'Web', 'App', 'Otro']).default('Centro de control'),
  customerNotes: z.string().max(1000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  idempotencyKey: z.string().min(8).max(160),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const lodgingBlockPayloadSchema = z.object({
  unitId: uuid,
  startDate: z.string().date(),
  endDate: z.string().date(),
  entryType: z.enum(['maintenance', 'owner_block', 'private_event', 'operations', 'other']),
  reason: z.string().trim().min(2).max(500),
}).strict()

export const lodgingCheckInPayloadSchema = z.object({
  guestManifest: z.array(z.object({
    fullName: z.string().trim().min(2).max(160),
    documentType: z.string().trim().max(60).nullable().optional(),
    documentLast4: z.string().trim().max(8).nullable().optional(),
  }).strict()).max(30).default([]),
  notes: z.string().max(1000).nullable().optional(),
}).strict()

export const lodgingCheckOutPayloadSchema = z.object({
  notes: z.string().max(1000).nullable().optional(),
}).strict()

export const lodgingReschedulePayloadSchema = z.object({
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  unitId: uuid.nullable().optional(),
}).strict()

export type LodgingCalendarQuery = z.infer<typeof lodgingCalendarQuerySchema>
export type LodgingUnitPayload = z.infer<typeof lodgingUnitPayloadSchema>
export type LodgingUnitPatch = z.infer<typeof lodgingUnitPatchSchema>
export type LodgingReservationPayload = z.infer<typeof lodgingReservationPayloadSchema>
export type LodgingBlockPayload = z.infer<typeof lodgingBlockPayloadSchema>
export type LodgingCheckInPayload = z.infer<typeof lodgingCheckInPayloadSchema>
export type LodgingCheckOutPayload = z.infer<typeof lodgingCheckOutPayloadSchema>
export type LodgingReschedulePayload = z.infer<typeof lodgingReschedulePayloadSchema>
