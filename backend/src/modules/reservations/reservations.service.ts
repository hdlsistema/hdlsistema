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
  CreateReservationPayload,
  PatchReservationPayload,
  ReservationListQuery,
} from './reservations.schemas'
import { createCustomerNotification } from '../notifications/notifications.service'
import { ensureReservationAccessPasses, revokeReservationAccessPasses } from '../checkin/accessPassIssuer'
import {
  assertControlDataScopeRecord,
  controlDataScopeReservationOrFilter,
  noRowsId,
  type ControlDataScopeRecord,
} from '../admin/controlDataScope'

const readRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']
const exportRoles = ['super_admin', 'admin', 'operations', 'viewer']

function operationRpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

type ReservationRow = {
  id: string
  reservation_number: string
  customer_id: string
  user_id?: string | null
  reservation_type: string
  experience_id?: string | null
  event_id?: string | null
  experience_slot_id?: string | null
  cabin_package_id?: string | null
  restaurant_location_id?: string | null
  people_count: number
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
  currency: string
  status: string
  payment_status?: string | null
  payment_expires_at?: string | null
  customer_notes?: string | null
  internal_notes?: string | null
  metadata?: Record<string, unknown> | null
  reservation_date?: string | null
  reservation_time?: string | null
  check_in?: string | null
  check_out?: string | null
  occasion?: string | null
  source?: string | null
  booking_channel?: string | null
  operational_status?: string | null
  confirmed_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  rescheduled_at?: string | null
  created_at: string
  updated_at: string
  customers?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    source?: string | null
  } | Array<{
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
    source?: string | null
  }> | null
  experiences?: {
    id: string
    title: string
    slug: string
    location?: string | null
    metadata?: Record<string, unknown> | null
  } | Array<{
    id: string
    title: string
    slug: string
    location?: string | null
    metadata?: Record<string, unknown> | null
  }> | null
  events?: {
    id: string
    title: string
    slug?: string | null
    venue?: string | null
    metadata?: Record<string, unknown> | null
  } | Array<{
    id: string
    title: string
    slug?: string | null
    venue?: string | null
    metadata?: Record<string, unknown> | null
  }> | null
  experience_slots?: {
    id: string
    start_at: string
    end_at: string
    capacity: number
    reserved_count: number
    confirmed_count?: number | null
  } | Array<{
    id: string
    start_at: string
    end_at: string
    capacity: number
    reserved_count: number
    confirmed_count?: number | null
  }> | null
  cabin_packages?: {
    id: string
    name: string
    slug: string
  } | Array<{
    id: string
    name: string
    slug: string
  }> | null
  restaurant_locations?: {
    id: string
    name: string
    slug: string
    metadata?: Record<string, unknown> | null
  } | Array<{
    id: string
    name: string
    slug: string
    metadata?: Record<string, unknown> | null
  }> | null
}

type HistoryRow = {
  id: string
  reservation_id: string
  previous_status?: string | null
  new_status: string
  changed_by?: string | null
  notes?: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
}

