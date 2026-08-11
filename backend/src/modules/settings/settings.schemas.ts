import { z } from 'zod'

const editableSettings = {
  'customer_app.default_language': z.object({
    locale: z.enum(['es-MX', 'en-US']),
  }),
  'customer_app.cart_abandonment': z.object({
    thresholdMinutes: z.number().int().min(5).max(1440),
  }),
  'communications.preferences': z.object({
    transactionalEmail: z.boolean(),
    transactionalPush: z.boolean(),
    marketingPush: z.boolean(),
  }),
  'sommelier.daily_limit': z.number().int().min(1).max(100),
} as const

export type EditableSettingKey = keyof typeof editableSettings

export const settingKeys = Object.keys(editableSettings) as EditableSettingKey[]
export const settingsPatchSchema = z.object({
  settings: z.record(z.string(), z.unknown()).default({}),
})

export function parseSettingValue(key: EditableSettingKey, value: unknown) {
  return editableSettings[key].parse(value)
}
