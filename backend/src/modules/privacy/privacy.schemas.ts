import { z } from 'zod'

export const accountDeletionStatusSchema = z.enum([
  'requested',
  'identity_verification',
  'confirmed',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
])

const confirmationFields = {
  confirmation: z.literal(true),
  retentionAcknowledged: z.literal(true),
}

export const publicAccountDeletionRequestSchema = z.object({
  email: z.string().trim().email().max(180),
  name: z.string().trim().max(180).nullable().optional(),
  locale: z.enum(['es', 'en']).default('es'),
  companyWebsite: z.literal('').optional(),
  ...confirmationFields,
}).strict()

export const authenticatedAccountDeletionRequestSchema = z.object({
  name: z.string().trim().max(180).nullable().optional(),
  locale: z.enum(['es', 'en']).default('es'),
  ...confirmationFields,
}).strict()

export const accountDeletionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  status: accountDeletionStatusSchema.optional(),
  source: z.enum(['public_web', 'mobile_app', 'admin']).optional(),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
}).strict()

export const patchAccountDeletionRequestSchema = z.object({
  status: accountDeletionStatusSchema.optional(),
  adminNotes: z.string().trim().max(5000).nullable().optional(),
  retentionNotes: z.string().trim().max(5000).nullable().optional(),
}).strict().refine(
  (value) => value.status !== undefined || value.adminNotes !== undefined || value.retentionNotes !== undefined,
  { message: 'No hay cambios para guardar' },
)

export type PublicAccountDeletionRequestPayload = z.infer<typeof publicAccountDeletionRequestSchema>
export type AuthenticatedAccountDeletionRequestPayload = z.infer<typeof authenticatedAccountDeletionRequestSchema>
export type AccountDeletionListQuery = z.infer<typeof accountDeletionListQuerySchema>
export type PatchAccountDeletionRequestPayload = z.infer<typeof patchAccountDeletionRequestSchema>
export type AccountDeletionStatus = z.infer<typeof accountDeletionStatusSchema>
