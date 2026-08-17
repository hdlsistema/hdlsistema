import { z } from 'zod'

export const executiveAssistantMessageSchema = z.object({
  message: z.string().trim().min(1).max(1800),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(1800),
  })).max(8).default([]),
})

export type ExecutiveAssistantMessagePayload = z.infer<typeof executiveAssistantMessageSchema>
