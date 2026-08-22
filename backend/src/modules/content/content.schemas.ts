import { z } from 'zod'
import type { ContentRouteEntity, PublicationAction } from './content.types'

const nullableDate = z.string().datetime().nullable()
const metadataSchema = z.record(z.string(), z.unknown())
const jsonSchema = z.record(z.string(), z.unknown())
const publicImageSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), 'Imagen inválida')

const editorialFields = {
  visible_in_app: z.boolean().optional(),
  visible_in_control: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  publish_at: nullableDate.optional(),
  unpublish_at: nullableDate.optional(),
  locale: z.enum(['es', 'en', 'es-MX', 'en-US']).optional(),
  metadata: metadataSchema.optional(),
}

const contentStatus = z.enum(['draft', 'published', 'scheduled', 'archived', 'inactive'])
const eventStatus = z.enum([
  'draft',
  'published',
  'sold_out',
  'cancelled',
  'completed',
  'scheduled',
  'inactive',
  'archived',
])
const campaignStatus = z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'])
const campaignAudienceFiltersSchema = z
  .object({
    channels: z.array(z.enum(['email', 'push', 'in_app'])).min(1).max(3).optional(),
    search: z.string().trim().max(120).optional(),
    segment: z.string().trim().max(80).optional(),
    source: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
    tagId: z.string().uuid().optional(),
    hasOrders: z.boolean().optional(),
    hasReservations: z.boolean().optional(),
    hasMembership: z.boolean().optional(),
    minAge: z.number().int().min(0).max(120).optional(),
    maxAge: z.number().int().min(0).max(120).optional(),
    minTotalSpend: z.number().min(0).optional(),
    maxTotalSpend: z.number().min(0).optional(),
    minTotalVisits: z.number().int().min(0).optional(),
    maxTotalVisits: z.number().int().min(0).optional(),
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
    locale: z.enum(['es', 'en', 'es-MX', 'en-US']).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .strict()

const eventContentSchema = z
  .object({
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    subtitle: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    short_description: z.string().trim().nullable().optional(),
    venue: z.string().trim().nullable().optional(),
    start_at: z.string().datetime().optional(),
    end_at: z.string().datetime().optional(),
    capacity: z.number().int().positive().optional(),
    sold_count: z.number().int().min(0).optional(),
    featured: z.boolean().optional(),
    status: eventStatus.optional(),
    sales_enabled: z.boolean().optional(),
    cover_image_url: publicImageSchema.nullable().optional(),
    ...editorialFields,
  })
  .strict()

const schemas = {
  wines: z
    .object({
      sku: z.string().trim().min(1).optional(),
      slug: z.string().trim().min(1).optional(),
      name: z.string().trim().min(1).optional(),
      subtitle: z.string().trim().nullable().optional(),
      description: z.string().trim().nullable().optional(),
      category_id: z.string().uuid().nullable().optional(),
      vintage: z.number().int().min(1800).max(2200).nullable().optional(),
      grape_variety: z.string().trim().nullable().optional(),
      alcohol_percentage: z.number().min(0).nullable().optional(),
      volume_ml: z.number().int().positive().nullable().optional(),
      origin: z.string().trim().nullable().optional(),
      tasting_notes: z.string().trim().nullable().optional(),
      pairing_notes: z.string().trim().nullable().optional(),
      serving_temperature: z.string().trim().nullable().optional(),
      price: z.number().min(0).optional(),
      compare_at_price: z.number().min(0).nullable().optional(),
      stock_quantity: z.number().int().min(0).optional(),
      stock_control_enabled: z.boolean().optional(),
      featured: z.boolean().optional(),
      status: contentStatus.optional(),
      cover_image_url: z.string().url().nullable().optional(),
      ...editorialFields,
    })
    .strict(),
  experiences: z
    .object({
      slug: z.string().trim().min(1).optional(),
      title: z.string().trim().min(1).optional(),
      subtitle: z.string().trim().nullable().optional(),
      description: z.string().trim().nullable().optional(),
      short_description: z.string().trim().nullable().optional(),
      duration_minutes: z.number().int().positive().optional(),
      base_price: z.number().min(0).optional(),
      min_people: z.number().int().positive().optional(),
      max_people: z.number().int().positive().optional(),
      capacity: z.number().int().positive().optional(),
      location: z.string().trim().nullable().optional(),
      featured: z.boolean().optional(),
      status: contentStatus.optional(),
      cover_image_url: z.string().url().nullable().optional(),
      ...editorialFields,
    })
    .strict(),
  events: eventContentSchema,
  'grand-events': eventContentSchema,
  promotions: z
    .object({
      code: z.string().trim().min(1).nullable().optional(),
      name: z.string().trim().min(1).optional(),
      description: z.string().trim().nullable().optional(),
      promotion_type: z.string().trim().min(1).optional(),
      discount_type: z.string().trim().min(1).optional(),
      discount_value: z.number().min(0).optional(),
      minimum_amount: z.number().min(0).optional(),
      maximum_discount: z.number().min(0).nullable().optional(),
      starts_at: nullableDate.optional(),
      ends_at: nullableDate.optional(),
      usage_limit: z.number().int().min(0).nullable().optional(),
      usage_per_customer: z.number().int().min(0).nullable().optional(),
      target_segment: z.string().trim().nullable().optional(),
      status: contentStatus.optional(),
      ...editorialFields,
    })
    .strict(),
  'membership-plans': z
    .object({
      code: z.string().trim().min(1).optional(),
      name: z.string().trim().min(1).optional(),
      description: z.string().trim().nullable().optional(),
      price: z.number().min(0).optional(),
      billing_period: z.string().trim().min(1).optional(),
      benefits: jsonSchema.optional(),
      daily_sommelier_limit: z.number().int().min(0).optional(),
      active: z.boolean().optional(),
      status: contentStatus.optional(),
      ...editorialFields,
    })
    .strict(),
  campaigns: z
    .object({
      name: z.string().trim().min(1).optional(),
      channel: z.string().trim().min(1).optional(),
      audience_definition: jsonSchema.optional(),
      content: jsonSchema.optional(),
      scheduled_at: nullableDate.optional(),
      sent_at: nullableDate.optional(),
      status: campaignStatus.optional(),
      ...editorialFields,
    })
    .strict(),
} satisfies Record<ContentRouteEntity, z.ZodObject>

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  locale: z.enum(['es', 'en', 'es-MX', 'en-US']).default('es-MX'),
  orderBy: z
    .enum(['sort_order', 'created_at', 'updated_at', 'published_at', 'name', 'title'])
    .default('sort_order'),
  orderDirection: z.enum(['asc', 'desc']).default('asc'),
})

