import { createHash } from 'node:crypto'
import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { plainAiResponse, plainAiResponseInstruction } from '../ai/plainText'
import { CONTROL_PERMISSION_CATALOG, CONTROL_SCOPE_CATALOG } from '../admin/controlPermissions'
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
const assistantCustomerSelect = 'id,customer_number,first_name,last_name,display_name,email,phone,source,segment,total_spend,total_visits,last_visit_at,status,marketing_email_consent,marketing_push_consent,preferred_language,created_at,updated_at'
const assistantCustomerIdentitySelect = 'id,user_id,customer_number,first_name,last_name,display_name,email,phone,source,segment,total_spend,total_visits,last_visit_at,status,marketing_email_consent,marketing_push_consent,preferred_language,created_at,updated_at'
const assistantOrderWithCustomerSelect = 'id,order_number,customer_id,reservation_id,subtotal,discount_total,tax_total,shipping_total,total,currency,status,source,paid_at,cancelled_at,fulfilled_at,requires_shipping,shipping_status,created_at,updated_at,customers(id,customer_number,display_name,first_name,last_name,email,phone,source,segment),reservations(id,reservation_number,reservation_type,people_count,status,source,total,currency,created_at,events(id,title,start_at,end_at,capacity),experiences(id,title,cover_image_url,capacity),restaurant_locations(id,name,slug))'
const assistantReservationWithCustomerSelect = 'id,reservation_number,customer_id,user_id,reservation_type,experience_id,event_id,experience_slot_id,cabin_package_id,restaurant_location_id,people_count,subtotal,discount_total,tax_total,total,currency,status,payment_status,reservation_date,reservation_time,check_in,check_out,source,booking_channel,operational_status,confirmed_at,cancelled_at,rescheduled_at,created_at,updated_at,customers(id,customer_number,display_name,first_name,last_name,email,phone,source,segment),experiences(id,title,slug,location,cover_image_url),events(id,title,slug,venue,start_at,end_at,capacity),experience_slots(id,start_at,end_at,capacity,reserved_count,confirmed_count),cabin_packages(id,name,slug),restaurant_locations(id,name,slug,metadata)'
const assistantInventorySelect = 'id,wine_id,location_id,quantity,reserved_quantity,reorder_point,sku,product_name,lot_code,unit_of_measure,minimum_quantity,maximum_quantity,unit_cost,status,created_at,updated_at,wines(sku,name,slug,cover_image_url,price,cost),inventory_locations(name,code,type)'
const assistantPromotionSelect = 'id,code,name,description,promotion_type,discount_type,discount_value,minimum_amount,maximum_discount,starts_at,ends_at,usage_limit,usage_per_customer,used_count,target_segment,status,created_at,updated_at'
const assistantPromotionRedemptionSelect = 'id,promotion_id,customer_id,reservation_id,order_id,amount,created_at,customers(display_name,first_name,last_name,email,phone),orders(order_number,total,currency,status,source),reservations(reservation_number,status,source,total,currency)'
const assistantQuoteSelect = 'id,quote_number,customer_id,user_id,event_category,event_type,preferred_date,preferred_start_time,preferred_end_time,guest_count,venue_space_name,food_required,food_type,wine_required,wine_option,requested_services,contact_first_name,contact_last_name,contact_email,contact_phone,company_name,status,source,assigned_to,contacted_at,quoted_at,closed_at,created_at,updated_at,customers(display_name,first_name,last_name,email,phone)'
const assistantMembershipSelect = 'id,customer_id,plan_id,membership_number,status,starts_at,ends_at,auto_renew,points_balance,created_at,updated_at,customers(display_name,first_name,last_name,email,phone),membership_plans(code,name,price,billing_period)'
const assistantCartSelect = 'id,user_id,customer_id,status,currency,created_at,updated_at,metadata,customers(display_name,first_name,last_name,email,phone),cart_items(id,cart_id,item_type,item_id,name_snapshot,quantity,unit_price_snapshot,currency,metadata,created_at,updated_at)'
const assistantAppEventSelect = 'id,customer_id,session_id,event_name,entity_type,entity_id,source,occurred_at,created_at,module,status,result,customers(display_name,first_name,last_name,email,phone)'
const assistantNotificationSelect = 'id,user_id,customer_id,channel,title,body,status,push_status,push_error_code,sent_at,read_at,created_at,customers(display_name,first_name,last_name,email,phone)'
const assistantNotificationDeviceSelect = 'id,user_id,platform,active,last_seen_at,created_at,updated_at'
const assistantWineSelect = 'id,sku,slug,name,subtitle,description,vintage,grape_variety,volume_ml,origin,price,stock_quantity,status,featured,cover_image_url,created_at,updated_at'
const assistantRestaurantLocationSelect = 'id,slug,name,description,full_address,city,state,phone,reservation_enabled,status,visible_in_app,cover_image_url,created_at,updated_at,metadata'
const assistantLodgingPackageSelect = 'id,slug,name,subtitle,description,price,currency,min_guests,max_guests,nights,status,visible_in_app,cover_image_url,created_at,updated_at'
const assistantVenueSpaceSelect = 'id,slug,name,description,capacity,dimensions,status,visible_in_app,cover_image_url,created_at,updated_at'

const assistantStopWords = new Set([
  'ahi', 'ahí', 'app', 'asi', 'así', 'busca', 'buscar', 'centro', 'como', 'con', 'control', 'cual', 'cuál',
  'cuando', 'cuándo', 'cuanta', 'cuánta', 'cuantas', 'cuántas', 'cuanto', 'cuánto', 'cuantos', 'cuántos',
  'ceo', 'conteo', 'cuenta', 'datos', 'del', 'direccion', 'dirección', 'director', 'directora', 'dame', 'dime',
  'donde', 'dónde', 'entrado', 'entrar', 'entraron', 'entro', 'evento', 'eventos', 'exacta', 'exacto', 'favor', 'han', 'hay', 'hoy', 'ingresado',
  'ingresaron', 'ingreso', 'ingresos', 'las', 'leido', 'leído', 'leidos', 'leídos', 'los', 'para', 'personas',
  'porfa', 'porfavor', 'precisa', 'preciso', 'puede', 'puedes', 'que', 'qué', 'quien', 'quién', 'revisa',
  'responde', 'respuesta', 'resumen', 'sin', 'sobre', 'todo', 'total', 'una', 'ver', 'asterisco', 'asteriscos',
  'asistencia', 'asistentes', 'ultima', 'ultimas', 'ultimo', 'ultimos',
])

const assistantEntityStopWords = new Set([
  ...assistantStopWords,
  'abrir', 'actual', 'asignar', 'asignada', 'asignadas', 'asignado', 'asignados', 'atencion', 'atención', 'cliente', 'clientes', 'compra', 'compras',
  'awaiting', 'comprado', 'compraron', 'consumida', 'consumidas', 'consumido', 'consumidos', 'consumo', 'consumos', 'cuales', 'cuáles', 'de', 'detalle', 'detalles', 'dentro', 'entrega',
  'entregas', 'enviado', 'enviados', 'enviada', 'enviadas', 'envio', 'envío', 'envios', 'envíos',
  'enviar', 'mandar', 'despachar', 'estado', 'estatus', 'falta', 'faltan', 'guia', 'guía', 'guias', 'guías', 'ha', 'han', 'has', 'hecho', 'hicieron',
  'historial', 'inventario', 'logistica', 'logística', 'mi', 'mis', 'modulo',
  'módulo', 'orden', 'ordenes', 'órdenes', 'pedido', 'pedidos', 'pending', 'pendiente', 'pendientes', 'preparation', 'preparacion',
  'preparación', 'preparar', 'preparando', 'quiere', 'realizado', 'realizadas', 'reservacion', 'reservación', 'shipping', 'shipment',
  'reservaciones', 'saber', 'son', 'stock', 'sus',
  'tenemos', 'tengo', 'tiene', 'tienen', 'venta', 'ventas',
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

function relationRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((row): row is Row => Boolean(row) && typeof row === 'object')
  return value && typeof value === 'object' ? [value as Row] : []
}

function metadataRow(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
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

function entityTerms(question: string) {
  const cleaned = normalizeAssistantText(question)
    .replace(/\b(?:ord|res|rst|pass|pay|ship|cot|quote|hdl|cust)-[a-z0-9-]+\b/g, ' ')
    .replace(/[^a-z0-9ñ@]+/g, ' ')
  return Array.from(new Set(
    cleaned.split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !assistantEntityStopWords.has(term)),
  )).slice(0, 10)
}

function contextualQuestion(question: string, history: ExecutiveAssistantMessagePayload['history'] = []) {
  const previous = [...history]
    .reverse()
    .find((entry) => entry.role === 'user')
    ?.content ?? ''
  return `${previous} ${question}`.trim()
}

function preciseFolios(question: string) {
  const matches = question.match(/\b(?:ORD|RES|RST|PASS|PAY|SHIP|COT|QUOTE|HDL|CUST)-[A-Z0-9-]+\b/gi) ?? []
  return Array.from(new Set(matches.map((match) => match.toUpperCase())))
}

function shouldUseAssistantContext(question: string) {
  const normalized = normalizeAssistantText(question)
  if (preciseFolios(question).length) return false
  if (/proximo|próximo|siguiente|hoy|manana|mañana|evento|eventos|inventario|pago|pagos|campana|campaña|reservacion|reservación|reservaciones/.test(normalized)) return false
  if (entityTerms(question).length) return false
  return /de que|de qué|cuales|cuáles|quienes|quiénes|detalle|detalles|clientes|ordenes|órdenes|guias|guías|son/.test(normalized)
}

function preciseTermScore(row: Row, terms: string[], fields: string[]) {
  const haystack = normalizeAssistantText(fields.map((field) => textField(row, field)).join(' '))
  return terms.filter((term) => haystack.includes(term)).length
}

function matchesPreciseTerms(row: Row, terms: string[], fields: string[]) {
  if (!terms.length) return false
  const score = preciseTermScore(row, terms, fields)
  const minimum = terms.length <= 2 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.6))
  return score >= minimum
}

function rankByPreciseTerms(rows: Row[], terms: string[], fields: string[]) {
  if (!terms.length) return []
  return rows
    .map((row) => ({ row, score: preciseTermScore(row, terms, fields) }))
    .filter((item) => item.score > 0 && matchesPreciseTerms(item.row, terms, fields))
    .sort((left, right) => right.score - left.score)
    .map((item) => item.row)
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
  return safeRows(supabaseAdminClient.from(table).select(select).in(column, values).limit(1000))
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
  return /ingres|entrad|entrar|entraron|entrado|entro|check.?in|escane|qr|ocupaci|aforo|asist|pase|boleto/.test(normalizeAssistantText(question))
}

function isNextEventQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  return /(proximo|siguiente).*(evento|experiencia)|(?:evento|experiencia).*(proximo|siguiente)/.test(normalized)
}

function isLastEventAttendanceQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  return (
    /(ultimo|ultima|ultimos|ultimas|reciente|recientes).*(evento|experiencia|entrada|ingreso|qr|pase|boleto|check)/.test(normalized) ||
    /(?:evento|experiencia|entrada|ingreso|qr|pase|boleto|check).*(ultimo|ultima|ultimos|ultimas|reciente|recientes)/.test(normalized)
  )
}

function isEventAttendanceQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  return (
    isAttendanceQuestion(question) &&
    /evento|eventos|experiencia|experiencias|reservacion|reservaciones|entrada|entradas|ingreso|ingresos|qr|pase|pases|boleto|boletos|check|ultimo|ultima|reciente/.test(normalized)
  )
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

async function answerNextEventQuestion(question: string) {
  if (!isNextEventQuestion(question)) return null

  const now = new Date().toISOString()
  const [events, experiences] = await Promise.all([
    safeRows(supabaseAdminClient.from('events').select(assistantEventSelect).gte('start_at', now).order('start_at', { ascending: true }).limit(12)),
    safeRows(supabaseAdminClient.from('experiences').select(assistantExperienceSelect).eq('visible_in_app', true).order('created_at', { ascending: false }).limit(12)),
  ])
  const usableEvents = events.filter((event) => !['archived', 'cancelled', 'canceled', 'draft'].includes(normalizeAssistantText(event.status)))
  const next = usableEvents[0]

  if (!next) {
    const visibleExperiences = experiences.filter((experience) => !['archived', 'cancelled', 'canceled', 'draft'].includes(normalizeAssistantText(experience.status)))
    const experienceLines = visibleExperiences.slice(0, 5).map((experience) =>
      `- ${textField(experience, 'title') || 'Experiencia sin nombre'}: ${textField(experience, 'location') || 'sin sede visible'}, cupo ${numberValue(experience.capacity)}, precio base ${formatAssistantMoney(experience.base_price, 'MXN')}.`,
    ).join('\n')
    return `No encontré eventos con fecha futura registrada en el Centro de Control. Experiencias visibles en app: ${visibleExperiences.length}.\n${experienceLines || '- No hay experiencias visibles con datos suficientes.'}\n\nConsulta local de solo lectura: Eventos y Experiencias.`
  }

  const upcomingLines = usableEvents.slice(0, 5).map((event) =>
    `- ${textField(event, 'title') || 'Evento sin nombre'}: ${formatAssistantDateTime(event.start_at)}, sede ${textField(event, 'venue') || 'sin sede visible'}, estado ${statusLabel(event.status)}, ${numberValue(event.sold_count)} vendidos de ${numberValue(event.capacity)} lugares.`,
  ).join('\n')

  return `El próximo evento registrado es ${textField(next, 'title') || 'Evento sin nombre'}, el ${formatAssistantDateTime(next.start_at)} en ${textField(next, 'venue') || 'sede no visible'}. Tiene ${numberValue(next.sold_count)} lugares vendidos de ${numberValue(next.capacity)} y está en estado ${statusLabel(next.status)}.\n\nPróximos eventos:\n${upcomingLines}\n\nConsulta local de solo lectura: Eventos.`
}

async function answerEventAttendanceQuestion(question: string) {
  if (!isAttendanceQuestion(question)) return null

  const lastEventRequested = isLastEventAttendanceQuestion(question)
  const terms = lastEventRequested ? [] : preciseTerms(question)
  const [events, experiences, reservations, ticketTypes, recentPasses, recentCheckins] = await Promise.all([
    safeRows(supabaseAdminClient.from('events').select(assistantEventSelect).order('start_at', { ascending: false }).limit(220)),
    safeRows(supabaseAdminClient.from('experiences').select(assistantExperienceSelect).order('created_at', { ascending: false }).limit(220)),
    safeRows(supabaseAdminClient.from('reservations').select(assistantReservationSelect).order('created_at', { ascending: false }).limit(320)),
    safeRows(supabaseAdminClient.from('event_ticket_types').select(assistantTicketTypeSelect).order('created_at', { ascending: false }).limit(320)),
    safeRows(supabaseAdminClient.from('access_passes').select(assistantPassSelect).order('created_at', { ascending: false }).limit(420)),
    safeRows(supabaseAdminClient.from('checkins').select(assistantCheckinSelect).order('checked_in_at', { ascending: false }).limit(420)),
  ])

  const usableEvents = events.filter((event) => !['archived', 'cancelled', 'canceled', 'draft'].includes(normalizeAssistantText(event.status)))
  const now = Date.now()
  const lastStartedEvent = [...usableEvents]
    .filter((event) => {
      const time = new Date(String(event.start_at ?? '')).getTime()
      return Number.isFinite(time) && time <= now
    })
    .sort((left, right) => new Date(String(right.start_at ?? '')).getTime() - new Date(String(left.start_at ?? '')).getTime())[0]
    ?? [...usableEvents].sort((left, right) => new Date(String(right.start_at ?? '')).getTime() - new Date(String(left.start_at ?? '')).getTime())[0]
  const matchedEvents = lastEventRequested && lastStartedEvent
    ? [lastStartedEvent]
    : rankByPreciseTerms(events, terms, ['title', 'slug', 'subtitle', 'description', 'venue']).slice(0, 5)
  const matchedExperiences = rankByPreciseTerms(experiences, terms, ['title', 'slug', 'subtitle', 'description', 'location']).slice(0, 5)

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
  const scopedToTarget = lastEventRequested || terms.length > 0
  const scopedPasses = scopedToTarget ? targetedPasses : recentPasses
  const scopedPassIds = ids(scopedPasses)
  const scopedCheckins = scopedToTarget
    ? targetedCheckins
    : recentCheckins.filter((checkin) => scopedPassIds.includes(textField(checkin, 'access_pass_id')) || !textField(checkin, 'access_pass_id'))

  if (scopedToTarget && !matchedEvents.length && !matchedExperiences.length && !targetedPasses.length) {
    const target = lastEventRequested ? 'último evento registrado' : `"${terms.join(' ')}"`
    return `No encontré un evento, experiencia o pase que coincida con ${target}. Revisé eventos, experiencias, reservaciones, tipos de boleto, pases QR y check-ins; no voy a inventar un conteo.`
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
  const scope = scopedToTarget ? `Para ${selectedTitle}` : 'En los pases localizados'
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
  const status = statusLabel(payment.status)
  const paidAt = payment.paid_at ? ` pagado ${formatAssistantDateTime(payment.paid_at)}` : ''
  const refunded = numberValue(payment.refunded_amount) > 0 ? `, reembolso ${formatAssistantMoney(payment.refunded_amount, payment.currency)}` : ''
  return `${provider}: ${status}, ${formatAssistantMoney(payment.amount, payment.currency)}${paidAt}${refunded}`
}

function statusLabel(value: unknown) {
  const raw = normalizeAssistantText(value).replace(/_/g, ' ').trim()
  const labels: Record<string, string> = {
    active: 'Activo',
    approved: 'Aprobado',
    awaiting_tracking: 'Pendiente de guía',
    archived: 'Archivado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    completed: 'Completado',
    confirmed: 'Confirmado',
    converted: 'Convertido',
    draft: 'Borrador',
    delivered: 'Entregado',
    failed: 'Fallido',
    in_transit: 'En tránsito',
    incomplete: 'Incompleto',
    paid: 'Pago confirmado',
    pending: 'Pendiente',
    pending_configuration: 'Configuración pendiente',
    pending_payment: 'Pago pendiente',
    pending_preparation: 'Por preparar',
    preparing: 'Preparando',
    published: 'Publicado',
    ready: 'Lista para salida',
    read: 'Leída',
    refunded: 'Reembolsado',
    scheduled: 'Programado',
    shipped: 'Enviado',
    skipped: 'Omitido',
    succeeded: 'Exitoso',
    sent: 'Enviado',
    tracking_assigned: 'Guía asignada',
  }
  if (!raw) return 'Sin estado'
  return labels[raw.replace(/\s+/g, '_')] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatLabeledCounts(counts: Record<string, number> | undefined, labeler: (value: unknown) => string = statusLabel) {
  const entries = Object.entries(counts ?? {}).filter(([, value]) => value > 0)
  if (!entries.length) return 'sin registros'
  return entries.map(([key, value]) => `${labeler(key)}: ${value}`).join(', ')
}

function formatStatusCounts(counts: Record<string, number> | undefined) {
  return formatLabeledCounts(counts, statusLabel)
}

function formatSourceCounts(counts: Record<string, number> | undefined) {
  return formatLabeledCounts(counts, sourceLabel)
}

function channelLabel(value: unknown) {
  const raw = normalizeAssistantText(value).replace(/_/g, ' ').trim()
  if (!raw) return 'sin canal'
  if (raw === 'email' || raw === 'correo') return 'Correo'
  if (raw === 'push' || raw.includes('notificacion')) return 'Notificación push'
  if (raw.includes('app') || raw.includes('buzon') || raw.includes('in app')) return 'Notificación en app'
  if (raw.includes('sms')) return 'SMS'
  if (raw.includes('whatsapp')) return 'WhatsApp'
  return statusLabel(raw)
}

function formatChannelCounts(counts: Record<string, number> | undefined) {
  return formatLabeledCounts(counts, channelLabel)
}

function countArray(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    const key = value || 'sin_dato'
    result[key] = (result[key] ?? 0) + 1
    return result
  }, {})
}

function isPaidStatus(value: unknown) {
  return ['paid', 'succeeded', 'completed', 'confirmed'].includes(normalizeAssistantText(value).replace(/ /g, '_'))
}

function sortByRecent(rows: Row[], fields = ['updated_at', 'created_at']) {
  return [...rows].sort((left, right) => {
    const leftValue = fields.map((field) => left[field]).find(Boolean)
    const rightValue = fields.map((field) => right[field]).find(Boolean)
    return new Date(String(rightValue ?? '')).getTime() - new Date(String(leftValue ?? '')).getTime()
  })
}

