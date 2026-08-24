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
  CreateInventoryItemPayload,
  CreateInventoryLocationPayload,
  InventoryListQuery,
  MovementListQuery,
  PatchInventoryItemPayload,
  PatchInventoryLocationPayload,
} from './inventory.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']
const valueRoles = ['super_admin', 'admin', 'finance']
const exportRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']

type Relation<T> = T | T[] | null
type InventoryItemRow = {
  id: string
  wine_id: string
  location_id: string
  quantity: number
  reserved_quantity: number
  reorder_point: number
  sku?: string | null
  product_name?: string | null
  lot_code?: string | null
  unit_of_measure: string
  minimum_quantity: number
  maximum_quantity?: number | null
  unit_cost?: number | string | null
  status: string
  created_at: string
  updated_at: string
  wines?: Relation<{ sku: string; name: string; slug: string; cover_image_url?: string | null; price?: number | string | null; cost?: number | string | null }>
  inventory_locations?: Relation<{ name: string; code?: string | null; type: string }>
}
type LocationRow = {
  id: string
  name: string
  code?: string | null
  type: string
  address?: string | null
  active: boolean
  created_at: string
  updated_at?: string | null
}
type MovementRow = {
  id: string
  inventory_item_id: string
  movement_type: string
  quantity: number
  from_location_id?: string | null
  to_location_id?: string | null
  reference_type?: string | null
  reference_id?: string | null
  notes?: string | null
  reason?: string | null
  created_by?: string | null
  idempotency_key?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  inventory_items?: Relation<{
    sku?: string | null
    product_name?: string | null
    wines?: Relation<{ sku: string; name: string }>
    inventory_locations?: Relation<{ name: string }>
  }>
  from_location?: Relation<{ name: string; code?: string | null; type?: string | null }>
  to_location?: Relation<{ name: string; code?: string | null; type?: string | null }>
}
type ProfileRow = {
  id: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
}