export const scheduleSchema = z
  .object({
    action: z.enum(['publish', 'unpublish', 'archive', 'restore']),
    run_at: z.string().datetime(),
    timezone: z.string().trim().min(1).default('America/Mexico_City'),
  })
  .strict()

export const previewTokenSchema = z
  .object({
    expiresInMinutes: z.number().int().min(1).max(120).default(30),
    locale: z.enum(['es', 'en', 'es-MX', 'en-US']).default('es-MX'),
  })
  .strict()

export const approvalRequestSchema = z
  .object({
    approverUserId: z.string().uuid(),
    expiresInMinutes: z.number().int().min(10).max(240).default(60),
    locale: z.enum(['es', 'en', 'es-MX', 'en-US']).default('es-MX'),
    note: z.string().trim().max(600).optional(),
  })
  .strict()

export const approvalDecisionSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    note: z.string().trim().max(600).optional(),
  })
  .strict()

export const campaignAudiencePreviewSchema = campaignAudienceFiltersSchema

export const sendCampaignSchema = z
  .object({
    audience: campaignAudienceFiltersSchema.optional(),
    subject: z.string().trim().min(3).max(180).optional(),
    body: z.string().trim().min(10).max(5000).optional(),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: z.string().url().optional(),
    limit: z.number().int().min(1).max(500).optional(),
    channels: z.array(z.enum(['email', 'push', 'in_app'])).min(1).max(3).optional(),
  })
  .strict()

export function parseContentPayload(entity: ContentRouteEntity, payload: unknown) {
  return schemas[entity].parse(payload)
}

export function parseContentPatch(entity: ContentRouteEntity, payload: unknown) {
  return schemas[entity].partial().parse(payload)
}

export function assertPublicationAction(action: string): asserts action is PublicationAction {
  if (!['publish', 'unpublish', 'archive', 'restore'].includes(action)) {
    throw new Error('Acción editorial no permitida')
  }
}

export type CampaignAudienceFilters = z.infer<typeof campaignAudienceFiltersSchema>
export type SendCampaignPayload = z.infer<typeof sendCampaignSchema>
export type ApprovalRequestPayload = z.infer<typeof approvalRequestSchema>
export type ApprovalDecisionPayload = z.infer<typeof approvalDecisionSchema>
