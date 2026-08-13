import { createSupabaseUserRequestClient, supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { getReservation } from '../reservations/reservations.service'
import type {
  LodgingBlockPayload,
  LodgingCalendarQuery,
  LodgingCheckInPayload,
  LodgingCheckOutPayload,
  LodgingReservationPayload,
  LodgingReschedulePayload,
  LodgingUnitPatch,
  LodgingUnitPayload,
} from './lodging.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']

type Relation<T> = T | T[] | null
type UnitRow = {
  id: string
  cabin_package_id?: string | null
  code: string
  name: string
  description?: string | null
  capacity: number
  base_rate: number | string
  currency: string
  operational_status: string
  housekeeping_status: string
  cover_image_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  cabin_packages?: Relation<{ id: string; name: string; slug: string }>
}

type CalendarRow = {
  id: string
  unit_id: string
  reservation_id?: string | null
  entry_type: string
  start_date: string
  end_date: string
  status: string
  expires_at?: string | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
  lodging_units?: Relation<{ code: string; name: string }>
  reservations?: Relation<{
    reservation_number: string
    status: string
    people_count: number
    customers?: Relation<{ display_name?: string | null; first_name: string; last_name: string }>
  }>
}

type StayRow = {
  id: string
  reservation_id: string
  unit_id: string
  planned_check_in: string
  planned_check_out: string
  status: string
  guest_manifest?: unknown[] | null
  actual_check_in_at?: string | null
  actual_check_out_at?: string | null
  check_in_notes?: string | null
  check_out_notes?: string | null
  lodging_units?: Relation<{ code: string; name: string; housekeeping_status: string }>
  reservations?: Relation<{
    reservation_number: string
    status: string
    people_count: number
    check_in?: string | null
    check_out?: string | null
    customers?: Relation<{ display_name?: string | null; first_name: string; last_name: string; email?: string | null; phone?: string | null }>
    cabin_packages?: Relation<{ id: string; name: string }>
  }>
}

