import { randomUUID } from 'crypto'
import {
  createSupabaseUserRequestClient,
  supabaseAdminClient,
} from '../../config/supabase'
import {
  assertNoError,
  httpError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  CreateOrderPayload,
  OrderListQuery,
  PatchOrderPayload,
} from './orders.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer', 'marketing']
const writeRoles = ['super_admin', 'admin', 'operations', 'finance']
const exportRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']

type OrderRow = {
  id: string
  order_number: string
  customer_id: string
  reservation_id?: string | null
  subtotal: number | string
  discount_total: number | string
  tax_total: number | string
  shipping_total: number | string
  total: number | string
  currency: string
  status: string
  source?: string | null
  paid_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  fulfilled_at?: string | null
  created_at: string
  updated_at: string
  customers?: Relation<CustomerRow>
  reservations?: Relation<ReservationRow>
}

type CustomerRow = {
  id: string
  display_name?: string | null
  first_name: string
  last_name: string
  email?: string | null
}

type ReservationRow = {
  id: string
  reservation_number: string
}

type OrderItemRow = {
  id: string
  order_id: string
  item_type: string
  name_snapshot: string
  sku_snapshot?: string | null
  quantity: number
  unit_price: number | string
  subtotal: number | string
  created_at: string
}

type PaymentSummaryRow = {
  id: string
  order_id: string
  payment_reference?: string | null
  provider: string
  status: string
  amount: number | string
  refunded_amount?: number | string | null
  currency: string
  paid_at?: string | null
  created_at: string
}

type AuditRow = {
  id: string
  action: string
  entity_type: string
  created_at: string
}

type Relation<T> = T | T[] | null

