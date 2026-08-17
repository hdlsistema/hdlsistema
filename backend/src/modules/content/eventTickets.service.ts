import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, httpError, type UserContext } from '../operations/operationErrors'
import { canAccessContent } from './content.permissions'
import type { CreateEventTicketTypePayload, PatchEventTicketTypePayload } from './eventTickets.schemas'

const ticketSelect = `
  id,event_id,name,description,price,capacity,sold_count,reserved_count,sales_start_at,sales_end_at,
  active,status,visible_in_app,sort_order,publish_at,unpublish_at,published_at,created_at,updated_at
`

type EventRow = {
  id: string
  capacity: number
  sold_count: number
  reserved_count?: number | null
  deleted_at?: string | null
}

type TicketRow = {
  id: string
  event_id: string
  name: string
  capacity: number
  sold_count: number
  reserved_count?: number | null
}

function requirePermission(user: UserContext, action: 'read' | 'create' | 'update' | 'delete') {
  if (!canAccessContent(user.roles, 'event', action)) throw httpError(403, 'Permisos insuficientes')
}

async function getEvent(eventId: string) {
  const result = await supabaseAdminClient
    .from('events')
    .select('id,capacity,sold_count,reserved_count,deleted_at')
    .eq('id', eventId)
    .is('deleted_at', null)
    .maybeSingle()
  const event = assertNoError<EventRow | null>(result).data
  if (!event) throw httpError(404, 'Evento no encontrado')
  return event
}

async function getTicket(eventId: string, ticketId: string) {
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .select(ticketSelect)
    .eq('id', ticketId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .maybeSingle()
  const ticket = assertNoError<TicketRow | null>(result).data
  if (!ticket) throw httpError(404, 'Tipo de boleto no encontrado')
  return ticket
}

function assertCapacity(capacity: number, ticket?: TicketRow | null) {
  const committed = Number(ticket?.sold_count ?? 0) + Number(ticket?.reserved_count ?? 0)
  if (capacity < committed) throw httpError(422, 'La capacidad no puede ser menor que los boletos vendidos o reservados')
}

export async function listEventTicketTypes(eventId: string, user: UserContext) {
  requirePermission(user, 'read')
  await getEvent(eventId)
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .select(ticketSelect)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  return { data: assertNoError<TicketRow[]>(result).data ?? [] }
}

export async function createEventTicketType(eventId: string, payload: CreateEventTicketTypePayload, user: UserContext) {
  requirePermission(user, 'create')
  await getEvent(eventId)
  assertCapacity(payload.capacity)
  const now = new Date().toISOString()
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .insert({
      event_id: eventId,
      ...payload,
      sold_count: 0,
      reserved_count: 0,
      published_at: payload.status === 'published' ? now : null,
      published_by: payload.status === 'published' ? user.userId ?? null : null,
      created_by: user.userId ?? null,
      updated_by: user.userId ?? null,
    })
    .select(ticketSelect)
    .single()
  const ticket = assertNoError<TicketRow>(result).data
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'event_ticket_type_created',
    entity_type: 'event_ticket_types',
    entity_id: ticket.id,
    after_data: { eventId, name: ticket.name },
  })
  return { data: ticket }
}

export async function updateEventTicketType(eventId: string, ticketId: string, payload: PatchEventTicketTypePayload, user: UserContext) {
  requirePermission(user, 'update')
  await getEvent(eventId)
  const current = await getTicket(eventId, ticketId)
  if (payload.capacity !== undefined) assertCapacity(payload.capacity, current)
  const patch: Record<string, unknown> = {
    ...payload,
    updated_by: user.userId ?? null,
    updated_at: new Date().toISOString(),
  }
  if (payload.status === 'published') {
    patch.active = payload.active ?? true
    patch.visible_in_app = payload.visible_in_app ?? true
    patch.published_at = new Date().toISOString()
    patch.published_by = user.userId ?? null
    patch.archived_at = null
  }
  if (payload.status === 'inactive' || payload.status === 'archived') {
    patch.active = false
    patch.visible_in_app = false
    if (payload.status === 'archived') patch.archived_at = new Date().toISOString()
  }
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .update(patch)
    .eq('id', ticketId)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .select(ticketSelect)
    .single()
  const ticket = assertNoError<TicketRow>(result).data
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'event_ticket_type_updated',
    entity_type: 'event_ticket_types',
    entity_id: ticket.id,
    after_data: { eventId, name: ticket.name },
  })
  return { data: ticket }
}

export async function removeEventTicketType(eventId: string, ticketId: string, user: UserContext) {
  requirePermission(user, 'delete')
  const ticket = await getTicket(eventId, ticketId)
  if (Number(ticket.sold_count ?? 0) + Number(ticket.reserved_count ?? 0) > 0) {
    throw httpError(422, 'No se puede retirar un tipo de boleto con ventas o reservas')
  }
  const now = new Date().toISOString()
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .update({
      status: 'archived',
      active: false,
      visible_in_app: false,
      archived_at: now,
      deleted_at: now,
      updated_by: user.userId ?? null,
      updated_at: now,
    })
    .eq('id', ticketId)
    .eq('event_id', eventId)
    .select(ticketSelect)
    .single()
  const removed = assertNoError<TicketRow>(result).data
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'event_ticket_type_removed',
    entity_type: 'event_ticket_types',
    entity_id: removed.id,
    after_data: { eventId, name: removed.name },
  })
  return { data: removed }
}
