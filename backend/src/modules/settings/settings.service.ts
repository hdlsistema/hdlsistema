import { supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import {
  parseSettingValue,
  settingKeys,
  type EditableSettingKey,
} from './settings.schemas'

const settingsRoles = ['super_admin', 'admin', 'operations', 'marketing']

type SettingRow = {
  key: EditableSettingKey
  value: unknown
  description?: string | null
  updated_at: string
}

const fallbackSettings: Record<EditableSettingKey, unknown> = {
  'customer_app.default_language': { locale: 'es-MX' },
  'customer_app.cart_abandonment': { thresholdMinutes: 45 },
  'communications.preferences': {
    transactionalEmail: true,
    transactionalPush: true,
    marketingPush: false,
  },
  'sommelier.daily_limit': 10,
}

export function defaultSetting(key: EditableSettingKey) {
  return fallbackSettings[key]
}

export async function listAdminSettings(user: UserContext) {
  requireOperationRole(user, settingsRoles)
  const result = await supabaseAdminClient
    .from('system_settings')
    .select('key,value,description,updated_at')
    .in('key', settingKeys)
    .order('key', { ascending: true })

  const rows = assertNoError<SettingRow[]>(result).data ?? []
  const byKey = new Map(rows.map((row) => [row.key, row]))

  return {
    data: settingKeys.map((key) => {
      const row = byKey.get(key)
      return {
        key,
        value: row?.value ?? fallbackSettings[key],
        description: row?.description ?? null,
        updatedAt: row?.updated_at ?? null,
      }
    }),
  }
}

export async function updateAdminSettings(
  payload: Record<string, unknown>,
  user: UserContext,
) {
  requireOperationRole(user, settingsRoles)

  const rows = Object.entries(payload)
    .filter(([key]) => settingKeys.includes(key as EditableSettingKey))
    .map(([key, value]) => {
      const settingKey = key as EditableSettingKey
      return {
        key: settingKey,
        value: parseSettingValue(settingKey, value),
        updated_by: user.userId ?? null,
        updated_at: new Date().toISOString(),
      }
    })

  if (rows.length === 0) return listAdminSettings(user)

  const result = await supabaseAdminClient
    .from('system_settings')
    .upsert(rows, { onConflict: 'key' })
    .select('key,value,description,updated_at')

  assertNoError<SettingRow[]>(result)
  return listAdminSettings(user)
}
