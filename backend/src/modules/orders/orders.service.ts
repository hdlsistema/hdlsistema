import { createHash, randomUUID } from 'crypto'
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
import { userHasFinancialAccess } from '../admin/controlPermissions'
import type {
  CreateOrderPayload,
  OrderListQuery,
  OrderShipPayload,
  OrderShippingActionPayload,
  OrderTrackingPayload,
  PatchOrderPayload,
} from './orders.schemas'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { createCustomerNotification } from '../notifications/notifications.service'

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
  requires_shipping?: boolean | null
  shipping_status?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  customers?: Relation<CustomerRow>
  reservations?: Relation<ReservationRow>
}

type CustomerRow = {
  id: string
  user_id?: string | null
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
  item_id?: string | null
  item_type: string
  name_snapshot: string
  sku_snapshot?: string | null
  quantity: number
  unit_price: number | string
  subtotal: number | string
  metadata?: Record<string, unknown> | null
  created_at: string
}

type OrderItemSummary = {
  itemSummary: string | null
  itemImageUrl: string | null
  itemTypes: string[]
  itemCount: number
  totalQuantity: number
}

type WineImageRow = {
  id: string
  cover_image_url?: string | null
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
  actor_user_id?: string | null
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  created_at: string
}

type ProfileRow = {
  id: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
}

type OrderShippingAddressRow = {
  id: string
  order_id: string
  recipient_name: string
  phone?: string | null
  email?: string | null
  line1: string
  line2?: string | null
  neighborhood?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  references?: string | null
  created_at: string
}

type ShipmentRow = {
  id: string
  order_id: string
  shipment_number?: string | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipping_cost?: number | string | null
  status_text: string
  tracking_assigned_at?: string | null
  handed_to_carrier_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at: string
}

type Relation<T> = T | T[] | null