const itemSelect = `
  id,wine_id,location_id,quantity,reserved_quantity,reorder_point,sku,product_name,lot_code,unit_of_measure,
  minimum_quantity,maximum_quantity,unit_cost,status,created_at,updated_at,
  wines(sku,name,slug,cover_image_url,price,cost),
  inventory_locations(name,code,type)
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

function canSeeCosts(user: UserContext) {
  return user.roles?.some((role) => valueRoles.includes(role)) ?? false
}

function mapItem(row: InventoryItemRow, showCosts: boolean) {
  const wine = first(row.wines)
  const location = first(row.inventory_locations)
  const onHand = row.quantity
  const reserved = row.reserved_quantity
  const available = onHand - reserved
  return {
    id: row.id,
    wineId: row.wine_id,
    wineName: wine?.name ?? row.product_name ?? 'Producto sin nombre',
    imageUrl: wine?.cover_image_url ?? null,
    sku: row.sku ?? wine?.sku ?? null,
    productName: row.product_name ?? wine?.name ?? null,
    lotCode: row.lot_code ?? null,
    locationId: row.location_id,
    locationName: location?.name ?? null,
    locationCode: location?.code ?? null,
    locationType: location?.type ?? null,
    unitOfMeasure: row.unit_of_measure,
    onHand,
    reserved,
    available,
    minimum: row.minimum_quantity ?? row.reorder_point,
    maximum: row.maximum_quantity ?? null,
    lowStock: available <= (row.minimum_quantity ?? row.reorder_point),
    status: row.status,
    unitCost: showCosts ? toNumber(row.unit_cost ?? wine?.cost) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLocation(row: LocationRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? null,
    type: row.type,
    address: row.address ?? null,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  }
}

function profileName(row: ProfileRow | null | undefined) {
  return row?.display_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() || null
}

async function loadActorNames(rows: MovementRow[]) {
  const actorIds = Array.from(new Set(rows.map((row) => row.created_by).filter((value): value is string => Boolean(value))))
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

function mapMovement(row: MovementRow, actorNames = new Map<string, string>()) {
  const item = first(row.inventory_items)
  const wine = first(item?.wines)
  const location = first(item?.inventory_locations)
  const fromLocation = first(row.from_location)
  const toLocation = first(row.to_location)
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    movementType: row.movement_type,
    quantity: row.quantity,
    referenceType: row.reference_type ?? null,
    referenceId: row.reference_id ?? null,
    product: item?.product_name ?? wine?.name ?? null,
    sku: item?.sku ?? wine?.sku ?? null,
    location: location?.name ?? null,
    fromLocationId: row.from_location_id ?? null,
    fromLocationName: fromLocation?.name ?? null,
    toLocationId: row.to_location_id ?? null,
    toLocationName: toLocation?.name ?? null,
    reason: row.reason ?? row.notes ?? null,
    actorUserId: row.created_by ?? null,
    actorName: row.created_by ? actorNames.get(row.created_by) ?? null : null,
    idempotencyKey: row.idempotency_key ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

function applyItemFilters(request: any, query: InventoryListQuery) {
  let next = request
  if (query.locationId) next = next.eq('location_id', query.locationId)
  if (query.wineId) next = next.eq('wine_id', query.wineId)
  if (query.sku) next = next.eq('sku', query.sku)
  if (query.status) next = next.eq('status', query.status)
  else next = next.neq('status', 'archived')
  if (query.withReservation !== undefined) next = query.withReservation ? next.gt('reserved_quantity', 0) : next.eq('reserved_quantity', 0)
  if (query.outOfStock) next = next.eq('quantity', 0)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`sku.ilike.%${safe}%,product_name.ilike.%${safe}%,lot_code.ilike.%${safe}%`)
  }
  return next
}

function applyMovementFilters(request: any, query: MovementListQuery) {
  let next = request
  if (query.inventoryItemId) next = next.eq('inventory_item_id', query.inventoryItemId)
  if (query.movementType) next = next.eq('movement_type', query.movementType)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  return next
}

export async function listInventory(query: InventoryListQuery, user: UserContext) {
  const items = await listInventoryItems(query, user)
  const locations = await listInventoryLocations(user)
  const movements = await listInventoryMovements({ page: 1, perPage: 25 }, user)
  return {
    data: {
      items: items.data,
      locations: locations.data,
      movements: movements.data,
      alerts: items.data.filter((item) => item.lowStock || item.available <= 0),
    },
  }
}

export async function listInventoryItems(query: InventoryListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyItemFilters(
    supabaseAdminClient
      .from('inventory_items')
      .select(itemSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  let rows = assertNoError<InventoryItemRow[]>(result).data ?? []
  if (query.lowStock) rows = rows.filter((row) => row.quantity - row.reserved_quantity <= (row.minimum_quantity ?? row.reorder_point))
  return {
    data: rows.map((row) => mapItem(row, canSeeCosts(user))),
    count: query.lowStock ? rows.length : result.count ?? rows.length,
  }
}

export async function getInventoryItem(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('inventory_items').select(itemSelect).eq('id', id).maybeSingle()
  const row = assertNoError<InventoryItemRow | null>(result).data
  if (!row) throw httpError(404, 'Inventario no encontrado')
  return { data: mapItem(row, canSeeCosts(user)) }
}

export async function createInventoryItem(payload: CreateInventoryItemPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('create_inventory_item', {
    p_wine_id: payload.wineId,
    p_location_id: payload.locationId,
    p_sku: payload.sku ?? null,
    p_product_name: payload.productName ?? null,
    p_minimum_quantity: payload.minimumQuantity,
    p_maximum_quantity: payload.maximumQuantity ?? null,
    p_unit_cost: payload.unitCost ?? null,
    p_lot_code: payload.lotCode ?? null,
    p_unit_of_measure: payload.unitOfMeasure,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getInventoryItem(String(result.data), user)
}

export async function patchInventoryItem(id: string, payload: PatchInventoryItemPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.sku !== undefined) patch.sku = payload.sku
  if (payload.productName !== undefined) patch.product_name = payload.productName
  if (payload.lotCode !== undefined) patch.lot_code = payload.lotCode
  if (payload.unitOfMeasure) patch.unit_of_measure = payload.unitOfMeasure
  if (payload.minimumQuantity !== undefined) {
    patch.minimum_quantity = payload.minimumQuantity
    patch.reorder_point = payload.minimumQuantity
  }
  if (payload.maximumQuantity !== undefined) patch.maximum_quantity = payload.maximumQuantity
  if (payload.unitCost !== undefined) patch.unit_cost = payload.unitCost
  if (payload.status) patch.status = payload.status
  if (payload.metadata) patch.metadata = payload.metadata
  assertNoError(await supabaseAdminClient.from('inventory_items').update(patch).eq('id', id).select('id').single())
  await writeAudit(user, 'inventory_item_updated', 'inventory_items', id, { fields: Object.keys(patch) })
  return getInventoryItem(id, user)
}

export async function listInventoryLocations(user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('inventory_locations')
    .select('id,name,code,type,address,active,created_at,updated_at')
    .order('name', { ascending: true })
  return { data: (assertNoError<LocationRow[]>(result).data ?? []).map(mapLocation) }
}

export async function createInventoryLocation(payload: CreateInventoryLocationPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('inventory_locations')
    .insert({
      name: payload.name,
      code: payload.code ?? null,
      type: payload.type,
      address: payload.address ?? null,
      active: payload.active ?? true,
      metadata: payload.metadata ?? {},
      created_by: user.userId,
      updated_by: user.userId,
    })
    .select('id,name,code,type,address,active,created_at,updated_at')
    .single()
  const row = assertNoError<LocationRow>(result).data
  await writeAudit(user, 'inventory_location_created', 'inventory_locations', row.id, { name: row.name })
  return { data: mapLocation(row) }
}

export async function patchInventoryLocation(id: string, payload: PatchInventoryLocationPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.name !== undefined) patch.name = payload.name
  if (payload.code !== undefined) patch.code = payload.code
  if (payload.type !== undefined) patch.type = payload.type
  if (payload.address !== undefined) patch.address = payload.address
  if (payload.active !== undefined) patch.active = payload.active
  if (payload.metadata !== undefined) patch.metadata = payload.metadata
  const result = await supabaseAdminClient
    .from('inventory_locations')
    .update(patch)
    .eq('id', id)
    .select('id,name,code,type,address,active,created_at,updated_at')
    .single()
  const row = assertNoError<LocationRow>(result).data
  await writeAudit(user, 'inventory_location_updated', 'inventory_locations', row.id, { fields: Object.keys(patch) })
  return { data: mapLocation(row) }
}

export async function listInventoryMovements(query: MovementListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyMovementFilters(
    supabaseAdminClient
      .from('inventory_movements')
      .select(`
        id,inventory_item_id,movement_type,quantity,from_location_id,to_location_id,reference_type,reference_id,notes,reason,created_by,idempotency_key,metadata,created_at,
        inventory_items(sku,product_name,wines(sku,name),inventory_locations(name)),
        from_location:inventory_locations!inventory_movements_from_location_id_fkey(name,code,type),
        to_location:inventory_locations!inventory_movements_to_location_id_fkey(name,code,type)
      `, { count: 'exact' })
      .order('created_at', { ascending: false }),
    query,
  ).range(from, to)
  const rows = assertNoError<MovementRow[]>(result).data ?? []
  const actorNames = await loadActorNames(rows)
  return {
    data: rows.map((row) => mapMovement(row, actorNames)),
    count: result.count ?? 0,
  }
}

export async function runInventoryRpc(kind: 'receive' | 'reserve' | 'release' | 'fulfill' | 'transfer' | 'adjust', payload: Record<string, unknown>, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const rpcNames = {
    receive: 'receive_inventory',
    reserve: 'reserve_inventory',
    release: 'release_inventory',
    fulfill: 'fulfill_inventory',
    transfer: 'transfer_inventory',
    adjust: 'adjust_inventory',
  } as const
  const result = await rpcClient(user).rpc(rpcNames[kind], payload)
  if (result.error) normalizeDatabaseError(result.error)
  return getInventoryItem(String(payload.p_inventory_item_id), user)
}

export async function exportInventory(query: InventoryListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listInventoryItems({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['sku', 'product', 'location', 'on_hand', 'reserved', 'available', 'minimum', 'status']
  const rows = data.map((item) => [
    item.sku ?? '',
    item.productName ?? item.wineName,
    item.locationName ?? '',
    String(item.onHand),
    String(item.reserved),
    String(item.available),
    String(item.minimum),
    item.status,
  ])
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function exportInventoryMovements(query: MovementListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listInventoryMovements({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['movement_number', 'type', 'product', 'location', 'quantity', 'reference', 'actor', 'created_at']
  const rows = data.map((item) => [item.id.slice(0, 8), item.movementType, item.product ?? '', item.location ?? item.fromLocationName ?? '', String(item.quantity), item.referenceType ?? '', item.actorName ?? 'No registrado', item.createdAt])
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
