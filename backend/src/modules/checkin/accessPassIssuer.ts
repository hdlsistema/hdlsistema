import { createHash, randomUUID } from 'crypto'
import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError } from '../operations/operationErrors'

type Relation<T> = T | T[] | null

type ReservationAccessSource = {
  id: string
  status: string
  peopleCount?: number | null
  startAt?: string | null
  endAt?: string | null
}

type AccessPassRow = {
  id: string
  reservation_id?: string | null
  order_id?: string | null
  event_ticket_type_id?: string | null
  pass_number?: string | null
  qr_token_hash: string
  status: string
  valid_from?: string | null
  valid_until?: string | null
  used_at?: string | null
  issued_at?: string | null
  revoked_at?: string | null
  revocation_reason?: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
  reservations?: Relation<{
    reservation_number?: string | null
    people_count?: number | null
    status?: string | null
    experience_slots?: Relation<{ start_at?: string | null; end_at?: string | null }>
    experiences?: Relation<{ title?: string | null }>
    events?: Relation<{ title?: string | null; start_at?: string | null; end_at?: string | null }>
  }>
  orders?: Relation<{ order_number?: string | null; status?: string | null }>
  event_ticket_types?: Relation<{
    name?: string | null
    events?: Relation<{ title?: string | null; start_at?: string | null; end_at?: string | null }>
  }>
}

type OrderRow = {
  id: string
  customer_id: string
  user_id?: string | null
  status: string
}

type OrderItemRow = {
  id: string
  order_id: string
  item_type: string
  item_id: string
  quantity: number
  metadata?: Record<string, unknown> | null
}

const passSelect = `
  id,reservation_id,order_id,event_ticket_type_id,pass_number,qr_token_hash,status,valid_from,valid_until,
  used_at,issued_at,revoked_at,revocation_reason,created_at,metadata,
  reservations(reservation_number,people_count,status,experience_slots(start_at,end_at),experiences(title),events(title,start_at,end_at)),
  orders(order_number,status),
  event_ticket_types(name,events(title,start_at,end_at))
`

function first<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function hashCode(code: string) {
  return createHash('sha256').update(code.trim(), 'utf8').digest('hex')
}

function passToken(id: string) {
  return `hdl_pass_${id.replace(/-/g, '')}`
}

