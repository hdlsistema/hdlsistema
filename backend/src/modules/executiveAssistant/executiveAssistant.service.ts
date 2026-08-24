import { createHash } from 'node:crypto'
import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { getDashboardSummary } from '../dashboard/dashboard.service'
import { httpError, requireOperationRole, type UserContext } from '../operations/operationErrors'
import type { ExecutiveAssistantMessagePayload } from './executiveAssistant.schemas'

const executiveRoles = ['super_admin', 'admin']
const textModel = env.OPENAI_MODEL
const realtimeModel = 'gpt-realtime-2.1'

type Row = Record<string, unknown>
type QueryResult = { data: unknown; error: unknown }

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function countBy(rows: Row[], field: string) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const key = String(row[field] ?? 'sin_estado')
    result[key] = (result[key] ?? 0) + 1
    return result
  }, {})
}

function sum(rows: Row[], field: string) {
  return rows.reduce((total, row) => total + numberValue(row[field]), 0)
}

function totalsByCurrency(rows: Row[], field: string) {
  const totals = rows.reduce<Record<string, number>>((result, row) => {
    const currency = String(row.currency ?? 'MXN').toUpperCase()
    result[currency] = (result[currency] ?? 0) + numberValue(row[field])
    return result
  }, {})
  return totals
}

function mexicoDateKey(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function rowsCreatedToday(rows: Row[], dateKey: string) {
  return rows.filter((row) => mexicoDateKey(row.created_at) === dateKey)
}

function topItems(rows: Row[], limit = 5) {
  const totals = rows.reduce<Record<string, number>>((result, row) => {
    const name = String(row.name_snapshot ?? '').trim()
    if (!name) return result
    result[name] = (result[name] ?? 0) + numberValue(row.quantity)
    return result
  }, {})
  return Object.entries(totals)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name, 'es-MX'))
    .slice(0, limit)
}

async function safeRows(query: PromiseLike<QueryResult>): Promise<Row[]> {
  const result = await query
  if (result.error || !Array.isArray(result.data)) return []
  return result.data as Row[]
}

const assistantEventSelect = 'id,slug,title,subtitle,description,venue,start_at,end_at,capacity,sold_count,reserved_count,status,visible_in_app,sales_enabled,cover_image_url,created_at,updated_at'
const assistantExperienceSelect = 'id,slug,title,subtitle,description,location,capacity,base_price,status,visible_in_app,cover_image_url,created_at,updated_at'
const assistantTicketTypeSelect = 'id,event_id,name,price,capacity,sold_count,reserved_count,status,active,sales_enabled,created_at,updated_at,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)'
const assistantReservationSelect = 'id,reservation_number,reservation_type,experience_id,experience_slot_id,event_id,event_ticket_type_id,people_count,total,currency,status,source,created_at,updated_at,customers(display_name,first_name,last_name),experience_slots(start_at,end_at,capacity,reserved_count),experiences(id,title,cover_image_url,capacity),events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url),event_ticket_types(id,name,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url))'
const assistantOrderSelect = 'id,order_number,customer_id,reservation_id,subtotal,discount_total,tax_total,shipping_total,total,currency,status,source,paid_at,cancelled_at,fulfilled_at,requires_shipping,shipping_status,created_at,updated_at,customers(display_name,first_name,last_name,source,segment),reservations(id,reservation_number,reservation_type,people_count,status,source,total,currency,created_at,events(id,title,start_at,end_at,capacity),experiences(id,title,cover_image_url,capacity))'
const assistantOrderItemSelect = 'id,order_id,item_type,name_snapshot,sku_snapshot,quantity,unit_price,subtotal,created_at'
const assistantPaymentSelect = 'id,order_id,provider,amount,currency,status,payment_method_type,payment_reference,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,created_at,updated_at'
const assistantShipmentSelect = 'id,order_id,shipment_number,carrier,tracking_number,tracking_url,shipping_cost,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at'
const assistantPassSelect = 'id,reservation_id,order_id,event_ticket_type_id,pass_number,status,valid_from,valid_until,used_at,issued_at,revoked_at,revocation_reason,created_at,reservations(id,reservation_number,reservation_type,people_count,status,source,total,currency,created_at,customers(display_name,first_name,last_name),experience_slots(start_at,end_at,capacity,reserved_count),experiences(id,title,cover_image_url,capacity),events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)),orders(order_number,status,source,total,currency,created_at,customers(display_name,first_name,last_name)),event_ticket_types(id,name,capacity,sold_count,reserved_count,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url))'
const assistantCheckinSelect = 'id,access_pass_id,checked_in_by,checked_in_at,reversed_at,reversal_reason,created_at,access_passes(id,pass_number,status,valid_until,issued_at,reservation_id,order_id,event_ticket_type_id,reservations(id,reservation_number,reservation_type,people_count,status,source,total,currency,created_at,customers(display_name,first_name,last_name),experience_slots(start_at,end_at,capacity,reserved_count),experiences(id,title,cover_image_url,capacity),events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)),orders(order_number,status,source,total,currency,created_at,customers(display_name,first_name,last_name)),event_ticket_types(id,name,capacity,sold_count,reserved_count,events(id,title,start_at,end_at,capacity,sold_count,reserved_count,cover_image_url)))'

