import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, httpError, requireOperationRole, type UserContext } from '../operations/operationErrors'
import type { NotificationListQuery } from './notifications.schemas'
import { pushProviderState, sendPushNotification } from './push-provider.service'

const notificationReadRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

type NotificationRow = {
  id: string
  channel: string
  title: string
  body: string
  status: 'pending' | 'sent' | 'failed' | 'read'
  data?: Record<string, unknown> | null
  sent_at?: string | null
  read_at?: string | null
  created_at: string
}

type CustomerNotificationInput = {
  customerId: string
  userId?: string | null
  title: string
  body: string
  deepLink: string
  data?: Record<string, unknown>
}

type CampaignNotificationInput = CustomerNotificationInput & {
  campaignId: string
  sendPush: boolean
}

type ControlNotificationInput = {
  type: string
  title: string
  body: string
  deepLink: string
  idempotencyKey: string
  data?: Record<string, unknown>
}

type NotificationDeviceRow = {
  id: string
  firebase_token: string
  platform?: 'android' | 'ios' | null
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    channel: row.channel,
    title: row.title,
    body: row.body,
    status: row.status,
    data: row.data ?? {},
    deepLink: typeof row.data?.deepLink === 'string' ? row.data.deepLink : null,
    sentAt: row.sent_at ?? null,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  }
}

function errorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'push_failed').slice(0, 100)
  }
  return 'push_failed'
}

async function customerUserId(customerId: string, preferred?: string | null) {
  if (preferred) return preferred
  const result = await supabaseAdminClient
    .from('customers')
    .select('user_id')
    .eq('id', customerId)
    .maybeSingle()
  return assertNoError<{ user_id?: string | null } | null>(result).data?.user_id ?? null
}

async function setPushState(id: string, patch: Record<string, unknown>) {
  // These delivery fields are added by migration 044. A notification remains
  // available in the in-app inbox even if an older database has not migrated yet.
  await supabaseAdminClient
    .from('notifications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
}

async function deliverCustomerPush(
  notification: NotificationRow,
  userId: string | null,
  preferenceColumn: 'transactional_push' | 'marketing_push' = 'transactional_push',
) {
  if (!userId) {
    await setPushState(notification.id, { push_status: 'skipped', push_error_code: 'customer_without_app_user' }).catch(() => undefined)
    return { status: 'skipped' as const, errorCode: 'customer_without_app_user' }
  }

  const preferenceResult = await supabaseAdminClient
    .from('user_preferences')
    .select(preferenceColumn)
    .eq('user_id', userId)
    .maybeSingle()
  const preferences = assertNoError<Record<string, boolean | null> | null>(preferenceResult).data
  if (preferences?.[preferenceColumn] === false) {
    await setPushState(notification.id, { push_status: 'skipped', push_error_code: 'preference_disabled' }).catch(() => undefined)
    return { status: 'skipped' as const, errorCode: 'preference_disabled' }
  }

  const deviceResult = await supabaseAdminClient
    .from('notification_devices')
    .select('id,firebase_token,platform')
    .eq('user_id', userId)
    .eq('active', true)
  const devices = assertNoError<NotificationDeviceRow[]>(deviceResult).data ?? []
  if (!devices.length) {
    await setPushState(notification.id, { push_status: 'skipped', push_error_code: 'no_active_device' }).catch(() => undefined)
    return { status: 'skipped' as const, errorCode: 'no_active_device' }
  }

  const deliverableDevices = devices.filter(() => pushProviderState().configured)
  const unconfiguredDevices = devices.length - deliverableDevices.length
  if (!deliverableDevices.length) {
    await setPushState(notification.id, { push_status: 'pending_configuration', push_error_code: 'provider_not_configured' }).catch(() => undefined)
    return { status: 'pending_configuration' as const, errorCode: 'provider_not_configured' }
  }

  const results = await Promise.allSettled(deliverableDevices.map((device) => {
    const message = {
      token: device.firebase_token,
      title: notification.title,
      body: notification.body,
      data: Object.fromEntries(
        Object.entries(notification.data ?? {}).filter((entry): entry is [string, string | number | boolean | null | undefined] =>
          entry[1] === null || entry[1] === undefined || ['string', 'number', 'boolean'].includes(typeof entry[1]),
        ),
      ),
    }
    return sendPushNotification(message)
  }))
  const sent = results.filter((result) => result.status === 'fulfilled').length
  const rejected = results
    .map((result, index) => result.status === 'rejected' ? { result, device: deliverableDevices[index] } : null)
    .filter((entry): entry is { result: PromiseRejectedResult; device: NotificationDeviceRow } => Boolean(entry?.device))

  await Promise.all(rejected.map(async ({ result, device }) => {
    const code = errorCode(result.reason)
    if (!['UNREGISTERED', 'INVALID_ARGUMENT', 'SENDER_ID_MISMATCH', 'Unregistered', 'BadDeviceToken', 'DeviceTokenNotForTopic'].includes(code)) return
    await supabaseAdminClient
      .from('notification_devices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', device.id)
  }))

  if (sent > 0) {
    await supabaseAdminClient
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        push_status: 'sent',
        push_sent_at: new Date().toISOString(),
        push_error_code: rejected.length || unconfiguredDevices ? 'partial_delivery' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id)
    return { status: 'sent' as const, errorCode: rejected.length || unconfiguredDevices ? 'partial_delivery' : null }
  }

  await setPushState(notification.id, {
    push_status: 'failed',
    push_error_code: rejected[0] ? errorCode(rejected[0].result.reason) : 'push_failed',
  }).catch(() => undefined)
  return {
    status: 'failed' as const,
    errorCode: rejected[0] ? errorCode(rejected[0].result.reason) : 'push_failed',
  }
}