const reservationSelect = `
  id,reservation_number,customer_id,user_id,reservation_type,experience_id,event_id,experience_slot_id,cabin_package_id,restaurant_location_id,
  people_count,subtotal,discount_total,tax_total,total,currency,status,payment_status,payment_expires_at,customer_notes,internal_notes,
  reservation_date,reservation_time,check_in,check_out,occasion,metadata,
  source,booking_channel,operational_status,confirmed_at,cancelled_at,cancellation_reason,
  rescheduled_at,created_at,updated_at,
  customers(id,first_name,last_name,email,phone,source),
  experiences(id,title,slug,location,metadata),
  events(id,title,slug,venue,metadata),
  experience_slots(id,start_at,end_at,capacity,reserved_count,confirmed_count),
  cabin_packages(id,name,slug),
  restaurant_locations(id,name,slug,metadata)
`

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function customerName(row: ReservationRow) {
  const customer = firstRelation(row.customers)
  return [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
}

function profileName(row: ProfileRow | null | undefined) {
  return row?.display_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() || null
}

async function loadActorNames(rows: HistoryRow[]) {
  const actorIds = Array.from(new Set(rows.map((row) => row.changed_by).filter((value): value is string => Boolean(value))))
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

function mapReservation(row: ReservationRow) {
  const customer = firstRelation(row.customers)
  const experience = firstRelation(row.experiences)
  const event = firstRelation(row.events)
  const slot = firstRelation(row.experience_slots)
  const cabin = firstRelation(row.cabin_packages)
  const restaurant = firstRelation(row.restaurant_locations)
  const confirmed = Number(slot?.confirmed_count ?? slot?.reserved_count ?? 0)
  const committed = Number(slot?.reserved_count ?? slot?.confirmed_count ?? 0)
  const capacity = Number(slot?.capacity ?? 0)
  const experienceTitle = row.reservation_type === 'cabin'
    ? cabin?.name ?? 'Cabaña'
    : row.reservation_type === 'restaurant'
      ? restaurant?.name ?? 'Restaurante'
      : row.reservation_type === 'event'
        ? event?.title ?? 'Evento'
        : experience?.title ?? 'Experiencia'
  return {
    id: row.id,
    reservationNumber: row.reservation_number,
    customerId: row.customer_id,
    userId: row.user_id ?? null,
    customerName: customerName(row),
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    reservationType: row.reservation_type,
    experienceId: row.experience_id ?? null,
    eventId: row.event_id ?? null,
    experienceTitle,
    experienceSlotId: row.experience_slot_id ?? null,
    startAt: slot?.start_at ?? null,
    endAt: slot?.end_at ?? null,
    reservationDate: row.reservation_date ?? null,
    reservationTime: row.reservation_time ?? null,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    occasion: row.occasion ?? null,
    cabinPackage: cabin ? { id: cabin.id, name: cabin.name, slug: cabin.slug } : null,
    restaurantLocation: restaurant ? { id: restaurant.id, name: restaurant.name, slug: restaurant.slug } : null,
    event: event ? { id: event.id, title: event.title, slug: event.slug ?? null, venue: event.venue ?? null } : null,
    peopleCount: row.people_count,
    subtotal: row.subtotal,
    total: row.total,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status ?? 'not_required',
    paymentExpiresAt: row.payment_expires_at ?? null,
    source: row.source ?? row.booking_channel ?? 'app',
    customerNotes: row.customer_notes ?? null,
    internalNotes: row.internal_notes ?? null,
    metadata: row.metadata ?? {},
    operationalStatus: row.operational_status ?? 'active',
    capacity,
    confirmed,
    available: Math.max(capacity - committed, 0),
    confirmedAt: row.confirmed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    rescheduledAt: row.rescheduled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function reservationScopeRecord(row: ReservationRow): ControlDataScopeRecord {
  const experience = firstRelation(row.experiences)
  const event = firstRelation(row.events)
  const restaurant = firstRelation(row.restaurant_locations)
  return {
    metadata: row.metadata,
    restaurantSlug: restaurant?.slug ?? null,
    restaurantName: restaurant?.name ?? null,
    restaurantMetadata: restaurant?.metadata ?? null,
    eventSlug: event?.slug ?? null,
    eventTitle: event?.title ?? null,
    eventVenue: event?.venue ?? null,
    eventMetadata: event?.metadata ?? null,
    experienceSlug: experience?.slug ?? null,
    experienceTitle: experience?.title ?? null,
    experienceLocation: experience?.location ?? null,
    experienceMetadata: experience?.metadata ?? null,
  }
}

function queueReservationStatusPush(
  reservation: ReturnType<typeof mapReservation>,
  event: 'created' | 'confirmed' | 'cancelled' | 'rescheduled' | 'updated',
) {
  const copy = event === 'confirmed'
    ? { title: 'Reservación confirmada', body: `Tu reservación ${reservation.reservationNumber} está confirmada.` }
    : event === 'cancelled'
      ? { title: 'Reservación cancelada', body: `La reservación ${reservation.reservationNumber} fue cancelada.` }
      : event === 'rescheduled'
        ? { title: 'Reservación reprogramada', body: `La reservación ${reservation.reservationNumber} tiene una nueva fecha u horario.` }
        : event === 'updated'
          ? { title: 'Reservación actualizada', body: `Actualizamos los datos de tu reservación ${reservation.reservationNumber}.` }
          : { title: 'Reservación registrada', body: `Registramos tu solicitud ${reservation.reservationNumber}.` }
  void createCustomerNotification({
    customerId: reservation.customerId,
    userId: reservation.userId,
    title: copy.title,
    body: copy.body,
    deepLink: `/app/reservacion?reservationId=${encodeURIComponent(reservation.id)}`,
    data: {
      type: `reservation_${event}`,
      reservationId: reservation.id,
      reservationNumber: reservation.reservationNumber,
      status: reservation.status,
    },
  }).catch(() => undefined)
}

async function syncReservationAccessPass(reservation: ReturnType<typeof mapReservation>) {
  const passes = await ensureReservationAccessPasses({
    id: reservation.id,
    status: reservation.status,
    reservationType: reservation.reservationType,
    peopleCount: reservation.peopleCount,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    reservationDate: reservation.reservationDate,
    reservationTime: reservation.reservationTime,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
  })
  return passes[0] ?? null
}

function matchesSearch(row: ReservationRow, search?: string) {
  if (!search) return true
  const target = normalizeText(search)
  return [
    row.reservation_number,
    customerName(row),
    firstRelation(row.customers)?.email ?? '',
    firstRelation(row.customers)?.phone ?? '',
    firstRelation(row.experiences)?.title ?? '',
    firstRelation(row.cabin_packages)?.name ?? '',
    firstRelation(row.restaurant_locations)?.name ?? '',
    row.source ?? '',
  ].some((value) => normalizeText(String(value)).includes(target))
}

function applyFilters(request: any, query: ReservationListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.experienceId) next = next.eq('experience_id', query.experienceId)
  if (query.customerId) next = next.eq('customer_id', query.customerId)
  if (query.reservationType) next = next.eq('reservation_type', query.reservationType)
  if (query.reservationNumber) next = next.eq('reservation_number', query.reservationNumber)
  if (query.source) next = next.eq('source', query.source)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  return next
}

export async function listReservations(query: ReservationListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  let request = applyFilters(
    supabaseAdminClient
      .from('reservations')
      .select(reservationSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  )
  const scopeFilter = await controlDataScopeReservationOrFilter(user)
  if (scopeFilter === false) request = request.eq('id', noRowsId())
  if (typeof scopeFilter === 'string') request = request.or(scopeFilter)
  request = request.range(from, to)

  const result = await request
  const rows = (assertNoError<ReservationRow[]>(result).data ?? []).filter((row) => matchesSearch(row, query.search))
  return {
    data: rows.map(mapReservation),
    count: query.search ? rows.length : result.count ?? rows.length,
  }
}

export async function getReservation(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('reservations')
    .select(reservationSelect)
    .eq('id', id)
    .maybeSingle()

  const row = assertNoError<ReservationRow | null>(result).data
  if (!row) throw httpError(404, 'Reservación no encontrada')
  await assertControlDataScopeRecord(user, reservationScopeRecord(row), 'Reservación no disponible para esta sede')
  return { data: mapReservation(row) }
}

export async function createReservation(payload: CreateReservationPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc('create_reservation_admin', {
    p_customer_id: payload.customerId ?? null,
    p_customer_name: payload.customerName ?? null,
    p_customer_email: payload.customerEmail ?? null,
    p_customer_phone: payload.customerPhone ?? null,
    p_experience_slot_id: payload.experienceSlotId,
    p_people_count: payload.peopleCount,
    p_status: payload.status,
    p_customer_notes: payload.customerNotes ?? null,
    p_internal_notes: payload.internalNotes ?? null,
    p_source: payload.source,
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  const response = await getReservation(String(result.data), user)
  await syncReservationAccessPass(response.data)
  queueReservationStatusPush(response.data, 'created')
  return response
}

export async function updateReservation(id: string, payload: PatchReservationPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await getReservation(id, user)
  const patch: Record<string, unknown> = {
    updated_by_admin: user.userId,
    updated_at: new Date().toISOString(),
  }
  if ('customerNotes' in payload) patch.customer_notes = payload.customerNotes ?? null
  if ('internalNotes' in payload) patch.internal_notes = payload.internalNotes ?? null
  if (payload.source) {
    patch.source = payload.source
    patch.booking_channel = payload.source
  }
  if (payload.metadata) patch.metadata = payload.metadata

  const result = await supabaseAdminClient
    .from('reservations')
    .update(patch)
    .eq('id', id)
    .select(reservationSelect)
    .single()

  const row = assertNoError<ReservationRow>(result).data
  await assertControlDataScopeRecord(user, reservationScopeRecord(row), 'Reservación no disponible para esta sede')
  return { data: mapReservation(row) }
}

async function runReservationRpc(name: string, args: Record<string, unknown>, id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc(name, { p_reservation_id: id, ...args })
  if (result.error) normalizeDatabaseError(result.error)
  return getReservation(id, user)
}

export async function confirmReservation(id: string, user: UserContext) {
  const current = await getReservation(id, user)
  if (current.data.reservationType === 'experience' && current.data.paymentStatus !== 'not_required') {
    throw httpError(409, 'La reservación se confirma automáticamente cuando la orden queda pagada')
  }
  const response = await runReservationRpc('confirm_reservation', {}, id, user)
  await syncReservationAccessPass(response.data)
  queueReservationStatusPush(response.data, 'confirmed')
  return response
}

export async function cancelReservation(id: string, reason: string | null | undefined, user: UserContext) {
  const current = await getReservation(id, user)
  if (current.data.reservationType === 'experience' && current.data.paymentStatus !== 'not_required') {
    throw httpError(409, current.data.paymentStatus === 'paid'
      ? 'Primero registra el reembolso de la orden; la cancelación será automática'
      : 'Cancela la reservación pendiente desde la App para liberar el apartado de pago')
  }
  const response = await runReservationRpc('cancel_reservation', { p_reason: reason ?? null }, id, user)
  await revokeReservationAccessPasses(id, reason ?? 'reservation_cancelled')
  queueReservationStatusPush(response.data, 'cancelled')
  return response
}

export async function rescheduleReservation(id: string, newSlotId: string, user: UserContext) {
  const current = await getReservation(id, user)
  if (current.data.reservationType === 'experience' && current.data.paymentStatus !== 'not_required') {
    throw httpError(409, 'Reprograma la reservación pagada desde la App para mantener orden, cupo y acceso sincronizados')
  }
  const response = await runReservationRpc('reschedule_reservation', { p_new_slot_id: newSlotId }, id, user)
  await syncReservationAccessPass(response.data)
  queueReservationStatusPush(response.data, 'rescheduled')
  return response
}

export async function changeReservationPartySize(id: string, peopleCount: number, user: UserContext) {
  const current = await getReservation(id, user)
  if (current.data.reservationType === 'experience' && current.data.paymentStatus !== 'not_required') {
    throw httpError(409, 'El número de personas no puede cambiar sin recalcular la orden de pago')
  }
  const response = await runReservationRpc('update_reservation_people', { p_people_count: peopleCount }, id, user)
  await syncReservationAccessPass(response.data)
  queueReservationStatusPush(response.data, 'updated')
  return response
}

export async function addReservationNote(id: string, note: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const current = await getReservation(id, user)
  const currentNotes = current.data.internalNotes ? `${current.data.internalNotes}\n${note}` : note
  const updated = await updateReservation(id, { internalNotes: currentNotes }, user)
  await supabaseAdminClient.from('reservation_status_history').insert({
    reservation_id: id,
    previous_status: current.data.status,
    new_status: current.data.status,
    changed_by: user.userId,
    notes: 'Nota interna agregada',
  })
  return updated
}

export async function listReservationHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getReservation(id, user)
  const result = await supabaseAdminClient
    .from('reservation_status_history')
    .select('id,reservation_id,previous_status,new_status,changed_by,notes,created_at')
    .eq('reservation_id', id)
    .order('created_at', { ascending: true })

  const rows = assertNoError<HistoryRow[]>(result).data ?? []
  const actorNames = await loadActorNames(rows)
  return {
    data: rows.map((row) => ({
      id: row.id,
      reservationId: row.reservation_id,
      previousStatus: row.previous_status ?? null,
      newStatus: row.new_status,
      actorUserId: row.changed_by ?? null,
      actorName: row.changed_by ? actorNames.get(row.changed_by) ?? null : null,
      notes: row.notes ?? null,
      createdAt: row.created_at,
    })),
  }
}

export async function exportReservations(query: ReservationListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listReservations({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'reservation_number',
    'customer_name',
    'email',
    'phone',
    'experience',
    'date',
    'time',
    'people_count',
    'status',
    'source',
    'total',
    'created_at',
  ]
  const rows = data.map((item) => {
    const date = item.startAt ? item.startAt.slice(0, 10) : ''
    const time = item.startAt ? item.startAt.slice(11, 16) : ''
    return [
      item.reservationNumber,
      item.customerName,
      item.email ?? '',
      item.phone ?? '',
      item.experienceTitle,
      date,
      time,
      String(item.peopleCount),
      item.status,
      item.source,
      String(item.total),
      item.createdAt,
    ]
  })
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