const assistantStopWords = new Set([
  'ahi', 'ahí', 'app', 'asi', 'así', 'busca', 'buscar', 'centro', 'como', 'con', 'control', 'cual', 'cuál',
  'cuando', 'cuándo', 'cuanta', 'cuánta', 'cuantas', 'cuántas', 'cuanto', 'cuánto', 'cuantos', 'cuántos',
  'ceo', 'dame', 'datos', 'del', 'direccion', 'dirección', 'director', 'directora', 'dime', 'donde', 'dónde', 'evento', 'eventos', 'han', 'hay', 'hoy', 'ingresado',
  'ingresaron', 'ingreso', 'ingresos', 'las', 'leido', 'leído', 'leidos', 'leídos', 'los', 'para', 'personas',
  'puede', 'puedes', 'que', 'qué', 'quien', 'quién', 'revisa', 'sobre', 'todo', 'una', 'ver',
])

function normalizeAssistantText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
}

function textField(row: Row | null | undefined, field: string) {
  const value = row?.[field]
  return typeof value === 'string' ? value.trim() : ''
}

function firstRelation(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === 'object' ? value[0] as Row : null
  return value && typeof value === 'object' ? value as Row : null
}

function displayPerson(row: Row | null | undefined) {
  const display = textField(row, 'display_name')
  const name = [textField(row, 'first_name'), textField(row, 'last_name')].filter(Boolean).join(' ')
  return display || name || 'Persona no identificada'
}

function preciseTerms(question: string) {
  const cleaned = normalizeAssistantText(question)
    .replace(/\b(?:ord|res|rst|pass|pay|ship|cot|quote|hdl|cust)-[a-z0-9-]+\b/g, ' ')
    .replace(/[^a-z0-9ñ]+/g, ' ')
  return Array.from(new Set(
    cleaned.split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !assistantStopWords.has(term)),
  )).slice(0, 8)
}

function preciseFolios(question: string) {
  const matches = question.match(/\b(?:ORD|RES|RST|PASS|PAY|SHIP|COT|QUOTE|HDL|CUST)-[A-Z0-9-]+\b/gi) ?? []
  return Array.from(new Set(matches.map((match) => match.toUpperCase())))
}

function matchesPreciseTerms(row: Row, terms: string[], fields: string[]) {
  if (!terms.length) return false
  const haystack = normalizeAssistantText(fields.map((field) => textField(row, field)).join(' '))
  return terms.every((term) => haystack.includes(term))
}

function rowKey(row: Row, fallback: number) {
  return String(row.id ?? row.pass_number ?? row.reservation_number ?? row.order_number ?? fallback)
}

function uniqueRows(rows: Row[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = rowKey(row, index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function ids(rows: Row[], field = 'id') {
  return Array.from(new Set(rows.map((row) => textField(row, field)).filter(Boolean)))
}

async function rowsByValues(table: string, select: string, column: string, values: string[]) {
  if (!values.length) return []
  return safeRows(supabaseAdminClient.from(table).select(select).in(column, values).limit(200))
}

function formatAssistantDateTime(value: unknown) {
  const date = new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) return 'sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(date)
}

function formatAssistantDate(value: unknown) {
  const date = new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) return 'sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(date)
}

function sourceLabel(value: unknown) {
  const raw = normalizeAssistantText(value).replace(/_/g, ' ')
  if (!raw) return 'sin origen'
  if (raw.includes('mobile') || raw.includes('app')) return 'App'
  if (raw.includes('web') || raw.includes('online')) return 'Web'
  if (raw.includes('manual') || raw.includes('control') || raw.includes('hacienda')) return 'Hacienda / manual'
  if (raw.includes('restaurant') || raw.includes('restaurante')) return 'Restaurante'
  return String(value)
}

function formatAssistantMoney(value: unknown, currency: unknown = 'MXN') {
  const code = String(currency ?? 'MXN').toUpperCase()
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: code }).format(numberValue(value))
}

function passEvent(pass: Row) {
  const reservation = firstRelation(pass.reservations)
  const ticketType = firstRelation(pass.event_ticket_types)
  return firstRelation(reservation?.events) ?? firstRelation(ticketType?.events) ?? firstRelation(reservation?.experiences)
}

function passCustomer(pass: Row) {
  const reservation = firstRelation(pass.reservations)
  const order = firstRelation(pass.orders)
  return firstRelation(reservation?.customers) ?? firstRelation(order?.customers)
}

async function profileNames(userIds: string[]) {
  const filtered = Array.from(new Set(userIds.filter(Boolean)))
  if (!filtered.length) return new Map<string, string>()
  const rows = await rowsByValues('profiles', 'id,first_name,last_name,display_name', 'id', filtered)
  return new Map(rows.map((row) => [textField(row, 'id'), displayPerson(row)]))
}

function isAttendanceQuestion(question: string) {
  return /ingres|entrada|check.?in|escane|qr|ocupaci|aforo|pase|boleto/.test(normalizeAssistantText(question))
}