export async function createCustomerNotification(input: CustomerNotificationInput) {
  const userId = await customerUserId(input.customerId, input.userId)
  const result = await supabaseAdminClient
    .from('notifications')
    .insert({
      user_id: userId,
      customer_id: input.customerId,
      channel: 'push',
      title: input.title,
      body: input.body,
      data: {
        ...input.data,
        deepLink: input.deepLink,
      },
      status: 'pending',
    })
    .select('id,user_id,customer_id,channel,title,body,status,data,sent_at,read_at,created_at')
    .single()
  const notification = assertNoError<NotificationRow>(result).data
  await deliverCustomerPush(notification, userId).catch(async (error) => {
    await setPushState(notification.id, { push_status: 'failed', push_error_code: errorCode(error) }).catch(() => undefined)
  })
  return { data: mapNotification(notification) }
}

export async function createCustomerCampaignNotification(input: CampaignNotificationInput) {
  const userId = await customerUserId(input.customerId, input.userId)
  const now = new Date().toISOString()
  const result = await supabaseAdminClient
    .from('notifications')
    .insert({
      user_id: userId,
      customer_id: input.customerId,
      channel: input.sendPush ? 'push' : 'in_app',
      title: input.title,
      body: input.body,
      data: {
        ...input.data,
        campaignId: input.campaignId,
        deepLink: input.deepLink,
      },
      status: input.sendPush ? 'pending' : 'sent',
      sent_at: input.sendPush ? null : now,
      push_status: input.sendPush ? 'pending' : 'skipped',
      push_error_code: input.sendPush ? null : 'in_app_only',
    })
    .select('id,user_id,customer_id,channel,title,body,status,data,sent_at,read_at,created_at')
    .single()
  const notification = assertNoError<NotificationRow>(result).data
  const delivery = input.sendPush
    ? await deliverCustomerPush(notification, userId, 'marketing_push').catch(async (error) => {
        const code = errorCode(error)
        await setPushState(notification.id, { push_status: 'failed', push_error_code: code }).catch(() => undefined)
        return { status: 'failed' as const, errorCode: code }
      })
    : { status: 'sent' as const, errorCode: null }
  return { data: mapNotification(notification), delivery }
}

