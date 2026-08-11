import { z } from 'zod'

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
  status: z.enum(['pending', 'sent', 'failed', 'read']).optional(),
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>