function latestShipment(rows: Row[]) {
  return sortByRecent(rows, ['delivered_at', 'shipped_at', 'tracking_assigned_at', 'updated_at', 'created_at'])[0] ?? null
}

function itemSummary(items: Row[], currency: unknown = 'MXN', limit = 4) {
  if (!items.length) return 'sin partidas visibles'
  const visible = items.slice(0, limit).map((item) => {
    const quantity = numberValue(item.quantity)
    const name = textField(item, 'name_snapshot') || textField(item, 'sku_snapshot') || 'partida'
    return `${quantity} x ${name} (${formatAssistantMoney(item.subtotal, currency)})`
  })
  const remaining = items.length > limit ? ` y ${items.length - limit} partidas más` : ''
  return `${visible.join('; ')}${remaining}`
}

function compactContact(row: Row | null | undefined) {
  const email = textField(row, 'email')
  const phone = textField(row, 'phone')
  return [email, phone].filter(Boolean).join(' · ') || 'sin contacto visible'
}

function orderCustomer(order: Row) {
  return firstRelation(order.customers)
}

function reservationCustomer(reservation: Row) {
  return firstRelation(reservation.customers)
}

function orderSubject(order: Row) {
  const reservation = firstRelation(order.reservations)
  return reservationSubject(reservation) ?? reservation
}

function rowSearchText(row: Row, fields: string[]) {
  return normalizeAssistantText(fields.map((field) => textField(row, field)).join(' '))
}

function includesAnyTerm(row: Row, terms: string[], fields: string[]) {
  if (!terms.length) return true
  const haystack = rowSearchText(row, fields)
  return terms.some((term) => haystack.includes(term))
}

async function fetchOrderOperationalDetails(orders: Row[]) {
  const orderIds = ids(orders)
  const [items, payments, shipments] = await Promise.all([
    rowsByValues('order_items', assistantOrderItemSelect, 'order_id', orderIds),
    rowsByValues('payments', assistantPaymentSelect, 'order_id', orderIds),
    rowsByValues('shipments', assistantShipmentSelect, 'order_id', orderIds),
  ])
  return {
    itemsByOrder: groupByField(items, 'order_id'),
    paymentsByOrder: groupByField(payments, 'order_id'),
    shipmentsByOrder: groupByField(shipments, 'order_id'),
  }
}

function customerScore(customer: Row, terms: string[], emails: string[]) {
  const haystack = rowSearchText(customer, ['customer_number', 'display_name', 'first_name', 'last_name', 'email', 'phone'])
  let score = terms.filter((term) => haystack.includes(term)).length
  if (terms.includes('patricia') && haystack.includes('patty')) score += 1
  if (terms.includes('patty') && haystack.includes('patricia')) score += 1
  if (emails.some((email) => haystack.includes(normalizeAssistantText(email)))) score += 5
  return score
}

type AssistantAuthUser = {
  id: string
  email?: string | null
  created_at?: string | null
  updated_at?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  last_sign_in_at?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

type AssistantUserDirectoryRow = {
  authId: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
  permissionLabels: string[]
  scopes: string[]
  scopeLabels: string[]
  financialAccess: boolean
  isCustomer: boolean
  isStaff: boolean
  customerNumber: string
  customerValue: number
  lastSignInAt: string | null
  createdAt: string | null
  accountLabel: string
}

const assistantRoleLabels: Record<string, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  operations: 'Operaciones',
  marketing: 'Marketing',
  finance: 'Finanzas',
  viewer: 'Lectura',
  customer: 'Cliente',
}

function extractRelationCode(value: unknown) {
  if (Array.isArray(value)) return extractRelationCode(value[0])
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return textField(record, 'code') || textField(record, 'name') || textField(record, 'id') || null
  }
  return null
}

function uniqueTextValues(values: unknown[]) {
  return Array.from(new Set(values.map((value) => typeof value === 'string' ? value.trim() : '').filter(Boolean)))
}

function roleLabel(role: string) {
  return assistantRoleLabels[role] ?? statusLabel(role)
}

function controlPermissionLabel(code: string) {
  return CONTROL_PERMISSION_CATALOG.find((item) => item.code === code)?.label ?? code
}

function controlScopeLabel(code: string) {
  return CONTROL_SCOPE_CATALOG.find((item) => item.code === code)?.label ?? code
}

function metadataText(user: AssistantAuthUser, field: string) {
  const value = user.user_metadata?.[field]
  return typeof value === 'string' ? value.trim() : ''
}

function cleanEmail(value: unknown) {
  const email = String(value ?? '').trim().toLocaleLowerCase('es-MX')
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function fallbackNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? ''
  const words = local.replace(/[._-]+/g, ' ').trim()
  if (!words) return 'Usuario sin nombre'
  return words.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('es-MX'))
}

function authUserDisplayName(user: AssistantAuthUser, profile?: Row | null, customer?: Row | null) {
  const customerName = displayPerson(customer)
  if (customerName !== 'Persona no identificada') return customerName
  const profileName = displayPerson(profile)
  if (profileName !== 'Persona no identificada') return profileName
  return metadataText(user, 'display_name') ||
    metadataText(user, 'full_name') ||
    metadataText(user, 'name') ||
    [metadataText(user, 'first_name'), metadataText(user, 'last_name')].filter(Boolean).join(' ') ||
    fallbackNameFromEmail(cleanEmail(user.email))
}

async function listAssistantAuthUsers() {
  const users: AssistantAuthUser[] = []
  const perPage = 1000
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({ page, perPage })
    if (error) break
    const pageUsers = (data?.users ?? []) as AssistantAuthUser[]
    users.push(...pageUsers)
    if (pageUsers.length < perPage) break
  }
  return users
}

async function buildAssistantUserDirectory() {
  const authUsers = await listAssistantAuthUsers()
  const authIds = ids(authUsers as unknown as Row[])
  const authEmails = authUsers.map((user) => cleanEmail(user.email)).filter(Boolean)
  const [customersByUser, customersByEmail, profiles, roleRows, permissionRows, scopeRows, financialRows] = await Promise.all([
    rowsByValues('customers', assistantCustomerIdentitySelect, 'user_id', authIds),
    rowsByValues('customers', assistantCustomerIdentitySelect, 'email', authEmails),
    rowsByValues('profiles', 'id,first_name,last_name,display_name', 'id', authIds),
    rowsByValues('user_roles', 'user_id,roles(code)', 'user_id', authIds),
    rowsByValues('user_control_permissions', 'user_id,permission_code', 'user_id', authIds),
    rowsByValues('user_control_scopes', 'user_id,scope_code', 'user_id', authIds),
    rowsByValues('financial_access_grants', 'user_id,revoked_at', 'user_id', authIds),
  ])
  const customersByUserId = new Map(customersByUser.map((customer) => [textField(customer, 'user_id'), customer]).filter(([key]) => Boolean(key)) as Array<[string, Row]>)
  const customersByEmailMap = new Map(customersByEmail.map((customer) => [cleanEmail(customer.email), customer]).filter(([key]) => Boolean(key)) as Array<[string, Row]>)
  const profilesById = new Map(profiles.map((profile) => [textField(profile, 'id'), profile]).filter(([key]) => Boolean(key)) as Array<[string, Row]>)
  const financialUserIds = new Set(financialRows.filter((row) => !row.revoked_at).map((row) => textField(row, 'user_id')).filter(Boolean))
  const rolesByUser = groupByField(roleRows, 'user_id')
  const permissionsByUser = groupByField(permissionRows, 'user_id')
  const scopesByUser = groupByField(scopeRows, 'user_id')

  const directory = authUsers.map((user): AssistantUserDirectoryRow => {
    const authId = user.id
    const email = cleanEmail(user.email)
    const customer = customersByUserId.get(authId) ?? customersByEmailMap.get(email) ?? null
    const profile = profilesById.get(authId) ?? null
    const roles = uniqueTextValues((rolesByUser[authId] ?? []).map((row) => extractRelationCode(row.roles) ?? textField(row, 'role_code')))
    const permissions = uniqueTextValues((permissionsByUser[authId] ?? []).map((row) => textField(row, 'permission_code')))
    const scopes = uniqueTextValues((scopesByUser[authId] ?? []).map((row) => textField(row, 'scope_code')))
    const financialAccess = roles.some((role) => ['super_admin', 'admin'].includes(role)) || financialUserIds.has(authId)
    const hasStaffMetadata = Boolean(user.app_metadata?.staff_account || user.app_metadata?.managed_password_locked)
    const isStaff = hasStaffMetadata || roles.some((role) => role !== 'customer') || permissions.length > 0 || scopes.length > 0 || financialAccess
    const isCustomer = Boolean(customer) || roles.includes('customer')
    const accountLabel = roles.includes('super_admin')
      ? 'Super administrador'
      : roles.includes('admin')
        ? 'Administrador'
        : isStaff && isCustomer
          ? 'Cliente + staff'
          : isStaff
            ? 'Usuario interno'
            : 'Cliente'
    return {
      authId,
      name: authUserDisplayName(user, profile, customer),
      email,
      roles,
      permissions,
      permissionLabels: permissions.map(controlPermissionLabel),
      scopes,
      scopeLabels: scopes.map(controlScopeLabel),
      financialAccess,
      isCustomer,
      isStaff,
      customerNumber: textField(customer, 'customer_number'),
      customerValue: numberValue(customer?.total_spend),
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? null,
      accountLabel,
    }
  })

  return directory.sort((left, right) => Number(right.isStaff) - Number(left.isStaff) || left.name.localeCompare(right.name, 'es-MX'))
}

function assistantUserSearchTerms(question: string) {
  const ignored = new Set([
    'usuario', 'usuarios', 'permiso', 'permisos', 'rol', 'roles', 'staff', 'equipo', 'interno', 'interna', 'admin',
    'administrador', 'administradores', 'sede', 'sedes', 'alcance', 'responsable', 'responsables', 'empleado', 'empleados',
    'cliente', 'clientes', 'clasificacion', 'clasificación',
  ])
  return entityTerms(question).filter((term) => !ignored.has(term))
}

function isUsersAndPermissionsQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  if (/cliente|clientes/.test(normalized) && /consum|compr|reserv|orden|valor|gasto|historial/.test(normalized)) return false
  return /usuario|usuarios|permiso|permisos|rol|roles|staff|equipo|interno|interna|admin|administrador|administradores|sede|sedes|alcance|responsable|responsables|empleado|empleados|direccion@haciendadeletras/.test(normalized)
}

