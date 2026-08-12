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

export const customerAddressSchema = z.object({
  label: z.string().trim().min(1).max(80).default('Casa'),
  recipientName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(40).optional(),
  email: z.string().trim().email().optional(),
  line1: z.string().trim().min(4).max(220),
  line2: z.string().trim().max(160).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(4).max(12),
  country: z.string().trim().min(2).max(80).default('MX'),
  references: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
}).strict()

export const customerAddressUpdateSchema = customerAddressSchema.partial().strict()

export const createCustomerOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  discountCode: z.string().trim().min(1).max(80).optional(),
  language: z.enum(['es', 'en']).default('es'),
  shippingAddress: customerAddressSchema.optional(),
  saveAddress: z.boolean().default(false),
}).strict()

export const customerPaymentActionSchema = z.object({
  idempotencyKey: z.string().min(8).max(160).optional(),
}).strict()

export const registerCustomerDeviceSchema = z.object({
  firebaseToken: z.string().trim().min(20).max(4096),
  platform: z.enum(['android', 'ios', 'web']),
}).strict()

export type CustomerProfilePatch = z.infer<typeof customerProfilePatchSchema>
export type CustomerAvailabilityQuery = z.infer<typeof customerAvailabilityQuerySchema>
export type CustomerReservationListQuery = z.infer<typeof customerReservationListQuerySchema>
export type CreateCustomerReservationPayload = z.infer<typeof createCustomerReservationSchema>
export type CancelCustomerReservationPayload = z.infer<typeof cancelCustomerReservationSchema>
export type RescheduleCustomerReservationPayload = z.infer<typeof rescheduleCustomerReservationSchema>
export type AddCustomerCartItemPayload = z.infer<typeof addCustomerCartItemSchema>
export type UpdateCustomerCartItemPayload = z.infer<typeof updateCustomerCartItemSchema>
export type CustomerAddressPayload = z.infer<typeof customerAddressSchema>
export type CustomerAddressUpdatePayload = z.infer<typeof customerAddressUpdateSchema>
export type CreateCustomerOrderPayload = z.infer<typeof createCustomerOrderSchema>
export type CustomerPaymentActionPayload = z.infer<typeof customerPaymentActionSchema>
export type RegisterCustomerDevicePayload = z.infer<typeof registerCustomerDeviceSchema>