export async function createControlNotification(input: ControlNotificationInput) {
  const existing = await supabaseAdminClient
    .from('notifications')
    .select('id')
    .eq('channel', 'control')
    .contains('data', { idempotencyKey: input.idempotencyKey })
    .maybeSingle()
  const prior = assertNoError<{ id: string } | null>(existing).data
  if (prior) return { data: { id: prior.id }, duplicate: true }

  const result = await supabaseAdminClient
    .from('notifications')
    .insert({
      channel: 'control',
      title: input.title,
      body: input.body,
      data: {
        ...input.data,
        type: input.type,
        deepLink: input.deepLink,
        idempotencyKey: input.idempotencyKey,
      },
      status: 'pending',
    })
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at')
    .single()
  const notification = assertNoError<NotificationRow>(result).data
  return { data: mapNotification(notification), duplicate: false }
}

export async function listCustomerNotifications(user: UserContext, limit = 40) {
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const customerResult = await supabaseAdminClient
    .from('customers')
    .select('id')
    .eq('user_id', user.userId)
    .maybeSingle()
  const customerId = assertNoError<{ id: string } | null>(customerResult).data?.id ?? null
  const ownership = customerId
    ? `user_id.eq.${user.userId},customer_id.eq.${customerId}`
    : `user_id.eq.${user.userId}`
  const result = await supabaseAdminClient
    .from('notifications')
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at')
    .or(ownership)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100))
  const rows = assertNoError<NotificationRow[]>(result).data ?? []
  return {
    data: rows.map(mapNotification),
    unreadCount: rows.filter((row) => !row.read_at).length,
  }
}

export async function markCustomerNotificationRead(id: string, user: UserContext) {
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const customerResult = await supabaseAdminClient
    .from('customers')
    .select('id')
    .eq('user_id', user.userId)
    .maybeSingle()
  const customerId = assertNoError<{ id: string } | null>(customerResult).data?.id ?? null
  const ownership = customerId
    ? `user_id.eq.${user.userId},customer_id.eq.${customerId}`
    : `user_id.eq.${user.userId}`
  const result = await supabaseAdminClient
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .or(ownership)
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at')
    .maybeSingle()
  const row = assertNoError<NotificationRow | null>(result).data
  if (!row) throw httpError(404, 'Notificación no encontrada')
  await supabaseAdminClient
    .from('campaign_recipient_deliveries')
    .update({ status: 'read', opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('notification_id', row.id)
    .in('channel', ['push', 'in_app'])
    .is('opened_at', null)
  return { data: mapNotification(row) }
}

export async function markCustomerNotificationClicked(id: string, user: UserContext) {
  const read = await markCustomerNotificationRead(id, user)
  await supabaseAdminClient
    .from('campaign_recipient_deliveries')
    .update({ clicked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('notification_id', id)
    .in('channel', ['push', 'in_app'])
    .is('clicked_at', null)
  return read
}

export async function listAdminNotifications(query: NotificationListQuery, user: UserContext) {
  requireOperationRole(user, notificationReadRoles)

  let request = supabaseAdminClient
    .from('notifications')
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at', { count: 'exact' })
    .eq('channel', 'control')
    .order('created_at', { ascending: false })
    .limit(query.limit)

  if (query.status) {
    request = request.eq('status', query.status)
  } else {
    // Bell shows only unread; never resurface a read notification via polling
    request = request.neq('status', 'read').is('read_at', null)
  }

  const result = await request
  const rows = assertNoError<NotificationRow[]>(result).data ?? []
  // Use the DB-level total count (before limit) as the accurate badge number
  const unreadCount = result.count ?? rows.filter((row) => row.status !== 'read' && !row.read_at).length

  return {
    data: rows.map(mapNotification),
    unreadCount,
    count: result.count ?? rows.length,
  }
}

export async function markAdminNotificationRead(id: string, user: UserContext) {
  requireOperationRole(user, notificationReadRoles)
  const updateResult = await supabaseAdminClient
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('channel', 'control')
  assertNoError(updateResult)

  const result = await supabaseAdminClient
    .from('notifications')
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at')
    .eq('id', id)
    .eq('channel', 'control')
    .maybeSingle()
  const row = assertNoError<NotificationRow | null>(result).data
  if (!row) throw httpError(404, 'Notificación no encontrada')
  return { data: mapNotification(row) }
}
