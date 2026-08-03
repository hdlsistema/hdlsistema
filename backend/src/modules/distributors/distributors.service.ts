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
  CreateDistributorContactPayload,
  CreateDistributorOrderPayload,
  CreateDistributorPayload,
  DistributorListQuery,
  DistributorOrderListQuery,
  PatchDistributorContactPayload,
  PatchDistributorOrderPayload,
  PatchDistributorPayload,
} from './distributors.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']
const financeWriteRoles = ['super_admin', 'admin', 'operations', 'finance']
const exportRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']

type Relation<T> = T | T[] | null
type DistributorRow = {
  id: string
  distributor_number?: string | null
  name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  zone?: string | null
  distributor_type: string
  operational_status: string
  commercial_terms?: string | null
  price_list_name?: string | null
  credit_limit?: number | string | null
  notes?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
}
type ContactRow = {
  id: string
  distributor_id: string
  name: string
  role_title?: string | null
  email?: string | null
  phone?: string | null
  is_primary: boolean
  active: boolean
  created_at: string
  updated_at: string
}
type DistributorOrderRow = {
  id: string
  distributor_id: string
  order_number: string
  order_status_text: string
  total: number | string
  currency: string
  submitted_at?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  prepared_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  rejected_reason?: string | null
  cancellation_reason?: string | null
  created_at: string
  updated_at: string
  distributors?: Relation<{ distributor_number?: string | null; name: string; zone?: string | null }>
}
type DistributorOrderItemRow = {
  id: string
  distributor_order_id: string
  sku_snapshot?: string | null
  name_snapshot: string
  quantity: number
  unit_price: number | string
  subtotal: number | string
}

const distributorSelect = `
  id,distributor_number,name,contact_name,email,phone,address,tax_id,zone,distributor_type,operational_status,
  commercial_terms,price_list_name,credit_limit,notes,archived_at,created_at,updated_at
`
const orderSelect = `
  id,distributor_id,order_number,order_status_text,total,currency,submitted_at,approved_at,rejected_at,prepared_at,
  shipped_at,delivered_at,cancelled_at,rejected_reason,cancellation_reason,created_at,updated_at,
  distributors(distributor_number,name,zone)
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

function mapDistributor(row: DistributorRow) {
  return {
    id: row.id,
    distributorNumber: row.distributor_number ?? null,
    name: row.name,
    contactName: row.contact_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    taxId: row.tax_id ?? null,
    zone: row.zone ?? null,
    distributorType: row.distributor_type,
    status: row.operational_status,
    commercialTerms: row.commercial_terms ?? null,
    priceListName: row.price_list_name ?? null,
    creditLimit: toNumber(row.credit_limit),
    notes: row.notes ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapContact(row: ContactRow) {
  return {
    id: row.id,
    distributorId: row.distributor_id,
    name: row.name,
    roleTitle: row.role_title ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isPrimary: row.is_primary,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDistributorOrder(row: DistributorOrderRow) {
  const distributor = first(row.distributors)
  return {
    id: row.id,
    distributorId: row.distributor_id,
    distributorNumber: distributor?.distributor_number ?? null,
    distributorName: distributor?.name ?? null,
    zone: distributor?.zone ?? null,
    orderNumber: row.order_number,
    status: row.order_status_text,
    total: toNumber(row.total),
    currency: row.currency.trim(),
    submittedAt: row.submitted_at ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    preparedAt: row.prepared_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    rejectedReason: row.rejected_reason ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyDistributorFilters(request: any, query: DistributorListQuery) {
  let next = request
  if (query.status) next = next.eq('operational_status', query.status)
  if (query.zone) next = next.eq('zone', query.zone)
  if (query.type) next = next.eq('distributor_type', query.type)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`name.ilike.%${safe}%,distributor_number.ilike.%${safe}%,zone.ilike.%${safe}%`)
  }
  return next
}

function applyOrderFilters(request: any, query: DistributorOrderListQuery) {
  let next = request
  if (query.distributorId) next = next.eq('distributor_id', query.distributorId)
  if (query.status) next = next.eq('order_status_text', query.status)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`order_number.ilike.%${safe}%`)
  }
  return next
}

export async function listDistributors(query: DistributorListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyDistributorFilters(
    supabaseAdminClient
      .from('distributors')
      .select(distributorSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  return {
    data: (assertNoError<DistributorRow[]>(result).data ?? []).map(mapDistributor),
    count: result.count ?? 0,
  }
}

export async function getDistributor(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('distributors').select(distributorSelect).eq('id', id).maybeSingle()
  const row = assertNoError<DistributorRow | null>(result).data
  if (!row) throw httpError(404, 'Distribuidor no encontrado')
  return { data: mapDistributor(row) }
}

function distributorPayload(payload: CreateDistributorPayload | PatchDistributorPayload, user: UserContext) {
  const record: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if ('name' in payload && payload.name !== undefined) record.name = payload.name
  if ('contactName' in payload && payload.contactName !== undefined) record.contact_name = payload.contactName
  if ('email' in payload && payload.email !== undefined) record.email = payload.email
  if ('phone' in payload && payload.phone !== undefined) record.phone = payload.phone
  if ('address' in payload && payload.address !== undefined) record.address = payload.address
  if ('taxId' in payload && payload.taxId !== undefined) record.tax_id = payload.taxId
  if ('zone' in payload && payload.zone !== undefined) record.zone = payload.zone
  if ('distributorType' in payload && payload.distributorType !== undefined) record.distributor_type = payload.distributorType
  if ('operationalStatus' in payload && payload.operationalStatus !== undefined) record.operational_status = payload.operationalStatus
  if ('commercialTerms' in payload && payload.commercialTerms !== undefined) record.commercial_terms = payload.commercialTerms
  if ('priceListName' in payload && payload.priceListName !== undefined) record.price_list_name = payload.priceListName
  if ('creditLimit' in payload && payload.creditLimit !== undefined) record.credit_limit = payload.creditLimit
  if ('notes' in payload && payload.notes !== undefined) record.notes = payload.notes
  if ('metadata' in payload && payload.metadata !== undefined) record.metadata = payload.metadata
  return record
}

export async function createDistributor(payload: CreateDistributorPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const distributorNumber = `DIST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
  const result = await supabaseAdminClient
    .from('distributors')
    .insert({
      ...distributorPayload(payload, user),
      distributor_number: distributorNumber,
      created_by: user.userId,
      status: payload.operationalStatus === 'archived' ? 'archived' : 'published',
    })
    .select(distributorSelect)
    .single()
  const row = assertNoError<DistributorRow>(result).data
  await writeAudit(user, 'distributor_created', 'distributors', row.id, { distributor_number: distributorNumber })
  return { data: mapDistributor(row) }
}

