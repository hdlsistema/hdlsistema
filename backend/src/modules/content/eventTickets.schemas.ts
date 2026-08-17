import { z } from 'zod'

const nullableDate = z.string().datetime().nullable()
const ticketStatus = z.enum(['draft', 'published', 'scheduled', 'archived', 'inactive'])

const fields = {
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.coerce.number().min(0),
  capacity: z.coerce.number().int().min(1),
  sales_start_at: nullableDate.optional(),
  sales_end_at: nullableDate.optional(),
  active: z.boolean(),
  status: ticketStatus,
  visible_in_app: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
  publish_at: nullableDate.optional(),
  unpublish_at: nullableDate.optional(),
}

function validateWindow(
  value: { sales_start_at?: string | null; sales_end_at?: string | null; publish_at?: string | null; unpublish_at?: string | null },
  context: z.RefinementCtx,
) {
  if (value.sales_start_at && value.sales_end_at && value.sales_end_at <= value.sales_start_at) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sales_end_at'], message: 'El cierre de venta debe ser posterior al inicio' })
  }
  if (value.publish_at && value.unpublish_at && value.unpublish_at <= value.publish_at) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['unpublish_at'], message: 'El retiro debe ser posterior a la publicación' })
  }
}

export const createEventTicketTypeSchema = z.object({
  ...fields,
  description: fields.description.default(null),
  sales_start_at: fields.sales_start_at.default(null),
  sales_end_at: fields.sales_end_at.default(null),
  active: fields.active.default(true),
  status: fields.status.default('draft'),
  visible_in_app: fields.visible_in_app.default(false),
  sort_order: fields.sort_order.default(0),
  publish_at: fields.publish_at.default(null),
  unpublish_at: fields.unpublish_at.default(null),
}).strict().superRefine(validateWindow)

export const patchEventTicketTypeSchema = z.object(fields).partial().strict().superRefine(validateWindow)

export type CreateEventTicketTypePayload = z.infer<typeof createEventTicketTypeSchema>
export type PatchEventTicketTypePayload = z.infer<typeof patchEventTicketTypeSchema>