async function assertExecutiveAccess(user: UserContext) {
  requireOperationRole(user, executiveRoles)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const { data, error } = await supabaseAdminClient
    .from('executive_ai_access')
    .select('active')
    .eq('user_id', user.userId)
    .eq('feature_code', 'executive_ai_assistant')
    .maybeSingle()
  if (error || !data?.active) throw httpError(403, 'Asistente ejecutiva no habilitada')
}

async function answerEventAttendanceQuestion(question: string) {
  if (!isAttendanceQuestion(question)) return null

  const terms = preciseTerms(question)
  const [events, experiences, reservations, ticketTypes, recentPasses, recentCheckins] = await Promise.all([
    safeRows(supabaseAdminClient.from('events').select(assistantEventSelect).order('start_at', { ascending: false }).limit(220)),
    safeRows(supabaseAdminClient.from('experiences').select(assistantExperienceSelect).order('created_at', { ascending: false }).limit(220)),
    safeRows(supabaseAdminClient.from('reservations').select(assistantReservationSelect).order('created_at', { ascending: false }).limit(320)),
    safeRows(supabaseAdminClient.from('event_ticket_types').select(assistantTicketTypeSelect).order('created_at', { ascending: false }).limit(320)),
    safeRows(supabaseAdminClient.from('access_passes').select(assistantPassSelect).order('created_at', { ascending: false }).limit(420)),
    safeRows(supabaseAdminClient.from('checkins').select(assistantCheckinSelect).order('checked_in_at', { ascending: false }).limit(420)),
  ])

  const matchedEvents = terms.length
    ? events.filter((row) => matchesPreciseTerms(row, terms, ['title', 'slug', 'subtitle', 'description', 'venue'])).slice(0, 5)
    : []
  const matchedExperiences = terms.length
    ? experiences.filter((row) => matchesPreciseTerms(row, terms, ['title', 'slug', 'subtitle', 'description', 'location'])).slice(0, 5)
    : []

  const eventIds = ids(matchedEvents)
  const experienceIds = ids(matchedExperiences)
  const matchingTicketTypes = ticketTypes.filter((row) => eventIds.includes(textField(row, 'event_id')))
  const ticketTypeIds = ids(matchingTicketTypes)
  const matchingReservations = reservations.filter((row) =>
    eventIds.includes(textField(row, 'event_id')) ||
    experienceIds.includes(textField(row, 'experience_id')) ||
    ticketTypeIds.includes(textField(row, 'event_ticket_type_id')),
  )
  const reservationIds = ids(matchingReservations)

  const targetedPasses = uniqueRows([
    ...recentPasses.filter((pass) =>
      reservationIds.includes(textField(pass, 'reservation_id')) ||
      ticketTypeIds.includes(textField(pass, 'event_ticket_type_id')) ||
      eventIds.includes(textField(passEvent(pass), 'id')) ||
      experienceIds.includes(textField(passEvent(pass), 'id')),
    ),
    ...await rowsByValues('access_passes', assistantPassSelect, 'reservation_id', reservationIds),
    ...await rowsByValues('access_passes', assistantPassSelect, 'event_ticket_type_id', ticketTypeIds),
  ])
  const targetedPassIds = ids(targetedPasses)
  const targetedCheckins = uniqueRows([
    ...recentCheckins.filter((checkin) => targetedPassIds.includes(textField(checkin, 'access_pass_id'))),
    ...await rowsByValues('checkins', assistantCheckinSelect, 'access_pass_id', targetedPassIds),
  ])
  const scopedPasses = terms.length ? targetedPasses : recentPasses
  const scopedPassIds = ids(scopedPasses)
  const scopedCheckins = terms.length
    ? targetedCheckins
    : recentCheckins.filter((checkin) => scopedPassIds.includes(textField(checkin, 'access_pass_id')) || !textField(checkin, 'access_pass_id'))

  if (terms.length && !matchedEvents.length && !matchedExperiences.length && !targetedPasses.length) {
    return `No encontré un evento, experiencia o pase que coincida con "${terms.join(' ')}". Revisé eventos, experiencias, reservaciones, tipos de boleto, pases QR y check-ins; no voy a inventar un conteo.`
  }

  const activePasses = scopedPasses.filter((pass) => {
    const status = normalizeAssistantText(pass.status)
    return !pass.revoked_at && !['revoked', 'cancelled', 'canceled', 'expired'].includes(status)
  })
  const activeCheckins = scopedCheckins.filter((checkin) => !checkin.reversed_at)
  const checkedPassIds = new Set(activeCheckins.map((checkin) => textField(checkin, 'access_pass_id')).filter(Boolean))
  const selectedEvent = matchedEvents[0] ?? firstRelation(matchingTicketTypes[0]?.events) ?? firstRelation(matchingReservations[0]?.events)
  const selectedExperience = matchedExperiences[0] ?? firstRelation(matchingReservations[0]?.experiences)
  const selectedTitle = textField(selectedEvent, 'title') || textField(selectedExperience, 'title') || (terms.length ? terms.join(' ') : 'entradas registradas')
  const selectedCapacity =
    numberValue(selectedEvent?.capacity) ||
    numberValue(selectedExperience?.capacity) ||
    matchingTicketTypes.reduce((total, row) => total + numberValue(row.capacity), 0) ||
    matchingReservations.reduce((total, row) => total + numberValue(row.people_count), 0)
  const enteredQr = checkedPassIds.size
  const activeQr = activePasses.length
  const pendingQr = Math.max(activeQr - enteredQr, 0)
  const denominator = selectedCapacity || activeQr
  const occupancy = denominator > 0 ? Math.round((enteredQr / denominator) * 100) : 0
  const operatorMap = await profileNames(activeCheckins.map((checkin) => textField(checkin, 'checked_in_by')))
  const latest = [...activeCheckins]
    .sort((left, right) => new Date(String(right.checked_in_at ?? right.created_at ?? '')).getTime() - new Date(String(left.checked_in_at ?? left.created_at ?? '')).getTime())
    .slice(0, 5)
    .map((checkin) => {
      const pass = firstRelation(checkin.access_passes)
      const customer = passCustomer(pass ?? {})
      const operator = operatorMap.get(textField(checkin, 'checked_in_by')) ?? 'operador no identificado'
      return `- ${formatAssistantDateTime(checkin.checked_in_at)}: ${textField(pass, 'pass_number') || 'QR sin folio'}, ${displayPerson(customer)}, registrado por ${operator}.`
    })

  const startAt = selectedEvent?.start_at ?? selectedExperience?.created_at
  const scope = terms.length ? `Para ${selectedTitle}` : 'En los pases localizados'
  const capacityText = selectedCapacity ? `cupo ${selectedCapacity}` : `${activeQr} QR activos`
  const latestText = latest.length ? `\n\nÚltimos ingresos:\n${latest.join('\n')}` : '\n\nTodavía no hay ingresos registrados para ese alcance.'
  const eventDate = startAt ? ` Fecha: ${formatAssistantDate(startAt)}.` : ''
  const personText = enteredQr === 1 ? 'persona' : 'personas'
  const pendingText = pendingQr === 1 ? 'pendiente' : 'pendientes'

  return `${scope}: han ingresado ${enteredQr} ${personText} por QR leído. Hay ${activeQr} pases activos, ${pendingQr} ${pendingText} y ${occupancy}% de ocupación sobre ${capacityText}.${eventDate}\n\nRevisé datos reales de Eventos/Experiencias, Reservaciones, Tipos de boleto, Pases QR y Check-ins.${latestText}`
}