async function answerUsersAndPermissionsQuestion(question: string) {
  if (!isUsersAndPermissionsQuestion(question)) return null

  const directory = await buildAssistantUserDirectory()
  const normalized = normalizeAssistantText(question)
  const emails = question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.map(cleanEmail).filter(Boolean) ?? []
  const terms = assistantUserSearchTerms(question)
  const onlyCustomers = /cliente|clientes/.test(normalized) && !/staff|intern|emplead|admin|permiso|rol|sede|usuario/.test(normalized)
  let matches = directory.filter((user) => {
    if (emails.length) return emails.includes(user.email)
    if (terms.length) {
      const haystack = normalizeAssistantText([
        user.name,
        user.email,
        user.customerNumber,
        user.accountLabel,
        ...user.roles.map(roleLabel),
        ...user.permissionLabels,
        ...user.scopeLabels,
      ].join(' '))
      const score = terms.filter((term) => haystack.includes(term)).length
      return score >= (terms.length <= 2 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.6)))
    }
    if (onlyCustomers) return user.isCustomer && !user.isStaff
    return user.isStaff
  })

  if (!matches.length && terms.length) {
    matches = directory.filter((user) => {
      const haystack = normalizeAssistantText(`${user.name} ${user.email}`)
      return terms.some((term) => haystack.includes(term))
    })
  }

  if (!matches.length) {
    return `No encontré usuarios o permisos con ese criterio. Revisé Auth, Clientes, Roles, Permisos, Sedes y Acceso financiero en modo sólo lectura.`
  }

  const byType = countArray(matches.map((user) => user.accountLabel))
  const byRole = countArray(matches.flatMap((user) => user.roles.length ? user.roles.map(roleLabel) : ['Sin rol asignado']))
  const byScope = countArray(matches.flatMap((user) => user.scopeLabels.length ? user.scopeLabels : ['Sin sede asignada']))
  const detailLines = matches.slice(0, 14).map((user) => {
    const roles = user.roles.length ? user.roles.map(roleLabel).join(', ') : 'sin rol asignado'
    const permissions = user.permissionLabels.length ? user.permissionLabels.slice(0, 6).join(', ') : 'sin permisos explícitos'
    const scopes = user.scopeLabels.length ? user.scopeLabels.join(', ') : 'sin sede asignada'
    const lastSeen = user.lastSignInAt ? formatAssistantDateTime(user.lastSignInAt) : 'sin último ingreso'
    const customerState = user.isStaff && user.isCustomer ? 'también existe como cliente' : user.isStaff ? 'no entra a campañas comerciales' : 'cliente comercial'
    return `- ${user.name} (${user.email || 'sin correo'}): ${user.accountLabel}, roles ${roles}, permisos ${permissions}, sedes ${scopes}, acceso financiero ${user.financialAccess ? 'sí' : 'no'}, ${customerState}, último ingreso ${lastSeen}.`
  }).join('\n')
  const extra = matches.length > 14 ? `\nAdemás hay ${matches.length - 14} registros más con ese criterio.` : ''

  return `Usuarios y permisos localizados: ${matches.length}. Tipos: ${formatLabeledCounts(byType, String)}. Roles: ${formatLabeledCounts(byRole, String)}. Sedes: ${formatLabeledCounts(byScope, String)}.\n\nDetalle:\n${detailLines}${extra}\n\nConsulta local de solo lectura: Auth, Clientes, Roles, Permisos, Sedes y Acceso financiero.`
}

function isCustomerQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  return /cliente|clientes|persona|personas|patricia|patty|garibay|correo|email|telefono|teléfono|compr|consum|historial/.test(normalized)
}