export async function patchDistributor(id: string, payload: PatchDistributorPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch = distributorPayload(payload, user)
  assertNoError(await supabaseAdminClient.from('distributors').update(patch).eq('id', id).select('id').single())
  await writeAudit(user, 'distributor_updated', 'distributors', id, { fields: Object.keys(patch) })
  return getDistributor(id, user)
}

export async function archiveDistributor(id: string, archived: boolean, user: UserContext) {
  requireOperationRole(user, writeRoles)
  assertNoError(await supabaseAdminClient.from('distributors').update({
    operational_status: archived ? 'archived' : 'active',
    archived_at: archived ? new Date().toISOString() : null,
    updated_by: user.userId,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id').single())
  await writeAudit(user, archived ? 'distributor_archived' : 'distributor_restored', 'distributors', id, {})
  return getDistributor(id, user)
}

export async function listDistributorContacts(distributorId: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getDistributor(distributorId, user)
  const result = await supabaseAdminClient
    .from('distributor_contacts')
    .select('id,distributor_id,name,role_title,email,phone,is_primary,active,created_at,updated_at')
    .eq('distributor_id', distributorId)
    .order('is_primary', { ascending: false })
  return { data: (assertNoError<ContactRow[]>(result).data ?? []).map(mapContact) }
}

export async function createDistributorContact(distributorId: string, payload: CreateDistributorContactPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await getDistributor(distributorId, user)
  const result = await supabaseAdminClient
    .from('distributor_contacts')
    .insert({
      distributor_id: distributorId,
      name: payload.name,
      role_title: payload.roleTitle ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      is_primary: payload.isPrimary ?? false,
      active: payload.active ?? true,
      metadata: payload.metadata ?? {},
      created_by: user.userId,
      updated_by: user.userId,
    })
    .select('id,distributor_id,name,role_title,email,phone,is_primary,active,created_at,updated_at')
    .single()
  const row = assertNoError<ContactRow>(result).data
  await writeAudit(user, 'distributor_contact_created', 'distributor_contacts', row.id, { distributor_id: distributorId })
  return { data: mapContact(row) }
}

export async function patchDistributorContact(distributorId: string, contactId: string, payload: PatchDistributorContactPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.name !== undefined) patch.name = payload.name
  if (payload.roleTitle !== undefined) patch.role_title = payload.roleTitle
  if (payload.email !== undefined) patch.email = payload.email
  if (payload.phone !== undefined) patch.phone = payload.phone
  if (payload.isPrimary !== undefined) patch.is_primary = payload.isPrimary
  if (payload.active !== undefined) patch.active = payload.active
  if (payload.metadata !== undefined) patch.metadata = payload.metadata
  const result = await supabaseAdminClient
    .from('distributor_contacts')
    .update(patch)
    .eq('id', contactId)
    .eq('distributor_id', distributorId)
    .select('id,distributor_id,name,role_title,email,phone,is_primary,active,created_at,updated_at')
    .single()
  const row = assertNoError<ContactRow>(result).data
  await writeAudit(user, 'distributor_contact_updated', 'distributor_contacts', row.id, { fields: Object.keys(patch) })
  return { data: mapContact(row) }
}

export async function deactivateDistributorContact(distributorId: string, contactId: string, user: UserContext) {
  return patchDistributorContact(distributorId, contactId, { active: false }, user)
}

export async function listDistributorOrders(query: DistributorOrderListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyOrderFilters(
    supabaseAdminClient
      .from('distributor_orders')
      .select(orderSelect, { count: 'exact' })
      .order('created_at', { ascending: false }),
    query,
  ).range(from, to)
  return {
    data: (assertNoError<DistributorOrderRow[]>(result).data ?? []).map(mapDistributorOrder),
    count: result.count ?? 0,
  }
}

export async function getDistributorOrder(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('distributor_orders').select(orderSelect).eq('id', id).maybeSingle()
  const row = assertNoError<DistributorOrderRow | null>(result).data
  if (!row) throw httpError(404, 'Pedido de distribuidor no encontrado')
  return { data: mapDistributorOrder(row) }
}

export async function createDistributorOrder(payload: CreateDistributorOrderPayload, user: UserContext) {
  requireOperationRole(user, financeWriteRoles)
  const result = await rpcClient(user).rpc('create_distributor_order', {
    p_distributor_id: payload.distributorId,
    p_items: payload.items,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getDistributorOrder(String(result.data), user)
}

export async function patchDistributorOrder(id: string, payload: PatchDistributorOrderPayload, user: UserContext) {
  requireOperationRole(user, financeWriteRoles)
  assertNoError(await supabaseAdminClient.from('distributor_orders').update({
    metadata: payload.metadata ?? {},
    updated_by: user.userId,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id').single())
  await writeAudit(user, 'distributor_order_updated', 'distributor_orders', id, { fields: ['metadata'] })
  return getDistributorOrder(id, user)
}

export async function runDistributorOrderAction(id: string, action: 'approve' | 'reject' | 'prepare' | 'ship' | 'deliver' | 'cancel', reason: string | null | undefined, user: UserContext) {
  requireOperationRole(user, action === 'approve' || action === 'reject' ? financeWriteRoles : writeRoles)
  const client = rpcClient(user)
  const result =
    action === 'approve'
      ? await client.rpc('approve_distributor_order', { p_order_id: id })
      : action === 'reject'
        ? await client.rpc('reject_distributor_order', { p_order_id: id, p_reason: reason ?? 'Rechazo autorizado' })
        : action === 'cancel'
          ? await cancelDistributorOrder(id, reason, user)
          : await client.rpc('fulfill_distributor_order', { p_order_id: id, p_next_status: action === 'prepare' ? 'preparing' : action === 'ship' ? 'shipped' : 'delivered' })
  if ('error' in result && result.error) normalizeDatabaseError(result.error)
  return getDistributorOrder(id, user)
}

async function cancelDistributorOrder(id: string, reason: string | null | undefined, user: UserContext) {
  assertNoError(await supabaseAdminClient.from('distributor_orders').update({
    order_status_text: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason ?? 'Cancelación autorizada',
    updated_by: user.userId,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id').single())
  await writeAudit(user, 'distributor_order_cancelled', 'distributor_orders', id, { reason: reason ?? null })
  return { data: id, error: null }
}

export async function listDistributorOrderItems(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getDistributorOrder(id, user)
  const result = await supabaseAdminClient
    .from('distributor_order_items')
    .select('id,distributor_order_id,sku_snapshot,name_snapshot,quantity,unit_price,subtotal')
    .eq('distributor_order_id', id)
    .order('created_at', { ascending: true })
  return {
    data: (assertNoError<DistributorOrderItemRow[]>(result).data ?? []).map((row) => ({
      id: row.id,
      distributorOrderId: row.distributor_order_id,
      skuSnapshot: row.sku_snapshot ?? null,
      nameSnapshot: row.name_snapshot,
      quantity: row.quantity,
      unitPrice: toNumber(row.unit_price),
      subtotal: toNumber(row.subtotal),
    })),
  }
}

export async function exportDistributors(query: DistributorListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listDistributors({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['distributor_number', 'name', 'zone', 'status', 'contact', 'created_at']
  const rows = data.map((item) => [item.distributorNumber ?? '', item.name, item.zone ?? '', item.status, item.contactName ?? '', item.createdAt])
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function exportDistributorOrders(query: DistributorOrderListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listDistributorOrders({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['order_number', 'distributor', 'status', 'total', 'created_at', 'delivered_at']
  const rows = data.map((item) => [item.orderNumber, item.distributorName ?? '', item.status, String(item.total), item.createdAt, item.deliveredAt ?? ''])
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
