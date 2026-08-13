import { supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'

const dashboardRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

type CustomerRow = { id: string }

type ReservationRow = {
  id: string
  reservation_number: string
  status: string
  people_count: number | string
  total: number | string
  currency: string
  created_at: string
}

type OrderRow = {
  id: string
  order_number: string
  status: string
  total: number | string
  currency: string
  created_at: string
}

type PaymentRow = {
  id: string
  status: string
  amount: number | string
  refunded_amount?: number | string | null
  currency: string
}

type SlotRow = {
  id: string
  start_at: string
  end_at: string
  capacity: number | string
  reserved_count: number | string
  status: string
  is_bookable?: boolean | null
  operational_status?: string | null
  experiences?: { title?: string | null } | Array<{ title?: string | null }> | null
}

type MapPoiRow = { id: string }

type AppActivityRow = {
  id: string
  customer_id?: string | null
  event_name: string
  module?: string | null
  entity_type?: string | null
  entity_id?: string | null
  occurred_at: string
  customers?: { display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | Array<{ display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null }> | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function moneyByCurrency(rows: PaymentRow[]) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    if (!['paid', 'partially_refunded', 'refunded'].includes(row.status)) continue
    const net = Math.max(numberValue(row.amount) - numberValue(row.refunded_amount), 0)
    const currency = row.currency?.trim().toUpperCase() || 'MXN'
    totals.set(currency, (totals.get(currency) ?? 0) + net)
  }

  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
}

/**
 * Resumen operativo basado exclusivamente en registros persistidos. Este módulo
 * no calcula proyecciones, tendencias ni indicadores de presencia en sitio.
 */
export async function getDashboardSummary(user: UserContext) {
  requireOperationRole(user, dashboardRoles)
  const now = new Date().toISOString()

  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
  const [
    customersResult,
    activeReservationsResult,
    pendingReservationsResult,
    confirmedReservationsResult,
    pendingPaymentOrdersResult,
    reservationsResult,
    ordersResult,
    paymentsResult,
    slotsResult,
    cartsResult,
    checkoutStartedResult,
    appSessionsResult,
    recentActivityResult,
    activeCustomerEventsResult,
    mapPoisResult,
  ] = await Promise.all([
    supabaseAdminClient.from('customers').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabaseAdminClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed']),
    supabaseAdminClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdminClient
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    supabaseAdminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_payment'),
    supabaseAdminClient
      .from('reservations')
      .select('id,reservation_number,status,people_count,total,currency,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdminClient
      .from('orders')
      .select('id,order_number,status,total,currency,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdminClient.from('payments').select('id,status,amount,refunded_amount,currency'),
    supabaseAdminClient
      .from('experience_slots')
      .select('id,start_at,end_at,capacity,reserved_count,status,is_bookable,operational_status,experiences(title)')
      .gte('start_at', now)
      .order('start_at', { ascending: true })
      .limit(8),
    supabaseAdminClient.from('carts').select('id,cart_status'),
    supabaseAdminClient
      .from('customer_app_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', 'checkout_started')
      .gte('occurred_at', activeSince),
    supabaseAdminClient
      .from('customer_app_events')
      .select('session_id')
      .eq('event_name', 'app_session_started')
      .gte('occurred_at', activeSince),
    supabaseAdminClient
      .from('customer_app_events')
      .select('id,customer_id,event_name,module,entity_type,entity_id,occurred_at,customers(display_name,first_name,last_name,email)')
      .order('occurred_at', { ascending: false })
      .limit(8),
    supabaseAdminClient
      .from('customer_app_events')
      .select('customer_id')
      .not('customer_id', 'is', null)
      .gte('occurred_at', activeSince),
    supabaseAdminClient
      .from('map_pois')
      .select('id')
      .eq('status', 'published')
      .eq('visible_in_app', true)
      .is('deleted_at', null)
      .is('archived_at', null),
  ])

  const customers = assertNoError<CustomerRow[]>(customersResult)
  const activeReservations = assertNoError<Array<{ id: string }>>(activeReservationsResult)
  const pendingReservations = assertNoError<Array<{ id: string }>>(pendingReservationsResult)
  const confirmedReservations = assertNoError<Array<{ id: string }>>(confirmedReservationsResult)
  const pendingPaymentOrders = assertNoError<Array<{ id: string }>>(pendingPaymentOrdersResult)
  const reservations = assertNoError<ReservationRow[]>(reservationsResult).data ?? []
  const orders = assertNoError<OrderRow[]>(ordersResult).data ?? []
  const payments = assertNoError<PaymentRow[]>(paymentsResult).data ?? []
  const slots = assertNoError<SlotRow[]>(slotsResult).data ?? []
  const carts = assertNoError<Array<{ id: string; cart_status?: string | null }>>(cartsResult).data ?? []
  const checkoutStarted = assertNoError<Array<{ id: string }>>(checkoutStartedResult)
  const appSessions = assertNoError<Array<{ session_id?: string | null }>>(appSessionsResult).data ?? []
  const recentActivity = assertNoError<AppActivityRow[]>(recentActivityResult).data ?? []
  const activeCustomerEvents = assertNoError<Array<{ customer_id?: string | null }>>(activeCustomerEventsResult).data ?? []
  const mapPois = assertNoError<MapPoiRow[]>(mapPoisResult).data ?? []

  const confirmedPayments = payments.filter((item) => item.status === 'paid')
  const sellableSlots = slots.filter((slot) =>
    slot.status === 'published'
    && slot.operational_status === 'open'
    && slot.is_bookable !== false,
  )
  const totalCapacity = sellableSlots.reduce((sum, slot) => sum + numberValue(slot.capacity), 0)
  const totalReserved = sellableSlots.reduce((sum, slot) => sum + numberValue(slot.reserved_count), 0)
  const checkoutCount = checkoutStarted.count ?? 0
  const convertedCartCount = carts.filter((cart) => cart.cart_status === 'converted').length
  const cartCount = carts.length
  const conversionRate = cartCount > 0 ? Math.round((convertedCartCount / cartCount) * 100) : 0

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      customers: customers.count ?? 0,
      activeReservations: activeReservations.count ?? 0,
      pendingReservations: pendingReservations.count ?? 0,
      confirmedReservations: confirmedReservations.count ?? 0,
      pendingPaymentOrders: pendingPaymentOrders.count ?? 0,
      confirmedPayments: confirmedPayments.length,
      collected: moneyByCurrency(payments),
      activeCustomersRecent: new Set(activeCustomerEvents.map((event) => event.customer_id).filter(Boolean)).size,
      activeCarts: carts.filter((cart) => cart.cart_status === 'active').length,
      convertedCarts: convertedCartCount,
      checkoutStarted: checkoutCount,
      visitorsRecent: new Set(appSessions.map((event) => event.session_id).filter(Boolean)).size,
      occupancyRate: totalCapacity > 0 ? Math.round((totalReserved / totalCapacity) * 100) : 0,
      conversionRate,
      publishedMapPois: mapPois.length,
    },
    upcomingSlots: sellableSlots.map((slot) => {
      const capacity = numberValue(slot.capacity)
      const reserved = numberValue(slot.reserved_count)
      return {
        id: slot.id,
        experienceTitle: firstRelation(slot.experiences)?.title ?? 'Experiencia sin título',
        startAt: slot.start_at,
        endAt: slot.end_at,
        capacity,
        reserved,
        available: Math.max(capacity - reserved, 0),
        status: slot.status,
        operationalStatus: slot.operational_status ?? 'open',
        isBookable: Boolean(slot.is_bookable ?? slot.status === 'published'),
      }
    }),
    recentReservations: reservations.map((reservation) => ({
      id: reservation.id,
      reservationNumber: reservation.reservation_number,
      status: reservation.status,
      peopleCount: numberValue(reservation.people_count),
      total: numberValue(reservation.total),
      currency: reservation.currency,
      createdAt: reservation.created_at,
    })),
    recentOrders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      total: numberValue(order.total),
      currency: order.currency,
      createdAt: order.created_at,
    })),
    recentAppActivity: recentActivity.map((event) => {
      const customer = firstRelation(event.customers)
      return {
        id: event.id,
        customerName: customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim() || customer?.email || null,
        eventName: event.event_name,
        module: event.module ?? 'content',
        entityType: event.entity_type ?? null,
        entityId: event.entity_id ?? null,
        occurredAt: event.occurred_at,
      }
    }),
  }
}