async function answerCustomerDetailQuestion(question: string) {
  if (!isCustomerQuestion(question) || isAttendanceQuestion(question) || isEventAttendanceQuestion(question)) return null

  const terms = entityTerms(question)
  const emails = question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
  if (!terms.length && !emails.length) return null

  const customers = await safeRows(supabaseAdminClient.from('customers').select(assistantCustomerSelect).order('updated_at', { ascending: false }).limit(1000))
  const scoredCustomers = customers
    .map((customer) => ({ customer, score: customerScore(customer, terms, emails) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
  const topScore = scoredCustomers[0]?.score ?? 0
  const minimumScore = emails.length ? 5 : terms.length <= 1 ? 1 : Math.max(2, Math.ceil(terms.length * 0.6))
  const matches = scoredCustomers
    .filter((item) => item.score === topScore && item.score >= minimumScore)
    .slice(0, 4)
    .map((item) => item.customer)

  if (!matches.length) {
    return `No encontré clientes que coincidan con "${terms.join(' ') || emails.join(', ')}". Revisé el directorio real de Clientes; no voy a inventar una persona.`
  }

  const customerIds = ids(matches)
  const [orders, reservations] = await Promise.all([
    rowsByValues('orders', assistantOrderWithCustomerSelect, 'customer_id', customerIds),
    rowsByValues('reservations', assistantReservationWithCustomerSelect, 'customer_id', customerIds),
  ])
  const { itemsByOrder, paymentsByOrder, shipmentsByOrder } = await fetchOrderOperationalDetails(orders)
  const sections = matches.map((customer) => {
    const customerId = textField(customer, 'id')
    const customerOrders = sortByRecent(orders.filter((order) => textField(order, 'customer_id') === customerId)).slice(0, 8)
    const customerReservations = sortByRecent(reservations.filter((reservation) => textField(reservation, 'customer_id') === customerId)).slice(0, 8)
    const orderTotal = totalsByCurrency(customerOrders.filter((order) => !['cancelled', 'canceled'].includes(normalizeAssistantText(order.status))), 'total')
    const paidPayments = customerOrders.flatMap((order) => paymentsByOrder[textField(order, 'id')] ?? []).filter((payment) => isPaidStatus(payment.status))
    const paidTotal = totalsByCurrency(paidPayments, 'amount')
    const orderLines = customerOrders.length
      ? customerOrders.map((order) => {
        const orderItems = itemsByOrder[textField(order, 'id')] ?? []
        const shipment = latestShipment(shipmentsByOrder[textField(order, 'id')] ?? [])
        const shipping = order.requires_shipping
          ? `${statusLabel(order.shipping_status)}${textField(shipment, 'tracking_number') ? `, guía ${textField(shipment, 'tracking_number')}` : ', sin guía visible'}`
          : 'No requiere envío'
        return `- ${textField(order, 'order_number') || 'Orden sin folio'}: ${formatAssistantDateTime(order.created_at)}, ${sourceLabel(order.source)}, ${statusLabel(order.status)}, ${formatAssistantMoney(order.total, order.currency)}. Partidas: ${itemSummary(orderItems, order.currency)}. Logística: ${shipping}.`
      }).join('\n')
      : '- No hay órdenes visibles para este cliente.'
    const reservationLines = customerReservations.length
      ? customerReservations.map((reservation) => {
        const subject = reservationSubject(reservation)
        const when = reservation.reservation_date
          ? `${formatAssistantDate(reservation.reservation_date)}${textField(reservation, 'reservation_time') ? ` ${textField(reservation, 'reservation_time')}` : ''}`
          : formatAssistantDateTime(reservation.created_at)
        return `- ${textField(reservation, 'reservation_number') || 'Reservación sin folio'}: ${textField(subject, 'title') || 'sin experiencia/evento visible'}, ${when}, ${numberValue(reservation.people_count)} personas, ${statusLabel(reservation.status)}, pago ${statusLabel(reservation.payment_status)}, ${formatAssistantMoney(reservation.total, reservation.currency)}, origen ${sourceLabel(reservation.source || reservation.booking_channel)}.`
      }).join('\n')
      : '- No hay reservaciones visibles para este cliente.'
    return `Cliente ${displayPerson(customer)} (${textField(customer, 'customer_number') || 'sin número de cliente'}). Contacto: ${compactContact(customer)}. Origen: ${sourceLabel(customer.source)}. Segmento: ${textField(customer, 'segment') || 'sin segmento'}.\nValor histórico registrado: ${formatAssistantMoney(customer.total_spend, 'MXN')}. Total en órdenes encontradas: ${formatMoneyTotals(orderTotal)}. Pagos confirmados encontrados: ${formatMoneyTotals(paidTotal)}.\n\nCompras y consumos:\n${orderLines}\n\nReservaciones:\n${reservationLines}`
  })

  return `${sections.join('\n\n')}\n\nConsulta local de solo lectura: Clientes, Órdenes, Partidas, Pagos, Envíos y Reservaciones.`
}

function isLogisticsQuestion(question: string) {
  return /logistic|logística|envio|envío|envios|envíos|enviar|mandar|despachar|entrega|entregas|guia|guía|guias|guías|tracking|paqueter|prepar|transito|tránsito|pendiente de envio|pendiente de envío|asignar guia|asignar guía/.test(normalizeAssistantText(question))
}

function isShippingAttentionOrder(order: Row, shipment: Row | null, normalizedQuestion: string) {
  if (order.requires_shipping !== true) return false
  const orderStatus = normalizeAssistantText(order.status).replace(/ /g, '_')
  const shippingStatus = normalizeAssistantText(order.shipping_status).replace(/ /g, '_')
  const shipmentStatus = normalizeAssistantText(shipment?.status_text).replace(/ /g, '_')
  if (['cancelled', 'canceled', 'delivered', 'not_required'].includes(orderStatus)) return false
  if (['cancelled', 'canceled', 'delivered', 'not_required'].includes(shippingStatus)) return false
  if (['cancelled', 'canceled', 'delivered'].includes(shipmentStatus)) return false
  if (/guia|guía|tracking|asignar/.test(normalizedQuestion) && (!textField(shipment, 'tracking_number') || ['awaiting_tracking', 'tracking_assigned'].includes(shippingStatus))) return true
  if (/pending_preparation|prepar/.test(normalizedQuestion)) return ['pending_preparation', 'preparing', 'pending'].includes(orderStatus) || ['pending_preparation', 'preparing', 'pending'].includes(shippingStatus)
  if (/pendiente|envio|envío|enviar|mandar|despachar|entrega|logistic|logística/.test(normalizedQuestion)) return true
  return true
}

async function answerLogisticsQuestion(question: string) {
  if (!isLogisticsQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question)
  const orders = await safeRows(supabaseAdminClient.from('orders').select(assistantOrderWithCustomerSelect).eq('requires_shipping', true).order('created_at', { ascending: false }).limit(300))
  const { itemsByOrder, paymentsByOrder, shipmentsByOrder } = await fetchOrderOperationalDetails(orders)
  const scoped = orders.filter((order) => {
    const customer = orderCustomer(order)
    const subject = orderSubject(order)
    const shipment = latestShipment(shipmentsByOrder[textField(order, 'id')] ?? [])
    const matchesText = includesAnyTerm(order, terms, ['order_number', 'status', 'shipping_status', 'source'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email'])
      || includesAnyTerm(subject ?? {}, terms, ['reservation_number', 'title'])
      || (itemsByOrder[textField(order, 'id')] ?? []).some((item) => includesAnyTerm(item, terms, ['name_snapshot', 'sku_snapshot']))
    return isShippingAttentionOrder(order, shipment, normalized) && (!terms.length || matchesText)
  })
  const visible = sortByRecent(scoped).slice(0, 14)
  const pendingTracking = scoped.filter((order) => !textField(latestShipment(shipmentsByOrder[textField(order, 'id')] ?? []), 'tracking_number')).length
  const byStatus = countBy(scoped.map((order) => ({ status: order.shipping_status || order.status })), 'status')

  if (!scoped.length) {
    return 'No encontré envíos pendientes con ese criterio. Revisé Órdenes, Clientes, Partidas, Pagos, Envíos y Reservaciones en modo sólo lectura.'
  }

  const lines = visible.map((order) => {
    const customer = orderCustomer(order)
    const shipment = latestShipment(shipmentsByOrder[textField(order, 'id')] ?? [])
    const orderItems = itemsByOrder[textField(order, 'id')] ?? []
    const payments = paymentsByOrder[textField(order, 'id')] ?? []
    const payment = payments.find((row) => isPaidStatus(row.status)) ?? payments[0]
    const guide = textField(shipment, 'tracking_number') || 'sin guía'
    return `- ${textField(order, 'order_number') || 'Orden sin folio'}: ${displayPerson(customer)}, ${compactContact(customer)}, ${formatAssistantMoney(order.total, order.currency)}, ${sourceLabel(order.source)}, pago ${payment ? statusLabel(payment.status) : 'sin pago visible'}, logística ${statusLabel(order.shipping_status || shipment?.status_text)}, guía ${guide}. Partidas: ${itemSummary(orderItems, order.currency, 3)}.`
  }).join('\n')
  const extra = scoped.length > visible.length ? `\nAdemás hay ${scoped.length - visible.length} envíos más fuera de este primer corte.` : ''

  return `Hay ${scoped.length} envíos que requieren atención. ${pendingTracking} están sin guía visible. Estados: ${formatStatusCounts(byStatus)}.\n\nClientes y órdenes:\n${lines}${extra}\n\nConsulta local de solo lectura: Órdenes, Clientes, Partidas, Pagos, Envíos y Reservaciones.`
}

function isPaymentQuestion(question: string) {
  return /pago|pagos|cobro|cobros|stripe|ingreso|ingresos|reembolso|reembols|fallido|fallidos|cash|flow|transaccion|transacción/.test(normalizeAssistantText(question))
}

async function answerPaymentsDetailQuestion(question: string) {
  if (!isPaymentQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const payments = await safeRows(supabaseAdminClient
    .from('payments')
    .select('id,order_id,provider,amount,currency,status,payment_method_type,payment_reference,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,created_at,updated_at,orders(id,order_number,total,currency,status,source,created_at,customers(display_name,first_name,last_name,email,phone))')
    .order('created_at', { ascending: false })
    .limit(120))
  const scoped = payments.filter((payment) => {
    const status = normalizeAssistantText(payment.status)
    if (/fall|error|failed/.test(normalized)) return ['failed', 'error'].includes(status)
    if (/pendient|incomplet/.test(normalized)) return ['pending', 'pending_payment', 'requires_action', 'incomplete'].includes(status)
    if (/reembolso|reembols/.test(normalized)) return numberValue(payment.refunded_amount) > 0 || Boolean(payment.refunded_at)
    return true
  })
  const paid = scoped.filter((payment) => isPaidStatus(payment.status))
  const failed = scoped.filter((payment) => ['failed', 'error'].includes(normalizeAssistantText(payment.status))).length
  const refunded = scoped.filter((payment) => numberValue(payment.refunded_amount) > 0 || Boolean(payment.refunded_at)).length
  const lines = scoped.slice(0, 12).map((payment) => {
    const order = firstRelation(payment.orders)
    const customer = firstRelation(order?.customers)
    return `- ${formatAssistantDateTime(payment.created_at)}: ${formatAssistantMoney(payment.amount, payment.currency)}, ${statusLabel(payment.status)}, ${textField(payment, 'provider') || 'proveedor no visible'}, ${textField(payment, 'payment_method_type') || 'método no visible'}, orden ${textField(order, 'order_number') || 'sin folio'}, cliente ${displayPerson(customer)}, origen ${sourceLabel(order?.source)}.`
  }).join('\n')

  return `Pagos localizados: ${scoped.length}. Confirmados: ${paid.length} por ${formatMoneyTotals(totalsByCurrency(paid, 'amount'))}. Fallidos: ${failed}. Con reembolso: ${refunded}.\n\nÚltimos movimientos:\n${lines || '- No hay pagos visibles con ese filtro.'}\n\nConsulta local de solo lectura: Pagos, Órdenes y Clientes.`
}

function isInventoryQuestion(question: string) {
  return /inventario|existencia|existencias|stock|bodega|cava|boutique|almacen|almacén|ubicacion|ubicación|vino|botella|botellas/.test(normalizeAssistantText(question))
}

async function answerInventoryDetailQuestion(question: string) {
  if (!isInventoryQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question)
  const rows = await safeRows(supabaseAdminClient.from('inventory_items').select(assistantInventorySelect).order('updated_at', { ascending: false }).limit(500))
  const filtered = rows.filter((row) => {
    const wine = firstRelation(row.wines)
    const location = firstRelation(row.inventory_locations)
    const available = Math.max(numberValue(row.quantity) - numberValue(row.reserved_quantity), 0)
    const lowStock = available <= numberValue(row.reorder_point)
    if (/bajo|baja|reponer|reposicion|reposición/.test(normalized) && !lowStock) return false
    return includesAnyTerm(row, terms, ['sku', 'product_name', 'lot_code', 'status'])
      || includesAnyTerm(wine ?? {}, terms, ['sku', 'name', 'slug'])
      || includesAnyTerm(location ?? {}, terms, ['name', 'code', 'type'])
  })
  const visible = filtered.slice(0, 16)
  const lines = visible.map((row) => {
    const wine = firstRelation(row.wines)
    const location = firstRelation(row.inventory_locations)
    const name = textField(row, 'product_name') || textField(wine, 'name') || 'Producto sin nombre'
    const locationName = textField(location, 'name') || 'Ubicación no visible'
    const available = Math.max(numberValue(row.quantity) - numberValue(row.reserved_quantity), 0)
    return `- ${name}: ${available} disponibles, ${numberValue(row.quantity)} existencia, ${numberValue(row.reserved_quantity)} reservado, mínimo ${numberValue(row.reorder_point)}, ubicación ${locationName}, estado ${statusLabel(row.status)}.`
  }).join('\n')

  return `Inventario localizado: ${filtered.length} partidas. Existencia total del filtro: ${sum(filtered, 'quantity')}. Reservado: ${sum(filtered, 'reserved_quantity')}. Disponible: ${filtered.reduce((total, row) => total + Math.max(numberValue(row.quantity) - numberValue(row.reserved_quantity), 0), 0)}.\n\nDetalle:\n${lines || '- No hay partidas visibles con ese filtro.'}\n\nConsulta local de solo lectura: Inventario, Vinos y Ubicaciones.`
}

function isReservationsQuestion(question: string) {
  return /reserv|evento|eventos|experiencia|experiencias|restaurante|mesa|cata|recorrido|cabaña|cabana|hosped/.test(normalizeAssistantText(question))
}

async function answerReservationsDetailQuestion(question: string) {
  if (!isReservationsQuestion(question) || isAttendanceQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question)
  const rows = await safeRows(supabaseAdminClient.from('reservations').select(assistantReservationWithCustomerSelect).order('created_at', { ascending: false }).limit(300))
  const filtered = rows.filter((reservation) => {
    const customer = reservationCustomer(reservation)
    const subject = reservationSubject(reservation)
    const location = firstRelation(reservation.restaurant_locations)
    if (/pendient/.test(normalized) && !normalizeAssistantText(reservation.status).includes('pending')) return false
    if (/confirm/.test(normalized) && !normalizeAssistantText(reservation.status).includes('confirm')) return false
    if (/cancel/.test(normalized) && !normalizeAssistantText(reservation.status).includes('cancel')) return false
    return includesAnyTerm(reservation, terms, ['reservation_number', 'reservation_type', 'status', 'source', 'booking_channel'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email'])
      || includesAnyTerm(subject ?? {}, terms, ['title', 'slug', 'venue', 'location'])
      || includesAnyTerm(location ?? {}, terms, ['name', 'slug'])
  })
  const visible = filtered.slice(0, 14)
  const lines = visible.map((reservation) => {
    const customer = reservationCustomer(reservation)
    const subject = reservationSubject(reservation)
    const location = firstRelation(reservation.restaurant_locations)
    const when = reservation.reservation_date
      ? `${formatAssistantDate(reservation.reservation_date)}${textField(reservation, 'reservation_time') ? ` ${textField(reservation, 'reservation_time')}` : ''}`
      : formatAssistantDateTime(reservation.created_at)
    return `- ${textField(reservation, 'reservation_number') || 'Reservación sin folio'}: ${textField(subject, 'title') || 'sin experiencia/evento visible'}, cliente ${displayPerson(customer)}, ${numberValue(reservation.people_count)} personas, ${when}, sede ${textField(location, 'name') || 'sin sede'}, estado ${statusLabel(reservation.status)}, pago ${statusLabel(reservation.payment_status)}, total ${formatAssistantMoney(reservation.total, reservation.currency)}, origen ${sourceLabel(reservation.source || reservation.booking_channel)}.`
  }).join('\n')

  return `Reservaciones localizadas: ${filtered.length}. Personas: ${sum(filtered, 'people_count')}. Valor: ${formatMoneyTotals(totalsByCurrency(filtered, 'total'))}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}.\n\nDetalle:\n${lines || '- No hay reservaciones visibles con ese filtro.'}\n\nConsulta local de solo lectura: Reservaciones, Clientes, Experiencias, Eventos y Sedes.`
}

function isCampaignQuestion(question: string) {
  return /campana|campaña|campanas|campañas|promocion|promoción|promociones|marketing|correo|email|resend|entregado|abierto|rebot|bounce|suppressed|suprim/.test(normalizeAssistantText(question))
}

async function answerCampaignDetailQuestion(question: string) {
  if (!isCampaignQuestion(question)) return null

  const since = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString()
  const [campaigns, recipients, deliveries, outbox, events] = await Promise.all([
    safeRows(supabaseAdminClient.from('campaigns').select('id,name,channel,status,scheduled_at,sent_at,created_at,updated_at').gte('created_at', since).order('created_at', { ascending: false }).limit(80)),
    safeRows(supabaseAdminClient.from('campaign_recipients').select('id,campaign_id,delivery_status,delivered_at,opened_at,clicked_at,error_code,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500)),
    safeRows(supabaseAdminClient.from('campaign_recipient_deliveries').select('id,campaign_id,channel,status,error_code,delivered_at,opened_at,clicked_at,created_at,updated_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500)),
    safeRows(supabaseAdminClient.from('email_outbox').select('id,template_key,recipient_email,locale,subject,status,attempts,scheduled_at,sent_at,delivered_at,failed_at,provider,error_code,created_at,updated_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500)),
    safeRows(supabaseAdminClient.from('communication_events').select('id,event_type,status,created_at,updated_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500)),
  ])
  const lines = campaigns.slice(0, 10).map((campaign) => {
    const campaignId = textField(campaign, 'id')
    const campaignRecipients = recipients.filter((row) => textField(row, 'campaign_id') === campaignId)
    const campaignDeliveries = deliveries.filter((row) => textField(row, 'campaign_id') === campaignId)
    return `- ${textField(campaign, 'name') || 'Campaña sin nombre'}: canal ${textField(campaign, 'channel') || 'sin canal'}, estado ${statusLabel(campaign.status)}, destinatarios ${campaignRecipients.length}, entregas ${campaignDeliveries.length}, enviada ${campaign.sent_at ? formatAssistantDateTime(campaign.sent_at) : 'sin envío registrado'}.`
  }).join('\n')
  const outboxLines = outbox.slice(0, 8).map((mail) => {
    return `- ${formatAssistantDateTime(mail.created_at)}: ${textField(mail, 'recipient_email') || 'sin destinatario'}, ${statusLabel(mail.status)}, asunto "${textField(mail, 'subject') || 'sin asunto'}", proveedor ${textField(mail, 'provider') || 'sin proveedor'}, error ${textField(mail, 'error_code') || 'sin error'}.`
  }).join('\n')

  return `Campañas de los últimos 60 días: ${campaigns.length}. Destinatarios registrados: ${recipients.length}. Entregas por canal: ${deliveries.length}. Correos en outbox: ${outbox.length}. Eventos de comunicación: ${events.length}.\n\nCampañas recientes:\n${lines || '- No hay campañas visibles.'}\n\nCorreos recientes:\n${outboxLines || '- No hay correos visibles.'}\n\nConsulta local de solo lectura: Campañas, Destinatarios, Entregas, Email Outbox y Eventos de Comunicación.`
}

function promotionValue(row: Row) {
  const discountType = normalizeAssistantText(row.discount_type)
  if (discountType.includes('percent')) return `${numberValue(row.discount_value)}%`
  if (discountType.includes('amount') || discountType.includes('fixed')) return formatAssistantMoney(row.discount_value, 'MXN')
  return numberValue(row.discount_value) ? String(row.discount_value) : 'sin valor visible'
}

function isPromotionQuestion(question: string) {
  return /promocion|promoción|promociones|cupon|cupón|descuento|descuentos|oferta|ofertas/.test(normalizeAssistantText(question))
}

async function answerPromotionsDetailQuestion(question: string) {
  if (!isPromotionQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question)
  const [promotions, redemptions] = await Promise.all([
    safeRows(supabaseAdminClient.from('promotions').select(assistantPromotionSelect).order('created_at', { ascending: false }).limit(250)),
    safeRows(supabaseAdminClient.from('promotion_redemptions').select(assistantPromotionRedemptionSelect).order('created_at', { ascending: false }).limit(500)),
  ])
  const now = Date.now()
  const filtered = promotions.filter((promotion) => {
    const textMatch = !terms.length || includesAnyTerm(promotion, terms, ['code', 'name', 'description', 'promotion_type', 'target_segment', 'status'])
    if (!textMatch) return false
    const starts = new Date(String(promotion.starts_at ?? '')).getTime()
    const ends = new Date(String(promotion.ends_at ?? '')).getTime()
    const isCurrent = (!Number.isFinite(starts) || starts <= now) && (!Number.isFinite(ends) || ends >= now)
    if (/vigent|activa|activas|actual|semana/.test(normalized)) return isCurrent && !['draft', 'archived', 'cancelled', 'canceled'].includes(normalizeAssistantText(promotion.status))
    return true
  })
  const visible = filtered.slice(0, 12)
  const lines = visible.map((promotion) => {
    const promoId = textField(promotion, 'id')
    const used = redemptions.filter((row) => textField(row, 'promotion_id') === promoId)
    const period = `${promotion.starts_at ? formatAssistantDate(promotion.starts_at) : 'sin inicio'} a ${promotion.ends_at ? formatAssistantDate(promotion.ends_at) : 'sin cierre'}`
    return `- ${textField(promotion, 'name') || textField(promotion, 'code') || 'Promoción sin nombre'}: ${statusLabel(promotion.status)}, ${promotionValue(promotion)}, segmento ${textField(promotion, 'target_segment') || 'sin segmento'}, vigencia ${period}, usos ${used.length}/${numberValue(promotion.usage_limit) || 'sin límite'}.`
  }).join('\n')
  const redemptionLines = redemptions.slice(0, 8).map((redemption) => {
    const customer = firstRelation(redemption.customers)
    const order = firstRelation(redemption.orders)
    const reservation = firstRelation(redemption.reservations)
    return `- ${formatAssistantDateTime(redemption.created_at)}: ${displayPerson(customer)}, ${formatAssistantMoney(redemption.amount, 'MXN')}, orden ${textField(order, 'order_number') || 'sin orden'}, reservación ${textField(reservation, 'reservation_number') || 'sin reservación'}.`
  }).join('\n')

  return `Promociones localizadas: ${filtered.length}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}. Tipos: ${formatLabeledCounts(countBy(filtered, 'promotion_type'), String)}. Redenciones registradas: ${redemptions.length}.\n\nDetalle:\n${lines || '- No hay promociones visibles con ese filtro.'}\n\nÚltimas redenciones:\n${redemptionLines || '- No hay redenciones visibles.'}\n\nConsulta local de solo lectura: Promociones, Redenciones, Clientes, Órdenes y Reservaciones.`
}

function isQuoteQuestion(question: string) {
  return /cotiz|quote|solicitud|evento privado|banquete|boda|empresa|celebra|celebracion|celebración|invitado|invitados/.test(normalizeAssistantText(question))
}

const quoteSearchStopWords = new Set([
  'cotizacion',
  'cotizaciones',
  'quote',
  'quotes',
  'solicitud',
  'solicitudes',
  'cuanto',
  'cuantos',
  'cuanta',
  'cuantas',
  'total',
  'resumen',
  'cantidad',
  'hay',
  'tenemos',
])

function isGenericQuoteSummaryQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  if (!/cotiz|quote|solicitud/.test(normalized)) return false
  if (!/cuant|total|resumen|cantidad|hay/.test(normalized)) return false
  return !/folio|cliente|contacto|responsable|estado|estatus|sede|espacio|boda|evento privado|banquete|fecha|hoy|ayer|semana|mes|pendient|nueva|nuevo|abiert|cerrad|ganad|perdid|enviar|correo|invitad|origen|app|web|manual/.test(normalized)
}

async function answerQuotesDetailQuestion(question: string) {
  if (!isQuoteQuestion(question) || isGenericQuoteSummaryQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question).filter((term) => !quoteSearchStopWords.has(term))
  const rows = await safeRows(supabaseAdminClient.from('quote_requests').select(assistantQuoteSelect).order('created_at', { ascending: false }).limit(300))
  const filtered = rows.filter((quote) => {
    if (/pendient|nueva|nuevo|abierta|abierto/.test(normalized) && ['closed', 'cancelled', 'canceled', 'won', 'lost'].includes(normalizeAssistantText(quote.status))) return false
    const customer = firstRelation(quote.customers)
    if (!terms.length) return true
    return includesAnyTerm(quote, terms, ['quote_number', 'event_category', 'event_type', 'venue_space_name', 'contact_first_name', 'contact_last_name', 'contact_email', 'contact_phone', 'company_name', 'status', 'source'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email', 'phone'])
  })
  const lines = filtered.slice(0, 14).map((quote) => {
    const customer = firstRelation(quote.customers)
    const contact = displayPerson(customer) !== 'Persona no identificada'
      ? displayPerson(customer)
      : [textField(quote, 'contact_first_name'), textField(quote, 'contact_last_name')].filter(Boolean).join(' ') || 'Contacto sin nombre'
    const services = Array.isArray(quote.requested_services) ? quote.requested_services.map(String).filter(Boolean).join(', ') : ''
    const when = quote.preferred_date ? `${formatAssistantDate(quote.preferred_date)}${textField(quote, 'preferred_start_time') ? ` ${textField(quote, 'preferred_start_time')}` : ''}` : 'sin fecha preferida'
    return `- ${textField(quote, 'quote_number') || 'Cotización sin folio'}: ${contact}, ${textField(quote, 'event_type') || textField(quote, 'event_category') || 'tipo no visible'}, ${numberValue(quote.guest_count)} invitados, ${when}, sede ${textField(quote, 'venue_space_name') || 'sin sede'}, estado ${statusLabel(quote.status)}, origen ${sourceLabel(quote.source)}${services ? `, servicios ${services}` : ''}.`
  }).join('\n')

  return `Cotizaciones localizadas: ${filtered.length}. Invitados estimados: ${sum(filtered, 'guest_count')}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}. Origen: ${formatSourceCounts(countBy(filtered, 'source'))}.\n\nDetalle:\n${lines || '- No hay cotizaciones visibles con ese filtro.'}\n\nConsulta local de solo lectura: Cotizaciones, Clientes y Sedes.`
}

function isMembershipQuestion(question: string) {
  return /wine club|membres|membresía|membresia|socio|socios|puntos|lealtad|club/.test(normalizeAssistantText(question))
}

async function answerMembershipDetailQuestion(question: string) {
  if (!isMembershipQuestion(question)) return null

  const terms = entityTerms(question)
  const rows = await safeRows(supabaseAdminClient.from('memberships').select(assistantMembershipSelect).order('created_at', { ascending: false }).limit(250))
  const filtered = rows.filter((membership) => {
    const customer = firstRelation(membership.customers)
    const plan = firstRelation(membership.membership_plans)
    return includesAnyTerm(membership, terms, ['membership_number', 'status'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email', 'phone'])
      || includesAnyTerm(plan ?? {}, terms, ['code', 'name', 'billing_period'])
  })
  const lines = filtered.slice(0, 12).map((membership) => {
    const customer = firstRelation(membership.customers)
    const plan = firstRelation(membership.membership_plans)
    return `- ${textField(membership, 'membership_number') || 'Membresía sin folio'}: ${displayPerson(customer)}, plan ${textField(plan, 'name') || textField(plan, 'code') || 'sin plan visible'}, estado ${statusLabel(membership.status)}, puntos ${numberValue(membership.points_balance)}, vigencia ${membership.starts_at ? formatAssistantDate(membership.starts_at) : 'sin inicio'} a ${membership.ends_at ? formatAssistantDate(membership.ends_at) : 'sin cierre'}, autorrenovación ${membership.auto_renew ? 'sí' : 'no'}.`
  }).join('\n')

  return `Membresías localizadas: ${filtered.length}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}. Puntos acumulados visibles: ${sum(filtered, 'points_balance')}.\n\nDetalle:\n${lines || '- No hay membresías visibles con ese filtro.'}\n\nConsulta local de solo lectura: Wine Club, Clientes y Planes de membresía.`
}

function cartItemName(item: Row) {
  const metadata = metadataRow(item.metadata)
  return textField(item, 'name_snapshot') ||
    textField(metadata, 'name_snapshot') ||
    textField(metadata, 'name') ||
    textField(metadata, 'title') ||
    textField(metadata, 'sku') ||
    textField(item, 'item_type') ||
    'Partida'
}

function cartItems(cart: Row) {
  return relationRows(cart.cart_items)
}

function cartValue(cart: Row) {
  return cartItems(cart).reduce((total, item) => total + numberValue(item.quantity) * numberValue(item.unit_price_snapshot), 0)
}

function isCartQuestion(question: string) {
  return /carrito|carritos|checkout|abandon|convertid|recorrido del cliente|intencion|intención/.test(normalizeAssistantText(question))
}

async function answerCartActivityQuestion(question: string) {
  if (!isCartQuestion(question)) return null

  const normalized = normalizeAssistantText(question)
  const terms = entityTerms(question)
  const rows = await safeRows(supabaseAdminClient.from('carts').select(assistantCartSelect).order('updated_at', { ascending: false }).limit(260))
  const filtered = rows.filter((cart) => {
    const status = normalizeAssistantText(cart.status)
    if (/abandon/.test(normalized) && ['converted', 'completed', 'paid'].includes(status)) return false
    if (/convertid|complet|pagad/.test(normalized) && !['converted', 'completed', 'paid'].includes(status)) return false
    const customer = firstRelation(cart.customers)
    const itemMatch = cartItems(cart).some((item) => includesAnyTerm({ ...item, name_snapshot: cartItemName(item) }, terms, ['item_type', 'name_snapshot']))
    return includesAnyTerm(cart, terms, ['status', 'currency'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email', 'phone'])
      || itemMatch
  })
  const lines = filtered.slice(0, 12).map((cart) => {
    const customer = firstRelation(cart.customers)
    const items = cartItems(cart)
    const itemText = items.length
      ? items.slice(0, 4).map((item) => `${numberValue(item.quantity)} x ${cartItemName(item)} (${formatAssistantMoney(numberValue(item.quantity) * numberValue(item.unit_price_snapshot), cart.currency)})`).join('; ')
      : 'sin partidas visibles'
    return `- ${formatAssistantDateTime(cart.updated_at || cart.created_at)}: ${displayPerson(customer)}, estado ${statusLabel(cart.status)}, valor estimado ${formatAssistantMoney(cartValue(cart), cart.currency)}, partidas ${itemText}.`
  }).join('\n')

  return `Carritos localizados: ${filtered.length}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}. Valor estimado: ${formatAssistantMoney(filtered.reduce((total, cart) => total + cartValue(cart), 0), 'MXN')}.\n\nDetalle:\n${lines || '- No hay carritos visibles con ese filtro.'}\n\nConsulta local de solo lectura: Carritos, Partidas, Clientes y Actividad de app.`
}

function isNotificationQuestion(question: string) {
  return /notificacion|notificación|notificaciones|push|campanita|buzon|buzón|in app|correo app|dispositivo|firebase|android|ios|iphone/.test(normalizeAssistantText(question))
}

async function answerNotificationsQuestion(question: string) {
  if (!isNotificationQuestion(question)) return null

  const terms = entityTerms(question)
  const [notifications, devices] = await Promise.all([
    safeRows(supabaseAdminClient.from('notifications').select(assistantNotificationSelect).order('created_at', { ascending: false }).limit(320)),
    safeRows(supabaseAdminClient.from('notification_devices').select(assistantNotificationDeviceSelect).order('updated_at', { ascending: false }).limit(500)),
  ])
  const filtered = notifications.filter((notification) => {
    const customer = firstRelation(notification.customers)
    return includesAnyTerm(notification, terms, ['channel', 'title', 'body', 'status', 'push_status', 'push_error_code'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email', 'phone'])
  })
  const activeDevices = devices.filter((device) => device.active === true)
  const lines = filtered.slice(0, 12).map((notification) => {
    const customer = firstRelation(notification.customers)
    const readState = notification.read_at ? `leída ${formatAssistantDateTime(notification.read_at)}` : 'sin leer'
    return `- ${formatAssistantDateTime(notification.created_at)}: ${textField(notification, 'title') || 'Notificación sin título'}, ${channelLabel(notification.channel)}, ${statusLabel(notification.status)}, push ${statusLabel(notification.push_status)}, cliente ${displayPerson(customer)}, ${readState}${textField(notification, 'push_error_code') ? `, error ${textField(notification, 'push_error_code')}` : ''}.`
  }).join('\n')

  return `Notificaciones localizadas: ${filtered.length}. Sin leer: ${filtered.filter((row) => !row.read_at).length}. Canales: ${formatChannelCounts(countBy(filtered, 'channel'))}. Estados: ${formatStatusCounts(countBy(filtered, 'status'))}. Push: ${formatStatusCounts(countBy(filtered, 'push_status'))}.\nDispositivos registrados: ${devices.length}; activos: ${activeDevices.length}; plataformas activas: ${formatLabeledCounts(countBy(activeDevices, 'platform'), String)}.\n\nDetalle:\n${lines || '- No hay notificaciones visibles con ese filtro.'}\n\nConsulta local de solo lectura: Notificaciones, Dispositivos, Clientes y Preferencias de app.`
}

function isAppActivityQuestion(question: string) {
  return /actividad app|sesion|sesión|sesiones|visita|visitas|login|registro|registraron|naveg|pantalla|modulo app|módulo app|uso de app/.test(normalizeAssistantText(question))
}

async function answerAppActivityQuestion(question: string) {
  if (!isAppActivityQuestion(question)) return null

  const terms = entityTerms(question)
  const rows = await safeRows(supabaseAdminClient.from('customer_app_events').select(assistantAppEventSelect).order('occurred_at', { ascending: false }).limit(500))
  const filtered = rows.filter((event) => {
    const customer = firstRelation(event.customers)
    return includesAnyTerm(event, terms, ['event_name', 'entity_type', 'entity_id', 'source', 'module', 'status', 'result'])
      || includesAnyTerm(customer ?? {}, terms, ['display_name', 'first_name', 'last_name', 'email', 'phone'])
  })
  const sessionCount = new Set(filtered.map((event) => textField(event, 'session_id')).filter(Boolean)).size
  const lines = filtered.slice(0, 12).map((event) => {
    const customer = firstRelation(event.customers)
    return `- ${formatAssistantDateTime(event.occurred_at || event.created_at)}: ${textField(event, 'event_name') || 'actividad sin nombre'}, módulo ${textField(event, 'module') || 'sin módulo'}, cliente ${displayPerson(customer)}, origen ${sourceLabel(event.source)}, estado ${statusLabel(event.status || event.result)}.`
  }).join('\n')

  return `Actividad de app localizada: ${filtered.length} eventos y ${sessionCount} sesiones visibles. Módulos: ${formatLabeledCounts(countBy(filtered, 'module'), String)}. Eventos: ${formatLabeledCounts(countBy(filtered, 'event_name'), String)}.\n\nDetalle reciente:\n${lines || '- No hay actividad visible con ese filtro.'}\n\nConsulta local de solo lectura: Actividad App, Sesiones, Clientes y Eventos de navegación.`
}

function isCatalogQuestion(question: string) {
  const normalized = normalizeAssistantText(question)
  if (/inventario|stock|existencia|vendid|comprad|reserva|reservacion|reservación|ingres|qr|pago|orden|envio|envío/.test(normalized)) return false
  return /catalogo|catálogo|contenido|publicad|visible|vino|vinos|experiencia|experiencias|evento|eventos|sede|sedes|restaurante|restaurantes|nieto|teodoro|cabaña|cabana|hospedaje|servicio|servicios/.test(normalized)
}

async function answerCatalogDetailQuestion(question: string) {
  if (!isCatalogQuestion(question)) return null

  const terms = entityTerms(question)
  const [wines, experiences, events, restaurants, cabins, venues] = await Promise.all([
    safeRows(supabaseAdminClient.from('wines').select(assistantWineSelect).order('updated_at', { ascending: false }).limit(250)),
    safeRows(supabaseAdminClient.from('experiences').select(assistantExperienceSelect).order('updated_at', { ascending: false }).limit(250)),
    safeRows(supabaseAdminClient.from('events').select(assistantEventSelect).order('start_at', { ascending: false }).limit(250)),
    safeRows(supabaseAdminClient.from('restaurant_locations').select(assistantRestaurantLocationSelect).order('updated_at', { ascending: false }).limit(100)),
    safeRows(supabaseAdminClient.from('cabin_packages').select(assistantLodgingPackageSelect).order('updated_at', { ascending: false }).limit(100)),
    safeRows(supabaseAdminClient.from('venue_spaces').select(assistantVenueSpaceSelect).order('updated_at', { ascending: false }).limit(100)),
  ])
  const filterRows = (rows: Row[], fields: string[]) => terms.length ? rows.filter((row) => includesAnyTerm(row, terms, fields)) : rows
  const wineRows = filterRows(wines, ['sku', 'slug', 'name', 'subtitle', 'description', 'origin', 'status'])
  const experienceRows = filterRows(experiences, ['slug', 'title', 'subtitle', 'description', 'location', 'status'])
  const eventRows = filterRows(events, ['slug', 'title', 'subtitle', 'description', 'venue', 'status'])
  const restaurantRows = filterRows(restaurants, ['slug', 'name', 'alias', 'description', 'full_address', 'city', 'state', 'status'])
  const cabinRows = filterRows(cabins, ['slug', 'name', 'subtitle', 'description', 'status'])
  const venueRows = filterRows(venues, ['slug', 'name', 'description', 'dimensions', 'status'])
  const lines = [
    ...wineRows.slice(0, 5).map((wine) => {
      const wineStatus = normalizeAssistantText(wine.status)
      const visibility = ['published', 'active'].includes(wineStatus) ? 'visible/publicable' : 'no visible/publicable'
      return `- Vino ${textField(wine, 'name') || textField(wine, 'sku') || 'sin nombre'}: ${statusLabel(wine.status)}, ${visibility}, precio ${formatAssistantMoney(wine.price, 'MXN')}, existencia ${numberValue(wine.stock_quantity)}.`
    }),
    ...experienceRows.slice(0, 5).map((experience) => `- Experiencia ${textField(experience, 'title') || 'sin nombre'}: ${statusLabel(experience.status)}, ${experience.visible_in_app ? 'visible en app' : 'no visible en app'}, cupo ${numberValue(experience.capacity)}, sede ${textField(experience, 'location') || 'sin sede'}.`),
    ...eventRows.slice(0, 5).map((event) => `- Evento ${textField(event, 'title') || 'sin nombre'}: ${statusLabel(event.status)}, ${event.visible_in_app ? 'visible en app' : 'no visible en app'}, fecha ${formatAssistantDateTime(event.start_at)}, vendidos ${numberValue(event.sold_count)} de ${numberValue(event.capacity)}.`),
    ...restaurantRows.slice(0, 5).map((restaurant) => `- Restaurante ${textField(restaurant, 'name') || 'sin nombre'}: ${statusLabel(restaurant.status)}, ${restaurant.visible_in_app ? 'visible en app' : 'no visible en app'}, reservas ${restaurant.reservation_enabled ? 'habilitadas' : 'deshabilitadas'}, dirección ${textField(restaurant, 'full_address') || 'sin dirección'}.`),
    ...cabinRows.slice(0, 4).map((cabin) => `- Hospedaje ${textField(cabin, 'name') || 'sin nombre'}: ${statusLabel(cabin.status)}, ${cabin.visible_in_app ? 'visible en app' : 'no visible en app'}, precio ${formatAssistantMoney(cabin.price, cabin.currency)}, capacidad ${numberValue(cabin.min_guests)} a ${numberValue(cabin.max_guests)} huéspedes.`),
    ...venueRows.slice(0, 4).map((venue) => `- Espacio ${textField(venue, 'name') || 'sin nombre'}: ${statusLabel(venue.status)}, ${venue.visible_in_app ? 'visible en app' : 'no visible en app'}, cupo ${numberValue(venue.capacity)}, medidas ${textField(venue, 'dimensions') || 'sin dimensiones'}.`),
  ].slice(0, 18).join('\n')

  return `Catálogo localizado. Vinos: ${wineRows.length}. Experiencias: ${experienceRows.length}. Eventos: ${eventRows.length}. Restaurantes/sedes: ${restaurantRows.length}. Hospedaje: ${cabinRows.length}. Espacios: ${venueRows.length}.\nEstados de vinos: ${formatStatusCounts(countBy(wineRows, 'status'))}. Estados de eventos: ${formatStatusCounts(countBy(eventRows, 'status'))}.\n\nDetalle:\n${lines || '- No hay registros visibles con ese filtro.'}\n\nConsulta local de solo lectura: Vinos, Experiencias, Eventos, Sedes, Restaurantes, Hospedaje y Espacios.`
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

async function answerPreciseLocalQuestion(question: string, history: ExecutiveAssistantMessagePayload['history'] = []) {
  const useContext = shouldUseAssistantContext(question)
  const contextual = useContext ? contextualQuestion(question, history) : question
  const attendanceQuestion = isEventAttendanceQuestion(question) ? await answerEventAttendanceQuestion(question) : null
  const contextualAttendanceQuestion = useContext && isEventAttendanceQuestion(contextual) ? await answerEventAttendanceQuestion(contextual) : null
  if (attendanceQuestion) return attendanceQuestion
  return await answerFolioQuestion(question)
    ?? await answerUsersAndPermissionsQuestion(question)
    ?? await answerNextEventQuestion(question)
    ?? await answerEventAttendanceQuestion(question)
    ?? await answerCustomerDetailQuestion(question)
    ?? await answerLogisticsQuestion(question)
    ?? await answerPaymentsDetailQuestion(question)
    ?? await answerCartActivityQuestion(question)
    ?? await answerNotificationsQuestion(question)
    ?? await answerPromotionsDetailQuestion(question)
    ?? await answerQuotesDetailQuestion(question)
    ?? await answerMembershipDetailQuestion(question)
    ?? await answerInventoryDetailQuestion(question)
    ?? await answerCampaignDetailQuestion(question)
    ?? await answerReservationsDetailQuestion(question)
    ?? await answerAppActivityQuestion(question)
    ?? await answerCatalogDetailQuestion(question)
    ?? (useContext ? await answerUsersAndPermissionsQuestion(contextual) : null)
    ?? contextualAttendanceQuestion
    ?? (useContext ? await answerEventAttendanceQuestion(contextual) : null)
    ?? (useContext ? await answerLogisticsQuestion(contextual) : null)
    ?? (useContext ? await answerCustomerDetailQuestion(contextual) : null)
    ?? (useContext ? await answerPaymentsDetailQuestion(contextual) : null)
    ?? (useContext ? await answerCartActivityQuestion(contextual) : null)
    ?? (useContext ? await answerNotificationsQuestion(contextual) : null)
    ?? (useContext ? await answerPromotionsDetailQuestion(contextual) : null)
    ?? (useContext ? await answerQuotesDetailQuestion(contextual) : null)
    ?? (useContext ? await answerMembershipDetailQuestion(contextual) : null)
    ?? (useContext ? await answerInventoryDetailQuestion(contextual) : null)
    ?? (useContext ? await answerCampaignDetailQuestion(contextual) : null)
    ?? (useContext ? await answerReservationsDetailQuestion(contextual) : null)
    ?? (useContext ? await answerAppActivityQuestion(contextual) : null)
    ?? (useContext ? await answerCatalogDetailQuestion(contextual) : null)
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
    privacy: 'Resumen ejecutivo agregado; las consultas puntuales se resuelven localmente con datos administrativos de sólo lectura.',
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
  return `Eres Mi asistente, consejera ejecutiva privada de la dirección de Hacienda de Letras. Responde en español mexicano, con tono adulto, cálido, sereno, profesional y directo. Tu lectura operativa cubre todo el Centro de Control en modo sólo lectura: usuarios y permisos, clientes, reservaciones, eventos, entradas QR, órdenes, pagos, logística, inventario, campañas, promociones, cotizaciones, membresías, carritos, notificaciones, catálogo, sedes, hospedaje y actividad de app. El backend resuelve antes las preguntas puntuales con datos administrativos reales; si aquí sólo recibes resumen agregado, responde con esos hechos y pide una pregunta más precisa por folio, cliente, evento, estado, sede o periodo. Nunca inventes datos ni digas que no tienes acceso por política a clientes o compras; distingue si el dato no está en el resumen disponible. No muestres IDs técnicos, metadata cruda, tokens, hashes ni payloads de proveedor. No uses asteriscos ni markdown. Cero emojis. No puedes crear, editar, confirmar, cancelar ni eliminar registros. ${plainAiResponseInstruction}\n\nRESUMEN OPERATIVO ACTUAL:\n${JSON.stringify(snapshot)}`
}

function formatMoneyTotals(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals ?? {})
  if (!entries.length) return '$0 MXN'
  return entries.map(([currency, value]) => `${new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)} ${currency}`).join(' y ')
}

function answerFromSnapshot(question: string, snapshot: Awaited<ReturnType<typeof buildExecutiveSnapshot>>) {
  const normalized = normalizeAssistantText(question)
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
    return `En los últimos 30 días se registraron ${period.orders.total} órdenes y ${period.logistics.total} movimientos de logística. Estados de órdenes: ${formatStatusCounts(period.orders.byStatus)}. Estados logísticos: ${formatStatusCounts(period.logistics.byStatus)}.`
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
    return `Hay ${snapshot.operation.lodgingUnits.total} unidades de hospedaje registradas y ${period.lodgingStays.total} estancias creadas en los últimos 30 días. Estados operativos de unidades: ${formatStatusCounts(snapshot.operation.lodgingUnits.byOperation)}.`
  }
  if (/campaña|campana|promoci|marketing/.test(normalized)) {
    return `En los últimos 30 días se registraron ${period.campaigns.total} campañas. El catálogo contiene ${snapshot.catalog.promotions.total} promociones. Canales de campaña: ${formatChannelCounts(period.campaigns.byChannel)}.`
  }
  if (/cotiz|celebra|solicitud/.test(normalized)) {
    return `En los últimos 30 días se registraron ${period.quotes.total} solicitudes de cotización para ${period.quotes.guests} invitados estimados. Estados: ${formatStatusCounts(period.quotes.byStatus)}. Origen: ${formatSourceCounts(period.quotes.bySource)}.`
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
    const preciseAnswer = await answerPreciseLocalQuestion(payload.message, payload.history)
    if (preciseAnswer) {
      await completeAudit(auditId, 'completed')
      return { answer: plainAiResponse(preciseAnswer), generatedAt: new Date().toISOString(), mode: 'operational' as const }
    }
    const snapshot = await buildExecutiveSnapshot(user)
    if (!env.OPENAI_API_KEY) {
      const answer = answerFromSnapshot(payload.message, snapshot)
      await completeAudit(auditId, 'completed')
      return { answer: plainAiResponse(answer), generatedAt: snapshot.generatedAt, mode: 'operational' as const }
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
    return { answer: plainAiResponse(answer), generatedAt: snapshot.generatedAt }
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
