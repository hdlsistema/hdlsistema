import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, httpError, requireOperationRole, type UserContext } from '../operations/operationErrors'
import type { ActivityListQuery, AppActivityEventPayload, AppEventName, CartsListQuery } from './activity.schemas'

const activityReadRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

type CustomerRow = {
  id: string
  user_id?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type ActivityRow = {
  id: string
  customer_id?: string | null
  session_id: string
  event_name: AppEventName
  entity_type?: string | null
  entity_id?: string | null
  source: string
  metadata?: Record<string, unknown> | null
  occurred_at: string
  created_at: string
  module?: string | null
  status?: string | null
  result?: string | null
  customers?: CustomerRow | CustomerRow[] | null
}

type CartItemRow = {
  id: string
  cart_id: string
  item_type: string
  item_id: string
  name_snapshot?: string | null
  quantity: number | string
  unit_price_snapshot: number | string
  currency: string
  created_at: string
  updated_at: string
}

type CartRow = {
  id: string
  customer_id?: string | null
  user_id?: string | null
  cart_status?: string | null
  status?: string | null
  currency: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown> | null
  customers?: CustomerRow | CustomerRow[] | null
  cart_items?: CartItemRow[] | null
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function customerName(customer: CustomerRow | null) {
  if (!customer) return null
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email || null
}

function moduleForEvent(eventName: AppEventName) {
  if (eventName === 'app_session_started') return 'account'
  if (eventName.startsWith('customer_')) return 'account'
  if (eventName.startsWith('wine_') || eventName.startsWith('experience_') || eventName.startsWith('event_') || eventName === 'service_viewed' || eventName === 'cabin_viewed' || eventName === 'restaurant_viewed' || eventName === 'home_viewed' || eventName === 'membership_viewed' || eventName.startsWith('map_') || eventName === 'sommelier_opened') return 'content'
  if (eventName.startsWith('reservation_') || eventName.startsWith('cabin_reservation_') || eventName.startsWith('restaurant_reservation_')) return 'reservation'
  if (eventName.startsWith('quote_')) return 'quote'
  if (eventName.startsWith('cart_')) return 'cart'
  if (eventName.startsWith('checkout_')) return 'checkout'
  return 'payment'
}

function statusForEvent(eventName: AppEventName, metadata: Record<string, unknown>) {
  if (typeof metadata.result === 'string') return metadata.result
  if (eventName.endsWith('_failed')) return 'failed'
  if (eventName.endsWith('_cancelled')) return 'cancelled'
  if (eventName.endsWith('_processing')) return 'processing'
  if (eventName.endsWith('_created') || eventName.endsWith('_succeeded') || eventName.endsWith('_updated') || eventName.endsWith('_rescheduled') || eventName.endsWith('_added') || eventName.endsWith('_removed')) return 'succeeded'
  return 'started'
}

function safeMetadata(metadata: AppActivityEventPayload['metadata']) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null))
}

async function customerIdForUser(userId?: string) {
  if (!userId) return null
  const result = await supabaseAdminClient
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return assertNoError<{ id: string } | null>(result).data?.id ?? null
}

export async function recordAppActivity(
  payload: AppActivityEventPayload,
  identity: { userId?: string; customerId?: string | null } = {},
) {
  const customerId = identity.customerId ?? await customerIdForUser(identity.userId)
  const metadata = safeMetadata(payload.metadata)
  const row = {
    customer_id: customerId,
    session_id: payload.sessionId,
    event_name: payload.eventName,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
    source: 'mobile_app',
    metadata,
    occurred_at: payload.occurredAt ?? new Date().toISOString(),
    idempotency_key: payload.eventKey,
    event_key: payload.eventKey,
    dedupe_key: payload.eventKey,
    module: moduleForEvent(payload.eventName),
    status: statusForEvent(payload.eventName, metadata),
    result: statusForEvent(payload.eventName, metadata),
  }

  const existing = await supabaseAdminClient
    .from('customer_app_events')
    .select('id')
    .eq('idempotency_key', payload.eventKey)
    .maybeSingle()
  const prior = assertNoError<{ id: string } | null>(existing).data
  if (prior) return { accepted: true, duplicate: true, id: prior.id }

  const result = await supabaseAdminClient
    .from('customer_app_events')
    .insert(row)
    .select('id')
    .single()
  const inserted = assertNoError<{ id: string }>(result).data
  return { accepted: true, duplicate: false, id: inserted.id }
}

