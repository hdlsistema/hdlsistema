import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, requireOperationRole, type UserContext } from '../operations/operationErrors'
import type { NotificationListQuery } from './notifications.schemas'

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

export async function listAdminNotifications(query: NotificationListQuery, user: UserContext) {
  requireOperationRole(user, notificationReadRoles)

  let request = supabaseAdminClient
    .from('notifications')
    .select('id,channel,title,body,status,data,sent_at,read_at,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(query.limit)

  if (query.status) request = request.eq('status', query.status)

  const result = await request
  const rows = assertNoError<NotificationRow[]>(result).data ?? []
  const unreadCount = rows.filter((row) => row.status !== 'read' && !row.read_at).length

  return {
    data: rows.map(mapNotification),
    unreadCount,
    count: result.count ?? rows.length,
  }
}
