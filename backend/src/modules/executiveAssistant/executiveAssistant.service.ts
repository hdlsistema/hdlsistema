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