export function recordBusinessActivity(
  input: Omit<AppActivityEventPayload, 'occurredAt'> & { occurredAt?: string },
  identity: { userId?: string; customerId?: string | null },
) {
  return recordAppActivity(input, identity).catch(() => undefined)
}

function mapActivity(row: ActivityRow) {
  const customer = first(row.customers)
  return {
    id: row.id,
    customerId: row.customer_id ?? null,
    customerName: customerName(customer),
    customerEmail: customer?.email ?? null,
    sessionId: row.session_id,
    eventName: row.event_name,
    module: row.module ?? moduleForEvent(row.event_name),
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    source: row.source,
    status: row.status ?? row.result ?? 'started',
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }
}

function applyActivityFilters(request: any, query: ActivityListQuery) {
  let next = request
  if (query.customerId) next = next.eq('customer_id', query.customerId)
  if (query.eventName) next = next.eq('event_name', query.eventName)
  if (query.module) next = next.eq('module', query.module)
  if (query.result) next = next.eq('result', query.result)
  if (query.from) next = next.gte('occurred_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('occurred_at', `${query.to}T23:59:59.999Z`)
  return next
}

async function customerIdsForQuery(value?: string) {
  if (!value) return null
  const term = value.replace(/[%(),]/g, '').trim()
  if (!term) return null
  const result = await supabaseAdminClient
    .from('customers')
    .select('id')
    .or(`display_name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
  return (assertNoError<Array<{ id: string }>>(result).data ?? []).map((customer) => customer.id)
}

export async function listAppActivity(query: ActivityListQuery, user: UserContext) {
  requireOperationRole(user, activityReadRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const customerIds = await customerIdsForQuery(query.customer)
  if (customerIds?.length === 0) return { data: [], count: 0 }
  let request = applyActivityFilters(
    supabaseAdminClient
      .from('customer_app_events')
      .select('id,customer_id,session_id,event_name,entity_type,entity_id,source,metadata,occurred_at,created_at,module,status,result,customers(id,display_name,first_name,last_name,email)', { count: 'exact' })
      .order('occurred_at', { ascending: false }),
    query,
  )
  if (customerIds) request = request.in('customer_id', customerIds)
  const result = await request.range(from, to)
  const parsed = assertNoError<ActivityRow[]>(result)
  return { data: (parsed.data ?? []).map(mapActivity), count: parsed.count ?? 0 }
}

export async function listActivityForCustomer(customerId: string) {
  const result = await supabaseAdminClient
    .from('customer_app_events')
    .select('id,customer_id,session_id,event_name,entity_type,entity_id,source,metadata,occurred_at,created_at,module,status,result')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
    .limit(80)
  return (assertNoError<ActivityRow[]>(result).data ?? []).map(mapActivity)
}

function cartState(cart: CartRow, events: ActivityRow[], thresholdMinutes: number | null) {
  if (cart.cart_status === 'converted') return 'converted'
  const checkoutStarted = events.some((event) => event.event_name === 'checkout_started')
  if (checkoutStarted) return 'checkout_started'
  const lastActivity = events[0]?.occurred_at ?? cart.updated_at ?? cart.created_at
  if (thresholdMinutes && Date.now() - new Date(lastActivity).getTime() >= thresholdMinutes * 60_000) return 'abandoned'
  return 'active'
}

async function cartAbandonmentThresholdMinutes() {
  const result = await supabaseAdminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'customer_app.cart_abandonment')
    .maybeSingle()
  if (result.error) return null
  const value = result.data && typeof result.data === 'object' ? (result.data as { value?: unknown }).value : null
  const minutes = value && typeof value === 'object' ? Number((value as Record<string, unknown>).thresholdMinutes) : NaN
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null
}

function mapCart(cart: CartRow, events: ActivityRow[], thresholdMinutes: number | null) {
  const customer = first(cart.customers)
  const items = cart.cart_items ?? []
  const lastActivity = events[0]?.occurred_at ?? cart.updated_at ?? cart.created_at
  const estimatedValue = items.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(item.unit_price_snapshot), 0)
  return {
    id: cart.id,
    customerId: cart.customer_id ?? null,
    customerName: customerName(customer),
    customerEmail: customer?.email ?? null,
    status: cartState(cart, events, thresholdMinutes),
    persistedStatus: cart.cart_status ?? cart.status ?? 'active',
    currency: cart.currency,
    quantity: items.reduce((sum, item) => sum + numberValue(item.quantity), 0),
    estimatedValue,
    items: items.map((item) => ({
      id: item.id,
      itemType: item.item_type,
      itemId: item.item_id,
      name: item.name_snapshot ?? item.item_type,
      quantity: numberValue(item.quantity),
      unitPrice: numberValue(item.unit_price_snapshot),
      subtotal: numberValue(item.quantity) * numberValue(item.unit_price_snapshot),
      currency: item.currency,
    })),
    lastActivity,
    inactiveMinutes: Math.max(0, Math.floor((Date.now() - new Date(lastActivity).getTime()) / 60_000)),
    events: events.slice(0, 12).map(mapActivity),
    relatedOrderId: typeof cart.metadata?.convertedOrderId === 'string' ? cart.metadata.convertedOrderId : null,
    createdAt: cart.created_at,
    updatedAt: cart.updated_at,
  }
}

export async function listCustomerCarts(query: CartsListQuery, user: UserContext) {
  requireOperationRole(user, activityReadRoles)
  const customerIds = await customerIdsForQuery(query.customer)
  const thresholdMinutes = await cartAbandonmentThresholdMinutes()
  if (customerIds?.length === 0) return { data: [], count: 0, thresholdMinutes }
  let request: any = supabaseAdminClient
    .from('carts')
    .select('id,customer_id,user_id,cart_status,status,currency,created_at,updated_at,metadata,customers(id,display_name,first_name,last_name,email),cart_items(id,cart_id,item_type,item_id,name_snapshot,quantity,unit_price_snapshot,currency,created_at,updated_at)', { count: 'exact' })
    .order('updated_at', { ascending: false })
  if (query.customerId) request = request.eq('customer_id', query.customerId)
  if (customerIds) request = request.in('customer_id', customerIds)
  if (query.from) request = request.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) request = request.lte('created_at', `${query.to}T23:59:59.999Z`)
  const result = await request
  const rows = assertNoError<CartRow[]>(result).data ?? []
  const cartIds = rows.map((row) => row.id)
  const eventsResult = cartIds.length
    ? await supabaseAdminClient
      .from('customer_app_events')
      .select('id,customer_id,session_id,event_name,entity_type,entity_id,source,metadata,occurred_at,created_at,module,status,result')
      .eq('entity_type', 'cart')
      .in('entity_id', cartIds)
      .order('occurred_at', { ascending: false })
    : { data: [], error: null }
  const allEvents = assertNoError<ActivityRow[]>(eventsResult).data ?? []
  const byCart = new Map<string, ActivityRow[]>()
  for (const event of allEvents) {
    if (!event.entity_id) continue
    const current = byCart.get(event.entity_id) ?? []
    current.push(event)
    byCart.set(event.entity_id, current)
  }
  const mapped = rows
    .map((row) => mapCart(row, byCart.get(row.id) ?? [], thresholdMinutes))
    .filter((row) => !query.status || row.status === query.status)
  const from = (query.page - 1) * query.perPage
  return {
    data: mapped.slice(from, from + query.perPage),
    count: query.status ? mapped.length : result.count ?? mapped.length,
    thresholdMinutes,
  }
}

export async function getCustomerCartActivity(id: string, user: UserContext) {
  requireOperationRole(user, activityReadRoles)
  const result = await supabaseAdminClient
    .from('carts')
    .select('id,customer_id,user_id,cart_status,status,currency,created_at,updated_at,metadata,customers(id,display_name,first_name,last_name,email),cart_items(id,cart_id,item_type,item_id,name_snapshot,quantity,unit_price_snapshot,currency,created_at,updated_at)')
    .eq('id', id)
    .maybeSingle()
  const cart = assertNoError<CartRow | null>(result).data
  if (!cart) throw httpError(404, 'Carrito no encontrado')
  const eventsResult = await supabaseAdminClient
    .from('customer_app_events')
    .select('id,customer_id,session_id,event_name,entity_type,entity_id,source,metadata,occurred_at,created_at,module,status,result')
    .eq('entity_type', 'cart')
    .eq('entity_id', id)
    .order('occurred_at', { ascending: false })
  const events = assertNoError<ActivityRow[]>(eventsResult).data ?? []
  return { data: mapCart(cart, events, await cartAbandonmentThresholdMinutes()) }
}
