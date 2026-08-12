import { z } from 'zod'

export const communicationEventTypes = [
  'customer.welcome',
  'reservation.created',
  'reservation.rescheduled',
  'reservation.cancelled',
  'quote.request.created',
  'quote.sent',
  'campaign.marketing',
  'order.created',
  'order.pending_payment',
  'order.paid',
  'order.shipped',
  'membership.activated',
  'membership.renewed',
  'membership.expiring',
  'security.password_changed',
] as const

export const communicationListQuerySchema = z.object({
  status: z.string().trim().min(1).max(60).optional(),
  eventType: z.enum(communicationEventTypes).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})