function passNumber() {
  return `PASS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function mapAccessPass(row: AccessPassRow) {
  const reservation = first(row.reservations)
  const slot = first(reservation?.experience_slots)
  const reservationExperience = first(reservation?.experiences)
  const reservationEvent = first(reservation?.events)
  const ticketType = first(row.event_ticket_types)
  const ticketEvent = first(ticketType?.events)
  const token = passToken(row.id)

  return {
    id: row.id,
    passNumber: row.pass_number ?? null,
    qrToken: token,
    qrPayload: token,
    status: row.status,
    accessType: row.reservation_id ? 'reservation' : 'event_ticket',
    reservationId: row.reservation_id ?? null,
    reservationNumber: reservation?.reservation_number ?? null,
    reservationStatus: reservation?.status ?? null,
    orderId: row.order_id ?? null,
    orderNumber: first(row.orders)?.order_number ?? null,
    eventTicketTypeId: row.event_ticket_type_id ?? null,
    ticketTypeName: ticketType?.name ?? null,
    title: reservationExperience?.title ?? reservationEvent?.title ?? ticketEvent?.title ?? null,
    startsAt: slot?.start_at ?? reservationEvent?.start_at ?? ticketEvent?.start_at ?? row.valid_from ?? null,
    endsAt: slot?.end_at ?? reservationEvent?.end_at ?? ticketEvent?.end_at ?? row.valid_until ?? null,
    peopleCount: reservation?.people_count ?? row.metadata?.peopleCount ?? null,
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
    usedAt: row.used_at ?? null,
    issuedAt: row.issued_at ?? row.created_at,
    revokedAt: row.revoked_at ?? null,
    revocationReason: row.revocation_reason ?? null,
  }
}

async function getAccessPassById(id: string) {
  const result = await supabaseAdminClient
    .from('access_passes')
    .select(passSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<AccessPassRow | null>(result).data
  return row ? mapAccessPass(row) : null
}

async function upsertAccessPass(payload: {
  reservationId?: string | null
  orderId?: string | null
  eventTicketTypeId?: string | null
  validFrom?: string | null
  validUntil?: string | null
  idempotencyKey: string
  metadata: Record<string, unknown>
}) {
  let existingRequest: any = supabaseAdminClient
    .from('access_passes')
    .select('id,qr_token_hash,status,revoked_at,metadata')

  if (payload.reservationId) {
    existingRequest = existingRequest.eq('reservation_id', payload.reservationId)
  } else if (payload.orderId && payload.eventTicketTypeId) {
    existingRequest = existingRequest
      .eq('order_id', payload.orderId)
      .eq('event_ticket_type_id', payload.eventTicketTypeId)
  } else {
    return null
  }

  const existingResult = await existingRequest
  const existingRows = assertNoError<Array<{ id: string; qr_token_hash: string; status: string; revoked_at?: string | null; metadata?: Record<string, unknown> | null }>>(existingResult).data ?? []
  const existing = payload.reservationId
    ? existingRows[0] ?? null
    : existingRows.find((row) => row.metadata?.idempotencyKey === payload.idempotencyKey) ?? null

  if (existing?.id) {
    const token = passToken(existing.id)
    const patch: Record<string, unknown> = {
      qr_token_hash: hashCode(token),
      valid_from: payload.validFrom ?? null,
      valid_until: payload.validUntil ?? null,
      metadata: { ...(existing.metadata ?? {}), ...payload.metadata, tokenStrategy: 'pass_id_v1' },
    }
    if (existing.revoked_at) {
      patch.status = 'published'
      patch.revoked_at = null
      patch.revocation_reason = null
    }
    await supabaseAdminClient.from('access_passes').update(patch).eq('id', existing.id)
    return getAccessPassById(existing.id)
  }

  const id = randomUUID()
  const insert = await supabaseAdminClient
    .from('access_passes')
    .insert({
      id,
      reservation_id: payload.reservationId ?? null,
      order_id: payload.orderId ?? null,
      event_ticket_type_id: payload.eventTicketTypeId ?? null,
      qr_token_hash: hashCode(passToken(id)),
      pass_number: passNumber(),
      status: 'published',
      valid_from: payload.validFrom ?? null,
      valid_until: payload.validUntil ?? null,
      issued_at: new Date().toISOString(),
      metadata: {
        ...payload.metadata,
        idempotencyKey: payload.idempotencyKey,
        tokenStrategy: 'pass_id_v1',
      },
    })
    .select('id')
    .single()
  const row = assertNoError<{ id: string }>(insert).data
  return getAccessPassById(row.id)
}

export async function ensureReservationAccessPass(reservation: ReservationAccessSource) {
  if (!['confirmed', 'completed'].includes(reservation.status)) return null
  return upsertAccessPass({
    reservationId: reservation.id,
    validFrom: reservation.startAt ?? null,
    validUntil: reservation.endAt ?? null,
    idempotencyKey: `reservation-access:${reservation.id}`,
    metadata: {
      accessType: 'experience_reservation',
      peopleCount: reservation.peopleCount ?? null,
    },
  })
}

export async function revokeReservationAccessPasses(reservationId: string, reason: string) {
  const result = await supabaseAdminClient
    .from('access_passes')
    .update({
      status: 'archived',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('reservation_id', reservationId)
    .is('revoked_at', null)
    .select('id')
  return assertNoError<Array<{ id: string }>>(result).data ?? []
}

export async function revokeOrderAccessPasses(orderId: string, reason: string) {
  const result = await supabaseAdminClient
    .from('access_passes')
    .update({
      status: 'archived',
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('order_id', orderId)
    .is('revoked_at', null)
    .select('id')
  return assertNoError<Array<{ id: string }>>(result).data ?? []
}

export async function ensureEventTicketAccessPassesForPaidOrder(orderId: string) {
  const orderResult = await supabaseAdminClient
    .from('orders')
    .select('id,customer_id,user_id,status')
    .eq('id', orderId)
    .maybeSingle()
  const order = assertNoError<OrderRow | null>(orderResult).data
  if (!order || !['paid', 'fulfilled'].includes(order.status)) return []

  const itemsResult = await supabaseAdminClient
    .from('order_items')
    .select('id,order_id,item_type,item_id,quantity,metadata')
    .eq('order_id', order.id)
    .eq('item_type', 'event_ticket')
  const items = assertNoError<OrderItemRow[]>(itemsResult).data ?? []
  const passes = []

  for (const item of items) {
    const eventStartsAt = typeof item.metadata?.eventStartsAt === 'string' ? item.metadata.eventStartsAt : null
    for (let index = 1; index <= Number(item.quantity ?? 0); index += 1) {
      const pass = await upsertAccessPass({
        orderId: order.id,
        eventTicketTypeId: item.item_id,
        validFrom: eventStartsAt,
        validUntil: null,
        idempotencyKey: `event-ticket-access:${order.id}:${item.id}:${index}`,
        metadata: {
          accessType: 'event_ticket',
          ticketSequence: index,
          orderItemId: item.id,
          customerId: order.customer_id,
          userId: order.user_id ?? null,
        },
      })
      if (pass) passes.push(pass)
    }
  }

  return passes
}

export async function listCustomerAccessPasses(customerId: string, userId: string) {
  const [reservationsResult, ordersResult] = await Promise.all([
    supabaseAdminClient.from('reservations').select('id').eq('customer_id', customerId).eq('user_id', userId),
    supabaseAdminClient.from('orders').select('id').eq('customer_id', customerId).eq('user_id', userId),
  ])
  const reservationIds = (assertNoError<Array<{ id: string }>>(reservationsResult).data ?? []).map((row) => row.id)
  const orderIds = (assertNoError<Array<{ id: string }>>(ordersResult).data ?? []).map((row) => row.id)

  if (!reservationIds.length && !orderIds.length) return { data: [] }

  let request: any = supabaseAdminClient.from('access_passes').select(passSelect)
  if (reservationIds.length && orderIds.length) {
    request = request.or(`reservation_id.in.(${reservationIds.join(',')}),order_id.in.(${orderIds.join(',')})`)
  } else if (reservationIds.length) {
    request = request.in('reservation_id', reservationIds)
  } else {
    request = request.in('order_id', orderIds)
  }
  const result = await request.order('created_at', { ascending: false })
  return { data: (assertNoError<AccessPassRow[]>(result).data ?? []).map(mapAccessPass) }
}