const orderSelect = `
  id,order_number,customer_id,reservation_id,subtotal,discount_total,tax_total,shipping_total,total,currency,
  status,source,paid_at,cancelled_at,cancellation_reason,fulfilled_at,created_at,updated_at,
  customers(id,display_name,first_name,last_name,email),
  reservations(id,reservation_number)
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function customerName(row: OrderRow) {
  const customer = firstRelation(row.customers)
  return customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
}

function mapOrder(row: OrderRow, payments: PaymentSummaryRow[] = []) {
  const reservation = firstRelation(row.reservations)
  const paidAmount = payments
    .filter((payment) => ['paid', 'partially_refunded', 'refunded'].includes(payment.status))
    .reduce((sum, payment) => sum + toNumber(payment.amount) - toNumber(payment.refunded_amount), 0)

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: customerName(row),
    customerEmail: firstRelation(row.customers)?.email ?? null,
    reservationId: row.reservation_id ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    subtotal: toNumber(row.subtotal),
    discountTotal: toNumber(row.discount_total),
    taxTotal: toNumber(row.tax_total),
    shippingTotal: toNumber(row.shipping_total),
    total: toNumber(row.total),
    paidAmount,
    currency: row.currency.trim(),
    status: row.status,
    source: row.source ?? 'Centro de control',
    paidAt: row.paid_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    fulfilledAt: row.fulfilled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapItem(row: OrderItemRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    itemType: row.item_type,
    nameSnapshot: row.name_snapshot,
    skuSnapshot: row.sku_snapshot ?? null,
    quantity: row.quantity,
    unitPrice: toNumber(row.unit_price),
    subtotal: toNumber(row.subtotal),
    createdAt: row.created_at,
  }
}

function mapPayment(row: PaymentSummaryRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentReference: row.payment_reference ?? null,
    provider: row.provider,
    status: row.status,
    amount: toNumber(row.amount),
    refundedAmount: toNumber(row.refunded_amount),
    currency: row.currency.trim(),
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  }
}

function applyFilters(request: any, query: OrderListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.customerId) next = next.eq('customer_id', query.customerId)
  if (query.reservationId) next = next.eq('reservation_id', query.reservationId)
  if (query.orderNumber) next = next.eq('order_number', query.orderNumber)
  if (query.source) next = next.eq('source', query.source)
  if (query.minTotal !== undefined) next = next.gte('total', query.minTotal)
  if (query.maxTotal !== undefined) next = next.lte('total', query.maxTotal)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`order_number.ilike.%${safe}%,source.ilike.%${safe}%`)
  }
  return next
}

async function paymentsForOrders(orderIds: string[]) {
  if (!orderIds.length) return new Map<string, PaymentSummaryRow[]>()
  const result = await supabaseAdminClient
    .from('payments')
    .select('id,order_id,payment_reference,provider,status,amount,refunded_amount,currency,paid_at,created_at')
    .in('order_id', orderIds)
  const rows = assertNoError<PaymentSummaryRow[]>(result).data ?? []
  const map = new Map<string, PaymentSummaryRow[]>()
  for (const row of rows) {
    map.set(row.order_id, [...(map.get(row.order_id) ?? []), row])
  }
  return map
}

export async function listOrders(query: OrderListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const request = applyFilters(
    supabaseAdminClient
      .from('orders')
      .select(orderSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)

  const result = await request
  let rows = assertNoError<OrderRow[]>(result).data ?? []
  const payments = await paymentsForOrders(rows.map((row) => row.id))
  if (query.payment === 'with_payment') rows = rows.filter((row) => (payments.get(row.id) ?? []).length > 0)
  if (query.payment === 'without_payment') rows = rows.filter((row) => (payments.get(row.id) ?? []).length === 0)
  return {
    data: rows.map((row) => mapOrder(row, payments.get(row.id) ?? [])),
    count: query.payment ? rows.length : result.count ?? rows.length,
  }
}

export async function getOrder(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('orders')
    .select(orderSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<OrderRow | null>(result).data
  if (!row) throw httpError(404, 'Orden no encontrada')
  const payments = await paymentsForOrders([id])
  return { data: mapOrder(row, payments.get(id) ?? []) }
}

export async function createOrder(payload: CreateOrderPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('create_order_admin', {
    p_customer_id: payload.customerId,
    p_reservation_id: payload.reservationId ?? null,
    p_items: payload.items.map((item) => ({
      ...item,
      itemId: item.itemId ?? randomUUID(),
    })),
    p_source: payload.source,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getOrder(String(result.data), user)
}

export async function patchOrder(id: string, payload: PatchOrderPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  if (payload.status) {
    const result = await rpcClient(user).rpc('update_order_status', {
      p_order_id: id,
      p_status: payload.status,
      p_reason: null,
    })
    if (result.error) normalizeDatabaseError(result.error)
  }
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.source) patch.source = payload.source
  if (payload.metadata) patch.metadata = payload.metadata
  if (Object.keys(patch).length > 2) {
    const current = await getOrder(id, user)
    if (!['draft', 'pending_payment'].includes(current.data.status)) {
      throw httpError(422, 'No se puede editar una orden pagada o cerrada')
    }
    assertNoError(await supabaseAdminClient.from('orders').update(patch).eq('id', id).select('id').single())
  }
  return getOrder(id, user)
}

export async function updateOrderStatus(id: string, status: string, reason: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('update_order_status', {
    p_order_id: id,
    p_status: status,
    p_reason: reason ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getOrder(id, user)
}

export async function listOrderItems(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getOrder(id, user)
  const result = await supabaseAdminClient
    .from('order_items')
    .select('id,order_id,item_type,name_snapshot,sku_snapshot,quantity,unit_price,subtotal,created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
  return { data: (assertNoError<OrderItemRow[]>(result).data ?? []).map(mapItem) }
}

export async function listOrderPayments(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getOrder(id, user)
  const payments = await paymentsForOrders([id])
  return { data: (payments.get(id) ?? []).map(mapPayment) }
}

export async function listOrderHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getOrder(id, user)
  const result = await supabaseAdminClient
    .from('audit_logs')
    .select('id,action,entity_type,created_at')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  return {
    data: (assertNoError<AuditRow[]>(result).data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      createdAt: row.created_at,
    })),
  }
}

export async function exportOrders(query: OrderListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listOrders({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'order_number',
    'customer',
    'reservation_number',
    'status',
    'subtotal',
    'discount_total',
    'tax_total',
    'total',
    'currency',
    'paid_amount',
    'created_at',
  ]
  const rows = data.map((item) => [
    item.orderNumber,
    item.customerName,
    item.reservationNumber ?? '',
    item.status,
    String(item.subtotal),
    String(item.discountTotal),
    String(item.taxTotal),
    String(item.total),
    item.currency,
    String(item.paidAmount),
    item.createdAt,
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