function first<T>(value: Relation<T> | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

const unitSelect = 'id,cabin_package_id,code,name,description,capacity,base_rate,currency,operational_status,housekeeping_status,cover_image_url,metadata,created_at,updated_at,cabin_packages(id,name,slug)'
const calendarSelect = 'id,unit_id,reservation_id,entry_type,start_date,end_date,status,expires_at,reason,metadata,lodging_units(code,name),reservations(reservation_number,status,people_count,customers(display_name,first_name,last_name))'
const staySelect = 'id,reservation_id,unit_id,planned_check_in,planned_check_out,status,guest_manifest,actual_check_in_at,actual_check_out_at,check_in_notes,check_out_notes,lodging_units(code,name,housekeeping_status),reservations(reservation_number,status,people_count,check_in,check_out,customers(display_name,first_name,last_name,email,phone),cabin_packages(id,name))'

function mapUnit(row: UnitRow) {
  const cabinPackage = first(row.cabin_packages)
  return {
    id: row.id,
    cabinPackageId: row.cabin_package_id ?? null,
    cabinPackageName: cabinPackage?.name ?? null,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    capacity: row.capacity,
    baseRate: Number(row.base_rate ?? 0),
    currency: row.currency,
    operationalStatus: row.operational_status,
    housekeepingStatus: row.housekeeping_status,
    coverImageUrl: row.cover_image_url ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCalendar(row: CalendarRow) {
  const unit = first(row.lodging_units)
  const reservation = first(row.reservations)
  const customer = first(reservation?.customers)
  return {
    id: row.id,
    unitId: row.unit_id,
    unitCode: unit?.code ?? '',
    unitName: unit?.name ?? 'Cabaña',
    reservationId: row.reservation_id ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    customerName: customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim() || null,
    peopleCount: reservation?.people_count ?? null,
    reservationStatus: reservation?.status ?? null,
    entryType: row.entry_type,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    reason: row.reason ?? null,
    metadata: row.metadata ?? {},
  }
}

function mapStay(row: StayRow) {
  const unit = first(row.lodging_units)
  const reservation = first(row.reservations)
  const customer = first(reservation?.customers)
  const cabinPackage = first(reservation?.cabin_packages)
  return {
    id: row.id,
    reservationId: row.reservation_id,
    reservationNumber: reservation?.reservation_number ?? null,
    customerName: customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim() || null,
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    peopleCount: reservation?.people_count ?? 0,
    reservationStatus: reservation?.status ?? null,
    cabinPackageId: cabinPackage?.id ?? null,
    cabinPackageName: cabinPackage?.name ?? null,
    unitId: row.unit_id,
    unitCode: unit?.code ?? '',
    unitName: unit?.name ?? 'Cabaña',
    housekeepingStatus: unit?.housekeeping_status ?? 'clean',
    plannedCheckIn: row.planned_check_in,
    plannedCheckOut: row.planned_check_out,
    status: row.status,
    guestManifest: row.guest_manifest ?? [],
    actualCheckInAt: row.actual_check_in_at ?? null,
    actualCheckOutAt: row.actual_check_out_at ?? null,
    checkInNotes: row.check_in_notes ?? null,
    checkOutNotes: row.check_out_notes ?? null,
  }
}

async function releaseExpiredHolds() {
  const result = await supabaseAdminClient.rpc('release_expired_lodging_holds')
  if (result.error) normalizeDatabaseError(result.error)
}

export async function listLodgingUnits(user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('lodging_units').select(unitSelect).order('code')
  return { data: (assertNoError<UnitRow[]>(result).data ?? []).map(mapUnit) }
}

export async function listLodgingPackages(user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('cabin_packages')
    .select('id,slug,name,subtitle,price,currency,min_guests,max_guests,nights,status,visible_in_app,cover_image_url')
    .is('deleted_at', null).order('sort_order')
  return { data: assertNoError<Array<Record<string, unknown>>>(result).data ?? [] }
}

export async function createLodgingUnit(payload: LodgingUnitPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient.from('lodging_units').insert({
    cabin_package_id: payload.cabinPackageId ?? null,
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    capacity: payload.capacity,
    base_rate: payload.baseRate,
    currency: payload.currency.toUpperCase(),
    operational_status: payload.operationalStatus,
    housekeeping_status: payload.housekeepingStatus,
    cover_image_url: payload.coverImageUrl ?? null,
    metadata: payload.metadata ?? {},
    created_by: user.userId,
    updated_by: user.userId,
  }).select(unitSelect).single()
  return { data: mapUnit(assertNoError<UnitRow>(result).data) }
}

export async function updateLodgingUnit(id: string, payload: LodgingUnitPatch, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if ('cabinPackageId' in payload) patch.cabin_package_id = payload.cabinPackageId ?? null
  if (payload.code) patch.code = payload.code
  if (payload.name) patch.name = payload.name
  if ('description' in payload) patch.description = payload.description ?? null
  if (payload.capacity !== undefined) patch.capacity = payload.capacity
  if (payload.baseRate !== undefined) patch.base_rate = payload.baseRate
  if (payload.currency) patch.currency = payload.currency.toUpperCase()
  if (payload.operationalStatus) patch.operational_status = payload.operationalStatus
  if (payload.housekeepingStatus) patch.housekeeping_status = payload.housekeepingStatus
  if ('coverImageUrl' in payload) patch.cover_image_url = payload.coverImageUrl ?? null
  if (payload.metadata) patch.metadata = payload.metadata
  const result = await supabaseAdminClient.from('lodging_units').update(patch).eq('id', id).select(unitSelect).single()
  return { data: mapUnit(assertNoError<UnitRow>(result).data) }
}

export async function getLodgingCalendar(query: LodgingCalendarQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  await releaseExpiredHolds()
  let request = supabaseAdminClient.from('lodging_calendar_entries').select(calendarSelect)
    .eq('status', 'active').lt('start_date', query.to).gt('end_date', query.from).order('start_date')
  if (query.unitId) request = request.eq('unit_id', query.unitId)
  const result = await request
  return { data: (assertNoError<CalendarRow[]>(result).data ?? []).map(mapCalendar) }
}

export async function listLodgingStays(user: UserContext) {
  requireOperationRole(user, readRoles)
  await releaseExpiredHolds()
  const result = await supabaseAdminClient.from('lodging_stays').select(staySelect)
    .order('planned_check_in', { ascending: true })
  return { data: (assertNoError<StayRow[]>(result).data ?? []).map(mapStay) }
}

export async function createLodgingReservation(payload: LodgingReservationPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('create_lodging_reservation_admin', {
    p_customer_id: payload.customerId ?? null,
    p_customer_name: payload.customerName ?? null,
    p_customer_email: payload.customerEmail ?? null,
    p_customer_phone: payload.customerPhone ?? null,
    p_cabin_package_id: payload.cabinPackageId,
    p_unit_id: payload.unitId ?? null,
    p_check_in: payload.checkIn,
    p_check_out: payload.checkOut,
    p_people_count: payload.peopleCount,
    p_status: payload.status,
    p_source: payload.source,
    p_customer_notes: payload.customerNotes ?? null,
    p_internal_notes: payload.internalNotes ?? null,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getReservation(String(result.data), user)
}

export async function rescheduleLodging(reservationId: string, payload: LodgingReschedulePayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('reschedule_lodging_reservation', {
    p_reservation_id: reservationId,
    p_check_in: payload.checkIn,
    p_check_out: payload.checkOut,
    p_unit_id: payload.unitId ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const stay = await supabaseAdminClient.from('lodging_stays').select(staySelect).eq('id', result.data).single()
  return { data: mapStay(assertNoError<StayRow>(stay).data) }
}

export async function blockLodgingUnit(payload: LodgingBlockPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('block_lodging_unit', {
    p_unit_id: payload.unitId,
    p_start_date: payload.startDate,
    p_end_date: payload.endDate,
    p_entry_type: payload.entryType,
    p_reason: payload.reason,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const entry = await supabaseAdminClient.from('lodging_calendar_entries').select(calendarSelect).eq('id', result.data).single()
  return { data: mapCalendar(assertNoError<CalendarRow>(entry).data) }
}

export async function releaseLodgingEntry(id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient.from('lodging_calendar_entries').update({
    status: 'released', released_by: user.userId, released_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id).is('reservation_id', null).select(calendarSelect).single()
  return { data: mapCalendar(assertNoError<CalendarRow>(result).data) }
}

export async function checkInLodging(reservationId: string, payload: LodgingCheckInPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('check_in_lodging_stay', {
    p_reservation_id: reservationId,
    p_guest_manifest: payload.guestManifest,
    p_notes: payload.notes ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const stay = await supabaseAdminClient.from('lodging_stays').select(staySelect).eq('id', result.data).single()
  return { data: mapStay(assertNoError<StayRow>(stay).data) }
}

export async function checkOutLodging(reservationId: string, payload: LodgingCheckOutPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('check_out_lodging_stay', {
    p_reservation_id: reservationId,
    p_notes: payload.notes ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const stay = await supabaseAdminClient.from('lodging_stays').select(staySelect).eq('id', result.data).single()
  return { data: mapStay(assertNoError<StayRow>(stay).data) }
}
