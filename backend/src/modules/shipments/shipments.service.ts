import { randomUUID } from 'crypto'
import { createSupabaseUserRequestClient, supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  httpError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  CreateCarrierPayload,
  CreateShipmentPayload,
  PatchShipmentPayload,
  ShipmentListQuery,
} from './shipments.schemas'
import { synchronizeOrderFromShipment } from '../orders/orders.service'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']
const exportRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']

type Relation<T> = T | T[] | null
type ShipmentRow = {
  id: string
  shipment_number?: string | null
  order_id: string
  carrier_id?: string | null
  carrier?: string | null
  service_level?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  tracking_assigned_at?: string | null
  status_text: string
  origin?: string | null
  destination?: string | null
  shipping_cost: number | string
  estimated_delivery_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  incident_count: number
  created_at: string
  updated_at: string
  orders?: Relation<{
    order_number: string
    status?: string | null
    source?: string | null
    requires_shipping?: boolean | null
    total?: number | string | null
    currency?: string | null
    created_at?: string | null
    customers?: Relation<{ display_name?: string | null; first_name: string; last_name: string; email?: string | null }>
  }>
  carriers?: Relation<{ name: string; carrier_type: string }>
}
type CarrierRow = {
  id: string
  name: string
  carrier_type: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  active: boolean
  created_at: string
  updated_at: string
}
type ShipmentEventRow = {
  id: string
  shipment_id: string
  event_type: string
  status_text?: string | null
  notes?: string | null
  evidence_storage_path?: string | null
  occurred_at: string
  created_at: string
}
type ShipmentOrderRow = {
  id: string
  requires_shipping?: boolean | null
}
type OrderItemSummaryRow = {
  order_id: string
  item_id?: string | null
  item_type: string
  name_snapshot: string
  quantity: number
  metadata?: Record<string, unknown> | null
}
type ShipmentOrderSummary = {
  orderType: string
  productSummary: string | null
  productImageUrl: string | null
  productTypes: string[]
  itemCount: number
  totalQuantity: number
}

