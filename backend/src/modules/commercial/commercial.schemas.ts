import { z } from 'zod'

const uuid = z.string().uuid()
const optionalUuid = uuid.nullable().optional()
const cleanText = (max = 500) => z.string().trim().min(1).max(max)
const optionalText = (max = 1000) => z.string().trim().max(max).nullable().optional()

export const quoteStatusSchema = z.enum(['new', 'contacted', 'in_progress', 'quoted', 'won', 'lost', 'cancelled'])

export const publicCommercialQuerySchema = z.object({
  locale: z.enum(['es', 'en', 'es-MX', 'en-US']).optional(),
}).strict()

export const createQuoteRequestSchema = z.object({
  eventCategory: z.enum(['social', 'business']),
  eventType: cleanText(120),
  preferredDate: z.string().date().nullable().optional(),
  alternativeDate: z.string().date().nullable().optional(),
  preferredStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  preferredEndTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  guestCount: z.coerce.number().int().min(1).max(2500),
  venueSpaceId: optionalUuid,
  venueSpaceName: z.string().trim().max(180).nullable().optional(),
  foodRequired: z.enum(['yes', 'no', 'advice']).default('advice'),
  foodType: z.string().trim().max(160).nullable().optional(),
  wineRequired: z.enum(['yes', 'no', 'advice']).default('advice'),
  wineOption: z.string().trim().max(160).nullable().optional(),
  requestedServices: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  contactFirstName: cleanText(80),
  contactLastName: cleanText(80),
  contactEmail: z.string().trim().email().max(180),
  contactPhone: cleanText(40),
  companyName: z.string().trim().max(160).nullable().optional(),
  notes: optionalText(2500),
  language: z.enum(['es', 'en']).default('es'),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict()

export const createAdminQuoteRequestSchema = createQuoteRequestSchema.extend({
  customerId: optionalUuid,
  source: z.string().trim().min(1).max(80).default('Centro de control'),
  adminNotes: optionalText(2500),
}).strict()

export const createCabinReservationSchema = z.object({
  cabinPackageId: uuid,
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  peopleCount: z.coerce.number().int().min(1).max(8).default(2),
  customerNotes: optionalText(1000),
  language: z.enum(['es', 'en']).default('es'),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict().refine((value) => value.checkOut > value.checkIn, {
  path: ['checkOut'],
  message: 'La salida debe ser posterior a la llegada',
})

export const createRestaurantReservationSchema = z.object({
  restaurantLocationId: uuid,
  reservationDate: z.string().date(),
  reservationTime: z.string().regex(/^\d{2}:\d{2}$/),
  peopleCount: z.coerce.number().int().min(1).max(40),
  occasion: z.string().trim().max(120).nullable().optional(),
  customerNotes: optionalText(1000),
  language: z.enum(['es', 'en']).default('es'),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict()

export const quoteRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  status: quoteStatusSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'guest_count', 'preferred_date']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
}).strict()

export const patchQuoteRequestSchema = z.object({
  status: quoteStatusSchema.optional(),
  assignedTo: optionalUuid,
  adminNotes: optionalText(2500),
}).strict()

export const sendQuoteRequestEmailSchema = z.object({
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(5000),
  quoteAmount: z.coerce.number().min(0).max(50_000_000).nullable().optional(),
  currency: z.string().trim().min(3).max(8).default('MXN'),
  validUntil: z.string().date().nullable().optional(),
  adminNotes: optionalText(2500),
}).strict()

const catalogCommon = {
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(180),
  status: z.enum(['draft', 'published', 'inactive', 'archived']).default('draft'),
  visibleInApp: z.boolean().default(false),
  verificationStatus: z.enum(['verified', 'pending_client_confirmation']).default('verified'),
  coverImageUrl: z.string().url().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
}

export const cabinCatalogSchema = z.object({
  ...catalogCommon,
  subtitle: optionalText(240),
  description: optionalText(3000),
  price: z.coerce.number().min(0),
  currency: z.string().trim().length(3).default('MXN'),
  priceUnit: z.string().trim().min(1).max(80).default('pareja'),
  minGuests: z.coerce.number().int().min(1).max(30),
  maxGuests: z.coerce.number().int().min(1).max(30),
  nights: z.coerce.number().int().min(1).max(60),
  inclusions: z.array(z.string().trim().min(1).max(180)).max(30).default([]),
}).strict().refine((value) => value.maxGuests >= value.minGuests, { path: ['maxGuests'], message: 'Capacidad máxima inválida' })

export const restaurantCatalogSchema = z.object({
  ...catalogCommon,
  alias: optionalText(180),
  description: optionalText(3000),
  fullAddress: optionalText(500),
  city: optionalText(120),
  state: optionalText(120),
  phone: optionalText(40),
  hours: z.record(z.string(), z.unknown()).default({}),
  reservationEnabled: z.boolean().default(true),
}).strict()

export const venueCatalogSchema = z.object({
  ...catalogCommon,
  capacity: z.coerce.number().int().min(1).max(10000),
  dimensions: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
}).strict()

export const commercialCatalogEntitySchema = z.enum(['cabins', 'restaurants', 'venues'])

export type CreateQuoteRequestPayload = z.infer<typeof createQuoteRequestSchema>
export type CreateAdminQuoteRequestPayload = z.infer<typeof createAdminQuoteRequestSchema>
export type CreateCabinReservationPayload = z.infer<typeof createCabinReservationSchema>
export type CreateRestaurantReservationPayload = z.infer<typeof createRestaurantReservationSchema>
export type QuoteRequestListQuery = z.infer<typeof quoteRequestListQuerySchema>
export type PatchQuoteRequestPayload = z.infer<typeof patchQuoteRequestSchema>
export type SendQuoteRequestEmailPayload = z.infer<typeof sendQuoteRequestEmailSchema>
export type CabinCatalogPayload = z.infer<typeof cabinCatalogSchema>
export type RestaurantCatalogPayload = z.infer<typeof restaurantCatalogSchema>
export type VenueCatalogPayload = z.infer<typeof venueCatalogSchema>
export type CommercialCatalogEntity = z.infer<typeof commercialCatalogEntitySchema>