const orderSelect = `
  id,order_number,customer_id,reservation_id,subtotal,discount_total,tax_total,shipping_total,total,currency,
  status,source,paid_at,cancelled_at,cancellation_reason,fulfilled_at,requires_shipping,shipping_status,metadata,created_at,updated_at,
  customers(id,user_id,display_name,first_name,last_name,email),
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

function stringFromMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function itemImageUrl(row: Pick<OrderItemRow, 'item_id' | 'item_type' | 'metadata'>, wineImages: Map<string, string | null>) {
  const snapshotImage = stringFromMetadata(row.metadata, ['imageUrl', 'image_url', 'coverImageUrl', 'cover_image_url'])
  if (snapshotImage) return snapshotImage
  if (row.item_type === 'wine' && row.item_id) return wineImages.get(row.item_id) ?? null
  return null
}

function customerName(row: OrderRow) {
  const customer = firstRelation(row.customers)
  return customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
}

function profileName(row: ProfileRow | null | undefined) {
  return row?.display_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() || null
}

async function loadActorNames(rows: AuditRow[]) {
  const actorIds = Array.from(new Set(rows.map((row) => row.actor_user_id).filter((value): value is string => Boolean(value))))
  if (actorIds.length === 0) return new Map<string, string>()
  const result = await supabaseAdminClient
    .from('profiles')
    .select('id,first_name,last_name,display_name')
    .in('id', actorIds)
  if (result.error) return new Map<string, string>()
  return new Map(
    ((result.data ?? []) as ProfileRow[])
      .map((profile) => [profile.id, profileName(profile)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
}

function mapShippingAddress(row?: OrderShippingAddressRow | null) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id,
    recipientName: row.recipient_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    line1: row.line1,
    line2: row.line2 ?? null,
    neighborhood: row.neighborhood ?? null,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    references: row.references ?? null,
    createdAt: row.created_at,
  }
}

function mapShipment(row?: ShipmentRow | null, canSeeMoney = true) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id,
    shipmentNumber: row.shipment_number ?? null,
    carrier: row.carrier ?? null,
    trackingNumber: row.tracking_number ?? null,
    trackingUrl: row.tracking_url ?? null,
    shippingCost: canSeeMoney ? toNumber(row.shipping_cost) : null,
    status: row.status_text,
    trackingAssignedAt: row.tracking_assigned_at ?? null,
    handedToCarrierAt: row.handed_to_carrier_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrder(
  row: OrderRow,
  payments: PaymentSummaryRow[] = [],
  shipping?: { address?: OrderShippingAddressRow | null; shipment?: ShipmentRow | null },
  canSeeMoney = true,
  itemSummary?: OrderItemSummary,
) {
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
    subtotal: canSeeMoney ? toNumber(row.subtotal) : null,
    discountTotal: canSeeMoney ? toNumber(row.discount_total) : null,
    taxTotal: canSeeMoney ? toNumber(row.tax_total) : null,
    shippingTotal: canSeeMoney ? toNumber(row.shipping_total) : null,
    total: canSeeMoney ? toNumber(row.total) : null,
    paidAmount: canSeeMoney ? paidAmount : null,
    financialRestricted: !canSeeMoney,
    currency: row.currency.trim(),
    status: row.status,
    requiresShipping: Boolean(row.requires_shipping),
    shippingStatus: row.requires_shipping ? row.shipping_status ?? 'pending_preparation' : 'not_required',
    shippingAddress: mapShippingAddress(shipping?.address),
    shipment: mapShipment(shipping?.shipment, canSeeMoney),
    itemSummary: itemSummary?.itemSummary ?? null,
    itemImageUrl: itemSummary?.itemImageUrl ?? null,
    itemTypes: itemSummary?.itemTypes ?? [],
    itemCount: itemSummary?.itemCount ?? 0,
    totalQuantity: itemSummary?.totalQuantity ?? 0,
    source: row.source ?? 'Centro de control',
    paidAt: row.paid_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    fulfilledAt: row.fulfilled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function itemSummariesForOrders(orderIds: string[]) {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))]
  const map = new Map<string, OrderItemSummary>()
  if (!uniqueOrderIds.length) return map
  const result = await supabaseAdminClient
    .from('order_items')
    .select('order_id,item_id,item_type,name_snapshot,quantity,metadata')
    .in('order_id', uniqueOrderIds)
    .order('name_snapshot', { ascending: true })
  const rows = assertNoError<Pick<OrderItemRow, 'order_id' | 'item_id' | 'item_type' | 'name_snapshot' | 'quantity' | 'metadata'>[]>(result).data ?? []
  const wineIds = [...new Set(rows.filter((item) => item.item_type === 'wine' && item.item_id).map((item) => item.item_id as string))]
  const wineImages = wineIds.length
    ? new Map((assertNoError<WineImageRow[]>(await supabaseAdminClient.from('wines').select('id,cover_image_url').in('id', wineIds)).data ?? []).map((row) => [row.id, row.cover_image_url ?? null]))
    : new Map<string, string | null>()
  const grouped = new Map<string, Pick<OrderItemRow, 'order_id' | 'item_id' | 'item_type' | 'name_snapshot' | 'quantity' | 'metadata'>[]>()
  for (const row of rows) {
    grouped.set(row.order_id, [...(grouped.get(row.order_id) ?? []), row])
  }
  for (const orderId of uniqueOrderIds) {
    const items = grouped.get(orderId) ?? []
    const names = items.map((item) => item.name_snapshot).filter(Boolean)
    const visibleNames = names.slice(0, 2).join(' + ')
    const extraCount = Math.max(names.length - 2, 0)
    map.set(orderId, {
      itemSummary: visibleNames ? `${visibleNames}${extraCount ? ` + ${extraCount} más` : ''}` : null,
      itemImageUrl: items.map((item) => itemImageUrl(item, wineImages)).find(Boolean) ?? null,
      itemTypes: [...new Set(items.map((item) => item.item_type).filter(Boolean))],
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    })
  }
  return map
}

function mapItem(row: OrderItemRow, canSeeMoney = true, wineImages = new Map<string, string | null>()) {
  return {
    id: row.id,
    orderId: row.order_id,
    itemId: row.item_id ?? null,
    itemType: row.item_type,
    nameSnapshot: row.name_snapshot,
    skuSnapshot: row.sku_snapshot ?? null,
    imageUrl: itemImageUrl(row, wineImages),
    quantity: row.quantity,
    unitPrice: canSeeMoney ? toNumber(row.unit_price) : null,
    subtotal: canSeeMoney ? toNumber(row.subtotal) : null,
    financialRestricted: !canSeeMoney,
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
  if (query.shippingStatus) next = next.eq('shipping_status', query.shippingStatus)
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

async function shippingForOrders(orderIds: string[]) {
  const map = new Map<string, { address?: OrderShippingAddressRow | null; shipment?: ShipmentRow | null }>()
  if (!orderIds.length) return map
  const [addressesResult, shipmentsResult] = await Promise.all([
    supabaseAdminClient
      .from('order_shipping_addresses')
      .select('id,order_id,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,created_at')
      .in('order_id', orderIds),
    supabaseAdminClient
      .from('shipments')
      .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false }),
  ])
  for (const row of assertNoError<OrderShippingAddressRow[]>(addressesResult).data ?? []) {
    map.set(row.order_id, { ...(map.get(row.order_id) ?? {}), address: row })
  }
  for (const row of assertNoError<ShipmentRow[]>(shipmentsResult).data ?? []) {
    const current = map.get(row.order_id) ?? {}
    if (!current.shipment) map.set(row.order_id, { ...current, shipment: row })
  }
  return map
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

async function wineImagesForItems(items: OrderItemRow[]) {
  const wineIds = [...new Set(items.filter((item) => item.item_type === 'wine' && item.item_id).map((item) => item.item_id as string))]
  if (!wineIds.length) return new Map<string, string | null>()
  const result = await supabaseAdminClient
    .from('wines')
    .select('id,cover_image_url')
    .in('id', wineIds)
  const rows = assertNoError<WineImageRow[]>(result).data ?? []
  return new Map(rows.map((row) => [row.id, row.cover_image_url ?? null]))
}

async function requireFinancialAccessForOrders(user: UserContext) {
  if (!(await userHasFinancialAccess(user))) {
    throw httpError(403, 'Acceso financiero restringido')
  }
}

export async function listOrders(query: OrderListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const canSeeMoney = await userHasFinancialAccess(user)
  if (!canSeeMoney && (query.payment || query.minTotal !== undefined || query.maxTotal !== undefined)) {
    throw httpError(403, 'Acceso financiero restringido')
  }
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
  const orderIds = rows.map((row) => row.id)
  const [payments, shipping, itemSummaries] = await Promise.all([
    canSeeMoney ? paymentsForOrders(orderIds) : Promise.resolve(new Map<string, PaymentSummaryRow[]>()),
    shippingForOrders(orderIds),
    itemSummariesForOrders(orderIds),
  ])
  if (query.payment === 'with_payment') rows = rows.filter((row) => (payments.get(row.id) ?? []).length > 0)
  if (query.payment === 'without_payment') rows = rows.filter((row) => (payments.get(row.id) ?? []).length === 0)
  return {
    data: rows.map((row) => mapOrder(row, payments.get(row.id) ?? [], shipping.get(row.id), canSeeMoney, itemSummaries.get(row.id))),
    count: query.payment ? rows.length : result.count ?? rows.length,
  }
}

export async function getOrder(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const canSeeMoney = await userHasFinancialAccess(user)
  const result = await supabaseAdminClient
    .from('orders')
    .select(orderSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<OrderRow | null>(result).data
  if (!row) throw httpError(404, 'Orden no encontrada')
  const [payments, shipping, itemSummaries] = await Promise.all([
    canSeeMoney ? paymentsForOrders([id]) : Promise.resolve(new Map<string, PaymentSummaryRow[]>()),
    shippingForOrders([id]),
    itemSummariesForOrders([id]),
  ])
  return { data: mapOrder(row, payments.get(id) ?? [], shipping.get(id), canSeeMoney, itemSummaries.get(id)) }
}

export async function createOrder(payload: CreateOrderPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await requireFinancialAccessForOrders(user)
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
  await requireFinancialAccessForOrders(user)
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
  const canSeeMoney = await userHasFinancialAccess(user)
  await getOrder(id, user)
  const result = await supabaseAdminClient
    .from('order_items')
    .select('id,order_id,item_id,item_type,name_snapshot,sku_snapshot,quantity,unit_price,subtotal,metadata,created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
  const rows = assertNoError<OrderItemRow[]>(result).data ?? []
  const wineImages = await wineImagesForItems(rows)
  return { data: rows.map((row) => mapItem(row, canSeeMoney, wineImages)) }
}

export async function listOrderPayments(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await requireFinancialAccessForOrders(user)
  await getOrder(id, user)
  const payments = await paymentsForOrders([id])
  return { data: (payments.get(id) ?? []).map(mapPayment) }
}

export async function listOrderHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getOrder(id, user)
  const result = await supabaseAdminClient
    .from('audit_logs')
    .select('id,action,entity_type,actor_user_id,before_data,after_data,created_at')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  const rows = assertNoError<AuditRow[]>(result).data ?? []
  const actorNames = await loadActorNames(rows)
  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      actorUserId: row.actor_user_id ?? null,
      actorName: row.actor_user_id ? actorNames.get(row.actor_user_id) ?? null : null,
      beforeData: row.before_data ?? {},
      afterData: row.after_data ?? {},
      createdAt: row.created_at,
    })),
  }
}

async function writeAudit(action: string, entityId: string, actorId?: string, metadata: Record<string, unknown> = {}) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: actorId ?? null,
    action,
    entity_type: 'orders',
    entity_id: entityId,
    after_data: metadata,
  })
}

async function insertOrderNotification(order: OrderRow, title: string, body: string, status: string) {
  const customer = firstRelation(order.customers)
  return createCustomerNotification({
    customerId: order.customer_id,
    userId: customer?.user_id ?? null,
    title,
    body,
    deepLink: `/app/perfil?orderId=${encodeURIComponent(order.id)}#orders`,
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      status,
    },
  })
}