function groupByField(rows: Row[], field: string) {
  return rows.reduce<Record<string, Row[]>>((result, row) => {
    const key = textField(row, field)
    if (!key) return result
    result[key] = [...(result[key] ?? []), row]
    return result
  }, {})
}

function reservationSubject(reservation: Row | null | undefined) {
  const ticketType = firstRelation(reservation?.event_ticket_types)
  return firstRelation(reservation?.events) ?? firstRelation(ticketType?.events) ?? firstRelation(reservation?.experiences)
}

function formatPaymentStatus(payment: Row) {
  const provider = textField(payment, 'provider') || 'pago'
  const status = textField(payment, 'status') || 'sin estado'
  const paidAt = payment.paid_at ? ` pagado ${formatAssistantDateTime(payment.paid_at)}` : ''
  const refunded = numberValue(payment.refunded_amount) > 0 ? `, reembolso ${formatAssistantMoney(payment.refunded_amount, payment.currency)}` : ''
  return `${provider}: ${status}, ${formatAssistantMoney(payment.amount, payment.currency)}${paidAt}${refunded}`
}

async function answerFolioQuestion(question: string) {
  const folios = preciseFolios(question)
  if (!folios.length) return null

  const orderFolios = folios.filter((folio) => folio.startsWith('ORD-'))
  const reservationFolios = folios.filter((folio) => folio.startsWith('RES-') || folio.startsWith('RST-'))
  const passFolios = folios.filter((folio) => folio.startsWith('PASS-'))
  const [orders, reservations, directPasses] = await Promise.all([
    rowsByValues('orders', assistantOrderSelect, 'order_number', orderFolios),
    rowsByValues('reservations', assistantReservationSelect, 'reservation_number', reservationFolios),
    rowsByValues('access_passes', assistantPassSelect, 'pass_number', passFolios),
  ])
  const orderIds = ids(orders)
  const reservationIds = ids(reservations)
  const [orderItems, payments, shipments, reservationPasses] = await Promise.all([
    rowsByValues('order_items', assistantOrderItemSelect, 'order_id', orderIds),
    rowsByValues('payments', assistantPaymentSelect, 'order_id', orderIds),
    rowsByValues('shipments', assistantShipmentSelect, 'order_id', orderIds),
    rowsByValues('access_passes', assistantPassSelect, 'reservation_id', reservationIds),
  ])
  const passes = uniqueRows([...directPasses, ...reservationPasses])
  const checkins = await rowsByValues('checkins', assistantCheckinSelect, 'access_pass_id', ids(passes))
  const itemsByOrder = groupByField(orderItems, 'order_id')
  const paymentsByOrder = groupByField(payments, 'order_id')
  const shipmentsByOrder = groupByField(shipments, 'order_id')
  const passesByReservation = groupByField(passes, 'reservation_id')
  const checkinsByPass = groupByField(checkins.filter((checkin) => !checkin.reversed_at), 'access_pass_id')
  const answers: string[] = []

  for (const order of orders) {
    const customer = firstRelation(order.customers)
    const relatedReservation = firstRelation(order.reservations)
    const items = itemsByOrder[textField(order, 'id')] ?? []
    const paymentRows = paymentsByOrder[textField(order, 'id')] ?? []
    const shipmentRows = shipmentsByOrder[textField(order, 'id')] ?? []
    const itemText = items.length
      ? items.slice(0, 5).map((item) => `${numberValue(item.quantity)} x ${textField(item, 'name_snapshot') || 'partida'} (${formatAssistantMoney(item.subtotal, order.currency)})`).join('; ')
      : 'sin partidas visibles'
    const paymentText = paymentRows.length ? paymentRows.map(formatPaymentStatus).join('; ') : 'sin pago registrado'
    const shipmentText = shipmentRows.length
      ? shipmentRows.map((shipment) => `${textField(shipment, 'carrier') || 'paquetería'} ${textField(shipment, 'tracking_number') || textField(shipment, 'shipment_number') || 'sin guía'}: ${textField(shipment, 'status_text') || 'sin estado'}`).join('; ')
      : order.requires_shipping ? 'sin envío asignado' : 'no requiere envío físico'
    const subject = reservationSubject(relatedReservation)
    const subjectText = subject ? `\nRelacionado con: ${textField(subject, 'title') || 'reservación'} (${textField(relatedReservation, 'reservation_number') || 'sin folio de reserva'}).` : ''
    answers.push(`Orden ${textField(order, 'order_number')}: cliente ${displayPerson(customer)}, origen ${sourceLabel(order.source)}, estado ${textField(order, 'status') || 'sin estado'}, total ${formatAssistantMoney(order.total, order.currency)}.${subjectText}\nPartidas: ${itemText}.\nPago: ${paymentText}.\nLogística: ${shipmentText}.`)
  }

  for (const reservation of reservations) {
    const customer = firstRelation(reservation.customers)
    const subject = reservationSubject(reservation)
    const passRows = passesByReservation[textField(reservation, 'id')] ?? []
    const entered = passRows.filter((pass) => (checkinsByPass[textField(pass, 'id')] ?? []).length > 0)
    const startAt = subject?.start_at ?? firstRelation(reservation.experience_slots)?.start_at ?? reservation.created_at
    answers.push(`Reservación ${textField(reservation, 'reservation_number')}: ${textField(subject, 'title') || 'sin experiencia/evento visible'}, cliente ${displayPerson(customer)}, origen ${sourceLabel(reservation.source)}, estado ${textField(reservation, 'status') || 'sin estado'}, ${numberValue(reservation.people_count)} personas, total ${formatAssistantMoney(reservation.total, reservation.currency)}, fecha ${formatAssistantDateTime(startAt)}.\nQR: ${entered.length} usados de ${passRows.length} pases activos.`)
  }

  for (const pass of directPasses) {
    const event = passEvent(pass)
    const reservation = firstRelation(pass.reservations)
    const customer = passCustomer(pass)
    const passCheckins = checkinsByPass[textField(pass, 'id')] ?? []
    const checkinText = passCheckins.length ? `usado ${formatAssistantDateTime(passCheckins[0].checked_in_at)}` : 'sin ingreso registrado'
    answers.push(`Pase ${textField(pass, 'pass_number')}: ${textField(event, 'title') || 'sin evento visible'}, cliente ${displayPerson(customer)}, reservación ${textField(reservation, 'reservation_number') || 'sin folio'}, estado ${textField(pass, 'status') || 'sin estado'}, válido hasta ${formatAssistantDateTime(pass.valid_until)}, ${checkinText}.`)
  }

  if (!answers.length) {
    return `No encontré registros para ${folios.join(', ')}. Revisé Órdenes, Reservaciones, Pases QR, Partidas, Pagos, Logística y Check-ins.`
  }

  return `${answers.join('\n\n')}\n\nConsulta local de solo lectura: Órdenes, Reservaciones, Pases QR, Partidas, Pagos, Logística y Check-ins.`
}

