import { z } from 'zod'

export const sommelierMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(2).max(1200),
  locale: z.enum(['es-MX', 'en-US']).default('es-MX'),
})

export type SommelierMessagePayload = z.infer<typeof sommelierMessageSchema>