const shipmentSelect = `
  id,shipment_number,order_id,carrier_id,carrier,service_level,tracking_number,tracking_url,tracking_assigned_at,status_text,origin,destination,
  shipping_cost,estimated_delivery_at,shipped_at,delivered_at,cancelled_at,cancellation_reason,incident_count,created_at,updated_at,
  orders(order_number,status,source,requires_shipping,total,currency,created_at,customers(display_name,first_name,last_name,email)),
  carriers(name,carrier_type)
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function first<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function customerName(row: ShipmentRow) {
  const customer = first(first(row.orders)?.customers)
  return customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
}

function orderTypeFromItems(items: OrderItemSummaryRow[], requiresShipping?: boolean | null) {
  const types = new Set(items.map((item) => item.item_type))
  if (types.size > 1) return 'mixed'
  const [type] = [...types]
  if (!type) return requiresShipping ? 'physical_order' : 'service_order'
  if (type === 'wine') return 'wine'
  if (type === 'event' || type === 'ticket' || type === 'event_ticket') return 'event'
  if (type === 'experience' || type === 'experience_reservation') return 'experience'
  if (type === 'lodging' || type === 'cabin') return 'lodging'
  if (type === 'restaurant' || type === 'food') return 'restaurant'
  return type
}

function stringFromMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function itemImageUrl(row: OrderItemSummaryRow, wineImages: Map<string, string | null>) {
  const snapshotImage = stringFromMetadata(row.metadata, ['imageUrl', 'image_url', 'coverImageUrl', 'cover_image_url'])
  if (snapshotImage) return snapshotImage
  if (row.item_type === 'wine' && row.item_id) return wineImages.get(row.item_id) ?? null
  return null
}

async function loadShipmentOrderSummaries(orderIds: string[], requiresShippingByOrderId = new Map<string, boolean | null | undefined>()) {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))]
  if (uniqueOrderIds.length === 0) return new Map<string, ShipmentOrderSummary>()
  const result = await supabaseAdminClient
    .from('order_items')
    .select('order_id,item_id,item_type,name_snapshot,quantity,metadata')
    .in('order_id', uniqueOrderIds)
    .order('name_snapshot', { ascending: true })
  const rows = assertNoError<OrderItemSummaryRow[]>(result).data ?? []
  const wineIds = [...new Set(rows.filter((item) => item.item_type === 'wine' && item.item_id).map((item) => item.item_id as string))]
  const wineImages = wineIds.length
    ? new Map((assertNoError<{ id: string; cover_image_url?: string | null }[]>(await supabaseAdminClient.from('wines').select('id,cover_image_url').in('id', wineIds)).data ?? []).map((row) => [row.id, row.cover_image_url ?? null]))
    : new Map<string, string | null>()
  const grouped = new Map<string, OrderItemSummaryRow[]>()
  for (const row of rows) {
    grouped.set(row.order_id, [...(grouped.get(row.order_id) ?? []), row])
  }
  const summaries = new Map<string, ShipmentOrderSummary>()
  for (const orderId of uniqueOrderIds) {
    const items = grouped.get(orderId) ?? []
    const names = items.map((item) => item.name_snapshot).filter(Boolean)
    const visibleNames = names.slice(0, 2).join(' + ')
    const extraCount = Math.max(names.length - 2, 0)
    summaries.set(orderId, {
      orderType: orderTypeFromItems(items, requiresShippingByOrderId.get(orderId)),
      productSummary: visibleNames ? `${visibleNames}${extraCount ? ` + ${extraCount} más` : ''}` : null,
      productImageUrl: items.map((item) => itemImageUrl(item, wineImages)).find(Boolean) ?? null,
      productTypes: [...new Set(items.map((item) => item.item_type).filter(Boolean))],
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    })
  }
  return summaries
}

async function assertOrderAcceptsShipment(orderId: string) {
  const orderResult = await supabaseAdminClient
    .from('orders')
    .select('id,requires_shipping')
    .eq('id', orderId)
    .maybeSingle()
  const order = assertNoError<ShipmentOrderRow | null>(orderResult).data
  if (!order) throw httpError(404, 'Orden no encontrada')
  if (order.requires_shipping) return

  const wineResult = await supabaseAdminClient
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('item_type', 'wine')
  if (wineResult.error) normalizeDatabaseError(wineResult.error)
  if ((wineResult.count ?? 0) > 0) return

  throw httpError(422, 'Esta orden no requiere envío')
}

function mapShipment(row: ShipmentRow, summary?: ShipmentOrderSummary) {
  const order = first(row.orders)
  const carrier = first(row.carriers)
  return {
    id: row.id,
    shipmentNumber: row.shipment_number ?? null,
    orderId: row.order_id,
    orderNumber: order?.order_number ?? null,
    orderStatus: order?.status ?? null,
    orderSource: order?.source ?? null,
    orderCreatedAt: order?.created_at ?? null,
    orderRequiresShipping: order?.requires_shipping ?? null,
    orderTotal: order?.total === undefined || order?.total === null ? null : toNumber(order.total),
    currency: order?.currency?.trim() ?? 'MXN',
    orderType: summary?.orderType ?? orderTypeFromItems([], order?.requires_shipping),
    productSummary: summary?.productSummary ?? null,
    productImageUrl: summary?.productImageUrl ?? null,
    productTypes: summary?.productTypes ?? [],
    itemCount: summary?.itemCount ?? 0,
    totalQuantity: summary?.totalQuantity ?? 0,
    customerName: customerName(row),
    carrierId: row.carrier_id ?? null,
    carrierName: carrier?.name ?? row.carrier ?? null,
    carrierType: carrier?.carrier_type ?? null,
    serviceLevel: row.service_level ?? null,
    trackingNumber: row.tracking_number ?? null,
    trackingUrl: row.tracking_url ?? null,
    status: row.status_text,
    origin: row.origin ?? null,
    destination: row.destination ?? null,
    shippingCost: toNumber(row.shipping_cost),
    estimatedDeliveryAt: row.estimated_delivery_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    incidentCount: row.incident_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCarrier(row: CarrierRow) {
  return {
    id: row.id,
    name: row.name,
    carrierType: row.carrier_type,
    contactName: row.contact_name ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyFilters(request: any, query: ShipmentListQuery) {
  let next = request
  if (query.orderId) next = next.eq('order_id', query.orderId)
  if (query.carrierId) next = next.eq('carrier_id', query.carrierId)
  if (query.status) next = next.eq('status_text', query.status)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`shipment_number.ilike.%${safe}%,tracking_number.ilike.%${safe}%,carrier.ilike.%${safe}%`)
  }
  return next
}

export async function listShipments(query: ShipmentListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyFilters(
    supabaseAdminClient
      .from('shipments')
      .select(shipmentSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  const rows = assertNoError<ShipmentRow[]>(result).data ?? []
  const requiresShippingByOrderId = new Map(rows.map((row) => [row.order_id, first(row.orders)?.requires_shipping]))
  const summaries = await loadShipmentOrderSummaries(rows.map((row) => row.order_id), requiresShippingByOrderId)
  return {
    data: rows.map((row) => mapShipment(row, summaries.get(row.order_id))),
    count: result.count ?? 0,
  }
}

export async function getShipment(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('shipments').select(shipmentSelect).eq('id', id).maybeSingle()
  const row = assertNoError<ShipmentRow | null>(result).data
  if (!row) throw httpError(404, 'Envío no encontrado')
  const summaries = await loadShipmentOrderSummaries([row.order_id], new Map([[row.order_id, first(row.orders)?.requires_shipping]]))
  return { data: mapShipment(row, summaries.get(row.order_id)) }
}

export async function createShipment(payload: CreateShipmentPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await assertOrderAcceptsShipment(payload.orderId)
  const result = await rpcClient(user).rpc('create_shipment', {
    p_order_id: payload.orderId,
    p_carrier_id: payload.carrierId ?? null,
    p_carrier: payload.carrier ?? null,
    p_service_level: payload.serviceLevel ?? null,
    p_tracking_number: payload.trackingNumber ?? null,
    p_origin: payload.origin ?? null,
    p_destination: payload.destination ?? null,
    p_estimated_delivery_at: payload.estimatedDeliveryAt ?? null,
    p_shipping_cost: payload.shippingCost,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  const shipmentId = String(result.data)
  if (payload.trackingNumber || payload.trackingUrl) {
    const now = new Date().toISOString()
    assertNoError(await supabaseAdminClient
      .from('shipments')
      .update({
        tracking_url: payload.trackingUrl ?? null,
        tracking_assigned_at: payload.trackingNumber ? now : null,
        status_text: payload.trackingNumber ? 'tracking_assigned' : 'awaiting_tracking',
        updated_by: user.userId,
        updated_at: now,
      })
      .eq('id', shipmentId)
      .select('id')
      .single())
  }
  await synchronizeOrderFromShipment(shipmentId, user)
  return getShipment(shipmentId, user)
}

export async function patchShipment(id: string, payload: PatchShipmentPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.carrierId !== undefined) patch.carrier_id = payload.carrierId
  if (payload.carrier !== undefined) patch.carrier = payload.carrier
  if (payload.serviceLevel !== undefined) patch.service_level = payload.serviceLevel
  if (payload.trackingNumber !== undefined) patch.tracking_number = payload.trackingNumber
  if (payload.trackingUrl !== undefined) patch.tracking_url = payload.trackingUrl
  if (payload.trackingNumber) {
    patch.tracking_assigned_at = new Date().toISOString()
    patch.status_text = 'tracking_assigned'
  }
  if (payload.origin !== undefined) patch.origin = payload.origin
  if (payload.destination !== undefined) patch.destination = payload.destination
  if (payload.estimatedDeliveryAt !== undefined) patch.estimated_delivery_at = payload.estimatedDeliveryAt
  if (payload.shippingCost !== undefined) patch.shipping_cost = payload.shippingCost
  if (payload.metadata !== undefined) patch.metadata = payload.metadata
  assertNoError(await supabaseAdminClient.from('shipments').update(patch).eq('id', id).select('id').single())
  await synchronizeOrderFromShipment(id, user)
  await writeAudit(user, 'shipment_updated', 'shipments', id, { fields: Object.keys(patch) })
  return getShipment(id, user)
}

export async function updateShipmentStatus(id: string, status: string, notes: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('update_shipment_status', {
    p_shipment_id: id,
    p_status: status,
    p_notes: notes ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const shipmentId = String(result.data)
  await synchronizeOrderFromShipment(shipmentId, user)
  return getShipment(shipmentId, user)
}

export async function registerShipmentIncident(id: string, notes: string, evidenceStoragePath: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('register_shipment_incident', {
    p_shipment_id: id,
    p_notes: notes,
    p_evidence_storage_path: evidenceStoragePath ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return listShipmentHistory(id, user)
}

export async function deliverShipment(id: string, notes: string | null | undefined, evidenceStoragePath: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('mark_shipment_delivered', {
    p_shipment_id: id,
    p_evidence_storage_path: evidenceStoragePath ?? null,
    p_notes: notes ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const shipmentId = String(result.data)
  await synchronizeOrderFromShipment(shipmentId, user)
  return getShipment(shipmentId, user)
}

export async function listShipmentHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getShipment(id, user)
  const result = await supabaseAdminClient
    .from('shipment_events')
    .select('id,shipment_id,event_type,status_text,notes,evidence_storage_path,occurred_at,created_at')
    .eq('shipment_id', id)
    .order('occurred_at', { ascending: false })
  return {
    data: (assertNoError<ShipmentEventRow[]>(result).data ?? []).map((row) => ({
      id: row.id,
      shipmentId: row.shipment_id,
      eventType: row.event_type,
      status: row.status_text ?? null,
      notes: row.notes ?? null,
      hasEvidence: Boolean(row.evidence_storage_path),
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    })),
  }
}

export async function listCarriers(user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('carriers')
    .select('id,name,carrier_type,contact_name,phone,email,active,created_at,updated_at')
    .order('name', { ascending: true })
  return { data: (assertNoError<CarrierRow[]>(result).data ?? []).map(mapCarrier) }
}

export async function createCarrier(payload: CreateCarrierPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('carriers')
    .insert({
      name: payload.name,
      carrier_type: payload.carrierType,
      contact_name: payload.contactName ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      active: payload.active ?? true,
      metadata: payload.metadata ?? {},
      created_by: user.userId,
      updated_by: user.userId,
    })
    .select('id,name,carrier_type,contact_name,phone,email,active,created_at,updated_at')
    .single()
  const row = assertNoError<CarrierRow>(result).data
  await writeAudit(user, 'carrier_created', 'carriers', row.id, { name: row.name })
  return { data: mapCarrier(row) }
}

export async function exportShipments(query: ShipmentListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listShipments({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['shipment_number', 'order_number', 'customer', 'order_type', 'products', 'carrier', 'tracking_number', 'status', 'estimated_delivery', 'delivered_at']
  const rows = data.map((item) => [
    item.shipmentNumber ?? '',
    item.orderNumber ?? '',
    item.customerName ?? '',
    item.orderType ?? '',
    item.productSummary ?? '',
    item.carrierName ?? '',
    item.trackingNumber ?? '',
    item.status,
    item.estimatedDeliveryAt ?? '',
    item.deliveredAt ?? '',
  ])
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

async function writeAudit(user: UserContext, action: string, entityType: string, entityId: string, afterData: Record<string, unknown>) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData,
  })
}