async function answerPreciseLocalQuestion(question: string) {
  return await answerEventAttendanceQuestion(question) ?? await answerFolioQuestion(question)
}

async function buildExecutiveSnapshot(user: UserContext) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
  const todayKey = mexicoDateKey(new Date())
  const [dashboard, reservations, orders, payments, orderItems, experiences, events, stays, units, shipments, campaigns, promotions, memberships, quotes, activity, inventory] = await Promise.all([
    getDashboardSummary(user),
    safeRows(supabaseAdminClient.from('reservations').select('status,reservation_type,people_count,total,currency,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('orders').select('status,total,currency,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('payments').select('status,amount,refunded_amount,currency,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('order_items').select('item_type,name_snapshot,quantity,subtotal,created_at').eq('item_type', 'wine').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('experiences').select('status,visible_in_app')),
    safeRows(supabaseAdminClient.from('events').select('title,status,visible_in_app,capacity,sold_count,start_at')),
    safeRows(supabaseAdminClient.from('lodging_stays').select('status,total,currency,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('lodging_units').select('status,operational_status,housekeeping_status')),
    safeRows(supabaseAdminClient.from('shipments').select('status_text,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('campaigns').select('status,channel,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('promotions').select('status,promotion_type,starts_at,ends_at')),
    safeRows(supabaseAdminClient.from('memberships').select('status,points_balance,created_at')),
    safeRows(supabaseAdminClient.from('quote_requests').select('status,event_category,source,guest_count,created_at').gte('created_at', since)),
    safeRows(supabaseAdminClient.from('customer_app_events').select('event_name,module,occurred_at').gte('occurred_at', since)),
    safeRows(supabaseAdminClient.from('inventory_items').select('quantity,reserved_quantity,reorder_point')),
  ])

  const todayReservations = rowsCreatedToday(reservations, todayKey)
  const todayOrders = rowsCreatedToday(orders, todayKey)
  const todayPayments = rowsCreatedToday(payments, todayKey)
  const todayQuotes = rowsCreatedToday(quotes, todayKey)
  const nextEvent = events
    .filter((row) => row.start_at && new Date(String(row.start_at)).getTime() >= Date.now())
    .sort((left, right) => new Date(String(left.start_at)).getTime() - new Date(String(right.start_at)).getTime())[0]

  return {
    generatedAt: new Date().toISOString(),
    privacy: 'Resumen agregado sin datos personales, folios ni registros individuales.',
    dashboard: dashboard.metrics,
    today: {
      date: todayKey,
      reservations: todayReservations.length,
      orders: todayOrders.length,
      orderValue: totalsByCurrency(todayOrders, 'total'),
      payments: todayPayments.length,
      collected: totalsByCurrency(todayPayments.filter((row) => ['paid', 'succeeded', 'completed'].includes(String(row.status))), 'amount'),
      quotes: todayQuotes.length,
    },
    last30Days: {
      reservations: { total: reservations.length, byStatus: countBy(reservations, 'status'), byType: countBy(reservations, 'reservation_type'), people: sum(reservations, 'people_count'), value: totalsByCurrency(reservations, 'total') },
      orders: { total: orders.length, byStatus: countBy(orders, 'status'), value: totalsByCurrency(orders, 'total') },
      payments: { total: payments.length, byStatus: countBy(payments, 'status'), collected: totalsByCurrency(payments, 'amount'), refunded: totalsByCurrency(payments, 'refunded_amount') },
      lodgingStays: { total: stays.length, byStatus: countBy(stays, 'status'), value: totalsByCurrency(stays, 'total') },
      logistics: { total: shipments.length, byStatus: countBy(shipments, 'status_text') },
      campaigns: { total: campaigns.length, byStatus: countBy(campaigns, 'status'), byChannel: countBy(campaigns, 'channel') },
      quotes: { total: quotes.length, byStatus: countBy(quotes, 'status'), byType: countBy(quotes, 'event_category'), bySource: countBy(quotes, 'source'), guests: sum(quotes, 'guest_count') },
      wineSales: { units: sum(orderItems, 'quantity'), topWines: topItems(orderItems) },
      appActivity: { total: activity.length, byModule: countBy(activity, 'module'), byEvent: countBy(activity, 'event_name') },
    },
    catalog: {
      experiences: { total: experiences.length, byStatus: countBy(experiences, 'status'), visibleInApp: experiences.filter((row) => row.visible_in_app === true).length },
      events: {
        total: events.length,
        byStatus: countBy(events, 'status'),
        visibleInApp: events.filter((row) => row.visible_in_app === true).length,
        capacity: sum(events, 'capacity'),
        sold: sum(events, 'sold_count'),
        next: nextEvent ? { title: String(nextEvent.title ?? 'Evento'), startAt: String(nextEvent.start_at), capacity: numberValue(nextEvent.capacity), sold: numberValue(nextEvent.sold_count) } : null,
      },
      promotions: { total: promotions.length, byStatus: countBy(promotions, 'status'), byType: countBy(promotions, 'promotion_type') },
    },
    operation: {
      lodgingUnits: { total: units.length, byStatus: countBy(units, 'status'), byOperation: countBy(units, 'operational_status'), byHousekeeping: countBy(units, 'housekeeping_status') },
      memberships: { total: memberships.length, byStatus: countBy(memberships, 'status'), pointsBalance: sum(memberships, 'points_balance') },
      inventory: {
        items: inventory.length,
        onHand: sum(inventory, 'quantity'),
        reserved: sum(inventory, 'reserved_quantity'),
        available: inventory.reduce((total, row) => total + Math.max(numberValue(row.quantity) - numberValue(row.reserved_quantity), 0), 0),
        lowAvailability: inventory.filter((row) => Math.max(numberValue(row.quantity) - numberValue(row.reserved_quantity), 0) <= numberValue(row.reorder_point)).length,
      },
    },
  }
}

async function createAudit(userId: string, mode: 'text' | 'voice') {
  const { data } = await supabaseAdminClient.from('executive_ai_queries').insert({ user_id: userId, query_mode: mode, model: mode === 'voice' ? realtimeModel : textModel }).select('id').single()
  return data?.id as string | undefined
}

async function completeAudit(id: string | undefined, status: 'completed' | 'failed', errorCode?: string) {
  if (!id) return
  await supabaseAdminClient.from('executive_ai_queries').update({ status, error_code: errorCode ?? null, completed_at: new Date().toISOString() }).eq('id', id)
}

function instructions(snapshot: unknown) {
  return `Eres Mi asistente, consejera ejecutiva privada de la dirección de Hacienda de Letras. Responde en español mexicano, con tono adulto, cálido, sereno, profesional y directo. Tu lectura operativa debe ser completa, pero sólo puedes afirmar lo contenido en el resumen agregado. Distingue hechos, riesgos y recomendaciones; nunca inventes datos. Si falta detalle individual, indica en qué módulo del Centro de Control debe revisarse. Cero emojis. No puedes crear, editar, confirmar, cancelar ni eliminar registros.\n\nRESUMEN OPERATIVO ACTUAL:\n${JSON.stringify(snapshot)}`
}

function formatMoneyTotals(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals ?? {})
  if (!entries.length) return '$0 MXN'
  return entries.map(([currency, value]) => `${new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)} ${currency}`).join(' y ')
}

function answerFromSnapshot(question: string, snapshot: Awaited<ReturnType<typeof buildExecutiveSnapshot>>) {
  const normalized = question.toLocaleLowerCase('es-MX')
  const dashboard = snapshot.dashboard
  const period = snapshot.last30Days
  if (/hoy|cómo vamos|como vamos|resumen del día|resumen del dia/.test(normalized)) {
    return `Corte de hoy: ${snapshot.today.reservations} reservaciones registradas, ${snapshot.today.orders} órdenes por ${formatMoneyTotals(snapshot.today.orderValue)}, ${snapshot.today.payments} pagos confirmados por ${formatMoneyTotals(snapshot.today.collected)} y ${snapshot.today.quotes} solicitudes de cotización. Además hay ${dashboard.pendingReservations} reservaciones pendientes y ${dashboard.pendingPaymentOrders} órdenes por cobrar.`
  }
  if (/cliente|usuario|registro/.test(normalized)) {
    return `Hay ${dashboard.customers} clientes registrados y ${dashboard.activeCustomersRecent} clientes con actividad durante los últimos 30 días.`
  }
  if (/próximo evento|proximo evento|evento viene|siguiente evento|qué evento|que evento/.test(normalized)) {
    const next = snapshot.catalog.events.next
    return next
      ? `El siguiente evento registrado es ${next.title}, programado para ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(next.startAt))}. Registra ${next.sold} lugares vendidos de una capacidad de ${next.capacity}.`
      : 'No hay un próximo evento con fecha futura en los datos publicados del Centro de Control.'
  }
  if (/reserv|experiencia|evento|cupo|ocupaci/.test(normalized)) {
    return `Actualmente hay ${dashboard.activeReservations} reservaciones activas: ${dashboard.confirmedReservations} confirmadas y ${dashboard.pendingReservations} pendientes. La ocupación futura registrada es de ${dashboard.occupancyRate}%. En los últimos 30 días se registraron ${period.reservations.total} reservaciones para ${period.reservations.people} personas.`
  }
  if (/venta|cobro|pago|ingreso|comercial/.test(normalized)) {
    return `El cobro registrado es ${formatMoneyTotals(Object.fromEntries(dashboard.collected.map((item) => [item.currency, item.amount])))} mediante ${dashboard.confirmedPayments} pagos confirmados. Hay ${dashboard.pendingPaymentOrders} órdenes pendientes de pago y ${period.orders.total} órdenes creadas en los últimos 30 días.`
  }
  if (/orden|pedido|entrega|logística|logistica|envío|envio/.test(normalized)) {
    return `En los últimos 30 días se registraron ${period.orders.total} órdenes y ${period.logistics.total} movimientos de logística. Estados de órdenes: ${JSON.stringify(period.orders.byStatus)}. Estados logísticos: ${JSON.stringify(period.logistics.byStatus)}.`
  }
  if (/vino.*vend|más vendido|mas vendido|botella.*vend/.test(normalized)) {
    const topWine = period.wineSales.topWines[0]
    return topWine
      ? `El vino con más unidades registradas en órdenes durante los últimos 30 días es ${topWine.name}, con ${topWine.quantity} unidades. En total se registraron ${period.wineSales.units} unidades de vino en ese periodo.`
      : 'No hay partidas de vino vendidas registradas durante los últimos 30 días.'
  }
  if (/inventario|existencia|stock|vino|botella/.test(normalized)) {
    const inventory = snapshot.operation.inventory
    return `El inventario registra ${inventory.items} partidas, ${inventory.onHand} unidades físicas, ${inventory.reserved} reservadas y ${inventory.available} disponibles. ${inventory.lowAvailability} partidas están en o por debajo de su punto de reposición.`
  }
  if (/cabaña|cabana|hosped|estancia|habitación|habitacion/.test(normalized)) {
    return `Hay ${snapshot.operation.lodgingUnits.total} unidades de hospedaje registradas y ${period.lodgingStays.total} estancias creadas en los últimos 30 días. Estados operativos de unidades: ${JSON.stringify(snapshot.operation.lodgingUnits.byOperation)}.`
  }
  if (/campaña|campana|promoci|marketing/.test(normalized)) {
    return `En los últimos 30 días se registraron ${period.campaigns.total} campañas. El catálogo contiene ${snapshot.catalog.promotions.total} promociones. Canales de campaña: ${JSON.stringify(period.campaigns.byChannel)}.`
  }
  if (/cotiz|celebra|solicitud/.test(normalized)) {
    return `En los últimos 30 días se registraron ${period.quotes.total} solicitudes de cotización para ${period.quotes.guests} invitados estimados. Estados: ${JSON.stringify(period.quotes.byStatus)}. Origen: ${JSON.stringify(period.quotes.bySource)}.`
  }
  if (/riesgo|atención|atencion|pendiente|hoy|resumen/.test(normalized)) {
    return `Lectura ejecutiva actual: ${dashboard.pendingReservations} reservaciones pendientes, ${dashboard.pendingPaymentOrders} órdenes por cobrar, ${snapshot.operation.inventory.lowAvailability} partidas de inventario en punto de reposición y ${period.quotes.total} cotizaciones recibidas en los últimos 30 días. Conviene revisar primero Reservaciones, Pagos e Inventario.`
  }
  return `La operación está disponible y actualizada. Hay ${dashboard.customers} clientes registrados, ${dashboard.activeReservations} reservaciones activas, ${dashboard.pendingPaymentOrders} órdenes por cobrar y una ocupación futura de ${dashboard.occupancyRate}%. Puedes preguntarme por clientes, reservaciones, cobros, inventario, hospedaje, logística, campañas o cotizaciones.`
}

export async function getExecutiveAssistantStatus(user: UserContext) {
  await assertExecutiveAccess(user)
  return { enabled: true, modes: ['text', 'voice'], readOnly: true }
}

export async function sendExecutiveAssistantMessage(payload: ExecutiveAssistantMessagePayload, user: UserContext) {
  await assertExecutiveAccess(user)
  const auditId = await createAudit(user.userId!, 'text')
  try {
    const preciseAnswer = await answerPreciseLocalQuestion(payload.message)
    if (preciseAnswer) {
      await completeAudit(auditId, 'completed')
      return { answer: preciseAnswer, generatedAt: new Date().toISOString(), mode: 'operational' as const }
    }
    const snapshot = await buildExecutiveSnapshot(user)
    if (!env.OPENAI_API_KEY) {
      const answer = answerFromSnapshot(payload.message, snapshot)
      await completeAudit(auditId, 'completed')
      return { answer, generatedAt: snapshot.generatedAt, mode: 'operational' as const }
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: textModel,
        temperature: 0.25,
        messages: [
          { role: 'system', content: instructions(snapshot) },
          ...payload.history,
          { role: 'user', content: payload.message },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!response.ok) throw new Error(`openai_${response.status}`)
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const answer = body.choices?.[0]?.message?.content?.trim()
    if (!answer) throw new Error('openai_empty_response')
    await completeAudit(auditId, 'completed')
    return { answer, generatedAt: snapshot.generatedAt }
  } catch (error) {
    await completeAudit(auditId, 'failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown')
    throw httpError(503, 'La asistente no pudo responder en este momento')
  }
}

export async function createExecutiveRealtimeSession(user: UserContext) {
  await assertExecutiveAccess(user)
  if (!env.OPENAI_API_KEY) throw httpError(503, 'Asistente ejecutiva no configurada')
  const auditId = await createAudit(user.userId!, 'voice')
  try {
    const snapshot = await buildExecutiveSnapshot(user)
    const safetyIdentifier = createHash('sha256').update(user.userId!).digest('hex')
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json', 'OpenAI-Safety-Identifier': safetyIdentifier },
      body: JSON.stringify({ session: { type: 'realtime', model: realtimeModel, audio: { output: { voice: 'marin' } }, instructions: `${instructions(snapshot)} Habla con ritmo ligeramente pausado y dicción clara.` } }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`realtime_${response.status}`)
    const body = await response.json() as { value?: string; expires_at?: number }
    if (!body.value) throw new Error('realtime_secret_missing')
    await completeAudit(auditId, 'completed')
    return { clientSecret: body.value, expiresAt: body.expires_at ?? null, generatedAt: snapshot.generatedAt }
  } catch (error) {
    await completeAudit(auditId, 'failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown')
    throw httpError(503, 'No fue posible iniciar la conversación por voz')
  }
}