async function getOrderRowForShipping(id: string) {
  const result = await supabaseAdminClient
    .from('orders')
    .select(orderSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<OrderRow | null>(result).data
  if (!row) throw httpError(404, 'Orden no encontrada')
  return row
}

async function getShippingAddress(orderId: string) {
  const result = await supabaseAdminClient
    .from('order_shipping_addresses')
    .select('id,order_id,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,created_at')
    .eq('order_id', orderId)
    .maybeSingle()
  return assertNoError<OrderShippingAddressRow | null>(result).data
}

async function getLatestShipment(orderId: string) {
  const result = await supabaseAdminClient
    .from('shipments')
    .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return assertNoError<ShipmentRow | null>(result).data
}

async function orderHasWineItem(orderId: string) {
  const result = await supabaseAdminClient
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('item_type', 'wine')
  if (result.error) normalizeDatabaseError(result.error)
  return (result.count ?? 0) > 0
}

function addressLine(address: OrderShippingAddressRow | null) {
  if (!address) return null
  return [
    address.line1,
    address.line2,
    address.neighborhood,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter(Boolean).join(', ')
}

async function ensureShipment(order: OrderRow, status = 'pending_preparation', actorId?: string | null) {
  if (!order.requires_shipping) throw httpError(422, 'Esta orden no requiere envío')
  const address = await getShippingAddress(order.id)
  if (!address) throw httpError(422, 'Falta domicilio de envío')
  const existing = await getLatestShipment(order.id)
  if (existing) return existing
  const now = new Date().toISOString()
  const result = await supabaseAdminClient
    .from('shipments')
    .insert({
      order_id: order.id,
      carrier: null,
      tracking_number: null,
      tracking_url: null,
      shipping_cost: toNumber(order.shipping_total),
      status_text: status,
      destination: addressLine(address),
      address_snapshot_id: address.id,
      created_by: actorId ?? null,
      updated_by: actorId ?? null,
      metadata: { source: 'order_fulfillment' },
      updated_at: now,
    })
    .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
    .single()
  return assertNoError<ShipmentRow>(result).data
}

export async function ensureOrderShippingAfterPayment(orderId: string) {
  const order = await getOrderRowForShipping(orderId)
  if (!order.requires_shipping) return { data: mapOrder(order) }
  await ensureShipment(order, 'pending_preparation')
  assertNoError(await supabaseAdminClient
    .from('orders')
    .update({ shipping_status: 'pending_preparation', updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .select('id')
    .single())
  await insertOrderNotification(
    order,
    'Pedido listo para preparar',
    `La orden ${order.order_number} tiene pago confirmado y requiere preparación.`,
    'pending_preparation',
  ).catch(() => undefined)
  await writeAudit('order_shipping_pending_preparation', order.id, undefined, { orderNumber: order.order_number })
  const refreshed = await getOrderRowForShipping(order.id)
  const [payments, shipping] = await Promise.all([
    paymentsForOrders([order.id]),
    shippingForOrders([order.id]),
  ])
  return { data: mapOrder(refreshed, payments.get(order.id) ?? [], shipping.get(order.id)) }
}

export async function prepareOrderShipment(id: string, _payload: OrderShippingActionPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const order = await getOrderRowForShipping(id)
  if (order.status !== 'paid' && order.status !== 'processing') throw httpError(422, 'La orden debe tener pago confirmado')
  const shipment = await ensureShipment(order, 'pending_preparation', user.userId)
  const now = new Date().toISOString()
  assertNoError(await supabaseAdminClient.from('shipments').update({ status_text: 'preparing', updated_by: user.userId, updated_at: now }).eq('id', shipment.id).select('id').single())
  assertNoError(await supabaseAdminClient.from('orders').update({ shipping_status: 'preparing', updated_by: user.userId, updated_at: now }).eq('id', order.id).select('id').single())
  await insertOrderNotification(order, 'Pedido en preparación', `La orden ${order.order_number} está en preparación.`, 'preparing').catch(() => undefined)
  await writeAudit('order_shipping_preparing', order.id, user.userId)
  return getOrder(order.id, user)
}

export async function assignOrderTracking(id: string, payload: OrderTrackingPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const order = await getOrderRowForShipping(id)
  if (order.status !== 'paid' && order.status !== 'processing') throw httpError(422, 'La orden debe tener pago confirmado')
  const shipment = await ensureShipment(order, 'awaiting_tracking', user.userId)
  const trackingChanged = shipment.carrier !== payload.carrier
    || shipment.tracking_number !== payload.trackingNumber
    || (shipment.tracking_url ?? null) !== (payload.trackingUrl ?? null)
  const now = new Date().toISOString()
  assertNoError(await supabaseAdminClient.from('shipments').update({
    carrier: payload.carrier,
    tracking_number: payload.trackingNumber,
    tracking_url: payload.trackingUrl ?? null,
    status_text: 'tracking_assigned',
    tracking_assigned_at: now,
    updated_by: user.userId,
    updated_at: now,
  }).eq('id', shipment.id).select('id').single())
  assertNoError(await supabaseAdminClient.from('orders').update({ shipping_status: 'tracking_assigned', updated_by: user.userId, updated_at: now }).eq('id', order.id).select('id').single())
  if (trackingChanged) {
    await insertOrderNotification(order, 'Guía asignada', `La orden ${order.order_number} ya tiene guía asignada.`, 'tracking_assigned').catch(() => undefined)
    await queueOrderTrackingEmail(order, {
      ...shipment,
      carrier: payload.carrier,
      tracking_number: payload.trackingNumber,
      tracking_url: payload.trackingUrl ?? null,
      status_text: 'tracking_assigned',
      tracking_assigned_at: now,
    }).catch(() => undefined)
  }
  await writeAudit('order_tracking_assigned', order.id, user.userId, { carrier: payload.carrier })
  return getOrder(order.id, user)
}

async function queueOrderTrackingEmail(order: OrderRow, shipment: ShipmentRow) {
  const customer = firstRelation(order.customers)
  if (!customer?.email || !shipment.tracking_number) return
  const trackingFingerprint = createHash('sha256')
    .update([shipment.carrier, shipment.tracking_number, shipment.tracking_url].map((value) => value ?? '').join('|'))
    .digest('hex')
    .slice(0, 16)
  await enqueueAndProcessTransactionalEmail({
    eventType: 'order.tracking_assigned',
    aggregateType: 'orders',
    aggregateId: order.id,
    customerId: order.customer_id,
    userId: customer.user_id ?? null,
    recipientEmail: customer.email,
    locale: 'es-MX',
    payload: {
      customerName: customerName(order),
      orderNumber: order.order_number,
      carrier: shipment.carrier ?? 'Paquetería',
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_url ?? '',
      shippingStatus: 'tracking_assigned',
    },
    idempotencyKey: `order.tracking_assigned:${order.id}:${trackingFingerprint}`,
  })
}

async function queueOrderShippedEmail(order: OrderRow, shipment: ShipmentRow) {
  const customer = firstRelation(order.customers)
  if (!customer?.email) return
  await enqueueAndProcessTransactionalEmail({
    eventType: 'order.shipped',
    aggregateType: 'orders',
    aggregateId: order.id,
    customerId: order.customer_id,
    userId: customer.user_id ?? null,
    recipientEmail: customer.email,
    locale: 'es-MX',
    payload: {
      customerName: customerName(order),
      orderNumber: order.order_number,
      carrier: shipment.carrier ?? 'Paquetería',
      trackingNumber: shipment.tracking_number ?? '',
      trackingUrl: shipment.tracking_url ?? '',
      shippingStatus: 'shipped',
    },
    idempotencyKey: `order.shipped:${order.id}:${shipment.tracking_number ?? shipment.id}`,
  }).catch(() => undefined)
}

export async function shipOrder(id: string, payload: OrderShipPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const order = await getOrderRowForShipping(id)
  const current = await ensureShipment(order, 'awaiting_tracking', user.userId)
  if (!payload.confirmWithoutTracking && !current.tracking_number) throw httpError(422, 'Falta número de guía')
  const now = new Date().toISOString()
  const result = await supabaseAdminClient.from('shipments').update({
    status_text: 'shipped',
    shipped_at: current.shipped_at ?? now,
    handed_to_carrier_at: now,
    updated_by: user.userId,
    updated_at: now,
  }).eq('id', current.id)
    .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
    .single()
  const shipment = assertNoError<ShipmentRow>(result).data
  assertNoError(await supabaseAdminClient.from('orders').update({ shipping_status: 'shipped', updated_by: user.userId, updated_at: now }).eq('id', order.id).select('id').single())
  await insertOrderNotification(order, 'Pedido enviado', `La orden ${order.order_number} fue marcada como enviada.`, 'shipped').catch(() => undefined)
  await queueOrderShippedEmail(order, shipment)
  await writeAudit('order_shipped', order.id, user.userId)
  return getOrder(order.id, user)
}

export async function deliverOrder(id: string, _payload: OrderShippingActionPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const order = await getOrderRowForShipping(id)
  const current = await ensureShipment(order, 'shipped', user.userId)
  const now = new Date().toISOString()
  assertNoError(await supabaseAdminClient.from('shipments').update({
    status_text: 'delivered',
    delivered_at: now,
    delivered_by: user.userId,
    updated_by: user.userId,
    updated_at: now,
  }).eq('id', current.id).select('id').single())
  assertNoError(await supabaseAdminClient.from('orders').update({ shipping_status: 'delivered', updated_by: user.userId, updated_at: now }).eq('id', order.id).select('id').single())
  await insertOrderNotification(order, 'Pedido entregado', `La orden ${order.order_number} fue marcada como entregada.`, 'delivered').catch(() => undefined)
  await writeAudit('order_delivered', order.id, user.userId)
  return getOrder(order.id, user)
}

/**
 * Mantiene el módulo de Logística y el detalle de Órdenes sobre el mismo estado.
 * Es idempotente: correos y avisos usan claves estables y no se duplican al
 * actualizar el mismo envío desde dos pantallas administrativas.
 */
export async function synchronizeOrderFromShipment(
  shipmentId: string,
  user: UserContext,
) {
  requireOperationRole(user, writeRoles)
  const shipmentResult = await supabaseAdminClient
    .from('shipments')
    .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
    .eq('id', shipmentId)
    .maybeSingle()
  const shipment = assertNoError<ShipmentRow | null>(shipmentResult).data
  if (!shipment) throw httpError(404, 'Envío no encontrado')

  const order = await getOrderRowForShipping(shipment.order_id)
  if (!order.requires_shipping && !(await orderHasWineItem(order.id))) {
    throw httpError(422, 'Esta orden no requiere envío')
  }
  if (!['paid', 'processing', 'fulfilled'].includes(order.status)) return

  const statusMap: Record<string, string | null> = {
    pending: 'pending_preparation',
    pending_preparation: 'pending_preparation',
    preparing: 'preparing',
    ready: 'awaiting_tracking',
    awaiting_tracking: 'awaiting_tracking',
    tracking_assigned: 'tracking_assigned',
    shipped: 'shipped',
    in_transit: 'shipped',
    delivered: 'delivered',
    returned: 'cancelled',
    cancelled: 'cancelled',
    failed: null,
  }
  let nextStatus = statusMap[shipment.status_text] ?? null
  if (shipment.tracking_number && !['shipped', 'in_transit', 'delivered'].includes(shipment.status_text)) {
    nextStatus = 'tracking_assigned'
  }
  if (!nextStatus) return

  const now = new Date().toISOString()
  const previousStatus = order.shipping_status ?? 'not_required'
  assertNoError(await supabaseAdminClient
    .from('orders')
    .update({ requires_shipping: true, shipping_status: nextStatus, updated_by: user.userId, updated_at: now })
    .eq('id', order.id)
    .select('id')
    .single())

  if (shipment.tracking_number && !['tracking_assigned', 'shipped', 'delivered'].includes(previousStatus)) {
    await queueOrderTrackingEmail(order, shipment).catch(() => undefined)
    await insertOrderNotification(
      order,
      'Guía asignada',
      `La orden ${order.order_number} ya tiene guía asignada.`,
      'tracking_assigned',
    ).catch(() => undefined)
  }
  if (nextStatus === 'shipped' && previousStatus !== 'shipped') {
    await queueOrderShippedEmail(order, shipment).catch(() => undefined)
    await insertOrderNotification(
      order,
      'Pedido enviado',
      `La orden ${order.order_number} fue marcada como enviada.`,
      'shipped',
    ).catch(() => undefined)
  }
  if (nextStatus === 'delivered' && previousStatus !== 'delivered') {
    await insertOrderNotification(
      order,
      'Pedido entregado',
      `La orden ${order.order_number} fue marcada como entregada.`,
      'delivered',
    ).catch(() => undefined)
  }
  await writeAudit('order_shipping_synced_from_logistics', order.id, user.userId, {
    shipmentId,
    shippingStatus: nextStatus,
  })
}

export async function exportOrders(query: OrderListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  await requireFinancialAccessForOrders(user)
  const { data } = await listOrders({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'order_number',
    'customer',
    'reservation_number',
    'status',
    'shipping_status',
    'tracking_number',
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
    item.shippingStatus,
    item.shipment?.trackingNumber ?? '',
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
