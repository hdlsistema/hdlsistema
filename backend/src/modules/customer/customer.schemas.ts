import { z } from 'zod'

const uuid = z.string().uuid()

export const customerProfilePatchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(160).optional(),
  phone: z.string().max(40).nullable().optional(),
  preferredLanguage: z.enum(['es', 'en']).optional(),
  marketingEmail: z.boolean().optional(),
  marketingPush: z.boolean().optional(),
  transactionalPush: z.boolean().optional(),
}).strict()

export const customerAvailabilityQuerySchema = z.object({
  experienceId: uuid.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).strict()

export const customerReservationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
}).strict()

export const createCustomerReservationSchema = z.object({
  experienceSlotId: uuid,
  peopleCount: z.coerce.number().int().min(1).max(20),
  customerNotes: z.string().max(1000).nullable().optional(),
  language: z.enum(['es', 'en']).default('es'),
  idempotencyKey: z.string().min(8).max(120),
}).strict()

export const cancelCustomerReservationSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export const rescheduleCustomerReservationSchema = z.object({
  experienceSlotId: uuid,
  idempotencyKey: z.string().min(8).max(120),
}).strict()

export const addCustomerCartItemSchema = z.object({
  itemType: z.enum(['wine', 'event_ticket', 'experience']),
  itemId: uuid,
  quantity: z.coerce.number().int().min(1).max(99),
  idempotencyKey: z.string().min(8).max(120),
}).strict()

export const updateCustomerCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
  idempotencyKey: z.string().min(8).max(120).optional(),
}).strict()

export const createCustomerOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  discountCode: z.string().trim().min(1).max(80).optional(),
  language: z.enum(['es', 'en']).default('es'),
}).strict()

export type CustomerProfilePatch = z.infer<typeof customerProfilePatchSchema>
export type CustomerAvailabilityQuery = z.infer<typeof customerAvailabilityQuerySchema>
export type CustomerReservationListQuery = z.infer<typeof customerReservationListQuerySchema>
export type CreateCustomerReservationPayload = z.infer<typeof createCustomerReservationSchema>
export type CancelCustomerReservationPayload = z.infer<typeof cancelCustomerReservationSchema>
export type RescheduleCustomerReservationPayload = z.infer<typeof rescheduleCustomerReservationSchema>
export type AddCustomerCartItemPayload = z.infer<typeof addCustomerCartItemSchema>
export type UpdateCustomerCartItemPayload = z.infer<typeof updateCustomerCartItemSchema>
export type CreateCustomerOrderPayload = z.infer<typeof createCustomerOrderSchema>
