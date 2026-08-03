import { z } from 'zod'

const uuid = z.string().uuid()
const emptyToNull = (value: string | null | undefined) => {
  const cleaned = typeof value === 'string' ? value.trim() : value
  return cleaned ? cleaned : null
}

export const customerSegmentSchema = z.enum([
  'customer',
  'new',
  'recurrente',
  'vip',
  'alto_valor',
  'inactivo',
  'en_riesgo',
  'wine_club',
  'corporativo',
])

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['draft', 'published', 'archived', 'inactive']).optional(),
  segment: customerSegmentSchema.optional(),
  source: z.string().trim().max(80).optional(),
  tagId: uuid.optional(),
  hasReservations: z.enum(['true', 'false']).optional(),
  hasOrders: z.enum(['true', 'false']).optional(),
  hasMembership: z.enum(['true', 'false']).optional(),
  consent: z.enum(['email', 'push', 'none']).optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'last_visit_at', 'total_spend', 'total_visits', 'display_name']).default('updated_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const customerPayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).nullable().optional().transform(emptyToNull),
  displayName: z.string().trim().max(160).nullable().optional().transform(emptyToNull),
  email: z.string().trim().email().nullable().optional().transform(emptyToNull),
  phone: z.string().trim().min(7).max(24).regex(/^\+?[0-9\s().-]+$/).nullable().optional().transform(emptyToNull),
  birthDate: z.string().date().nullable().optional().transform(emptyToNull),
  source: z.string().trim().max(80).default('Centro de control'),
  segment: customerSegmentSchema.default('new'),
  preferredLanguage: z.enum(['es', 'en']).default('es'),
  marketingEmailConsent: z.boolean().default(false),
  marketingPushConsent: z.boolean().default(false),
  notes: z.string().trim().max(4000).nullable().optional().transform(emptyToNull),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const customerPatchSchema = customerPayloadSchema.partial().strict()

export const customerNotePayloadSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const customerTagPayloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#681126'),
  description: z.string().trim().max(500).nullable().optional().transform(emptyToNull),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const customerTagPatchSchema = customerTagPayloadSchema.partial().strict()

export const assignTagSchema = z.object({
  tagId: uuid,
}).strict()

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>
export type CustomerPayload = z.infer<typeof customerPayloadSchema>
export type CustomerPatch = z.infer<typeof customerPatchSchema>
export type CustomerNotePayload = z.infer<typeof customerNotePayloadSchema>
export type CustomerTagPayload = z.infer<typeof customerTagPayloadSchema>
export type CustomerTagPatch = z.infer<typeof customerTagPatchSchema>
