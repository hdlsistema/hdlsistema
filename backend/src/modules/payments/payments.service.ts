import { createHash, randomUUID } from 'crypto'
import type Stripe from 'stripe'
import {
  createSupabaseUserRequestClient,
  supabaseAdminClient,
} from '../../config/supabase'
import { env } from '../../config/env'
import { getStripeClient, isStripeWebhookConfigured, stripeEnvironment } from '../../config/stripe'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { recordBusinessActivity } from '../activity/activity.service'
import type { AppEventName } from '../activity/activity.schemas'
import {
  ensureEventTicketAccessPassesForPaidOrder,
  ensureReservationAccessPassForPaidOrder,
  revokeOrderAccessPasses,
  revokeReservationAccessPasses,
} from '../checkin/accessPassIssuer'
import {
  assertNoError,
  httpError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { ensureOrderShippingAfterPayment } from '../orders/orders.service'
import type {
  ManualPaymentPayload,
  PaymentListQuery,
  PaymentWebhookPayload,
  RefundPaymentPayload,
} from './payments.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const financeRoles = ['super_admin', 'admin', 'finance']
const exportRoles = ['super_admin', 'admin', 'finance', 'viewer']
const customerPaymentRoles = ['customer', 'super_admin', 'admin']

type Relation<T> = T | T[] | null

type PaymentRow = {
  id: string
  order_id: string
  provider: string
  provider_payment_id?: string | null
  amount: number | string
  currency: string
  status: string
  payment_method_type?: string | null
  payment_reference?: string | null
  provider_response?: Record<string, unknown> | null
  receipt_storage_path?: string | null
  paid_at?: string | null
  failed_at?: string | null
  refunded_amount?: number | string | null
  refunded_at?: string | null
  refund_reason?: string | null
  provider_environment?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  orders?: Relation<{
    id: string
    order_number: string
    total: number | string
    status: string
    customers?: Relation<{ display_name?: string | null; first_name: string; last_name: string }>
  }>
}

type CustomerRow = {
  id: string
  user_id: string | null
  email?: string | null
  first_name: string
  last_name: string
  display_name?: string | null
}

type CustomerOrderRow = {
  id: string
  order_number: string
  user_id: string | null
  customer_id: string
  subtotal: number | string
  discount_total: number | string
  tax_total: number | string
  shipping_total: number | string
  total: number | string
  currency: string
  status: string
  paid_at?: string | null
  requires_shipping?: boolean | null
  shipping_status?: string | null
  metadata?: Record<string, unknown> | null
}

type OrderItemRow = {
  subtotal: number | string
  item_type?: string | null
}

type OrderShippingAddressRow = {
  label?: string | null
  recipient_name?: string | null
  phone?: string | null
  email?: string | null
  line1?: string | null
  line2?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  references?: string | null
}

type PaymentSessionData = {
  orderId: string
  orderNumber: string
  provider: 'stripe'
  environment: 'test' | 'live'
  clientSecret: string
  customerSessionClientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
  status: string
}

type CustomerPaymentProfileRow = {
  id: string
  customer_id: string
  user_id?: string | null
  provider_customer_id: string
  provider_environment: string
}

type PaymentStatusData = {
  orderId: string
  orderNumber: string
  orderStatus: string
  paymentStatus: string
  provider: string | null
  amount: number
  currency: string
  canRetry: boolean
  paidAt: string | null
  failedAt: string | null
}

const paymentSelect = `
  id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,
  receipt_storage_path,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,
  notes,created_at,updated_at,
  orders(id,order_number,total,status,customers(display_name,first_name,last_name))
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toMinorUnits(value: number) {
  return Math.round(roundMoney(value) * 100)
}

function requireStripeClient() {
  const stripe = getStripeClient()
  if (!stripe) throw httpError(503, 'Stripe no configurado')
  if (stripeEnvironment() !== 'test' || env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw httpError(503, 'Stripe sandbox requerido')
  }
  return stripe
}

function stripePaymentStatus(intent: Stripe.PaymentIntent): string {
  if (intent.status === 'succeeded') return 'paid'
  if (intent.status === 'processing') return 'processing'
  if (intent.status === 'canceled') return 'cancelled'
  if (intent.status === 'requires_payment_method') return 'failed'
  return 'pending'
}

function safeStripeIntent(intent: Stripe.PaymentIntent) {
  const error = intent.last_payment_error
  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency,
    paymentMethodTypes: intent.payment_method_types,
    latestCharge: typeof intent.latest_charge === 'string' ? intent.latest_charge : null,
    lastPaymentError: error
      ? {
          code: error.code ?? null,
          declineCode: error.decline_code ?? null,
          type: error.type ?? null,
        }
      : null,
  }
}

function customerName(customer: CustomerRow | null) {
  if (!customer) return 'Cliente'
  return customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email || 'Cliente'
}

function recordPaymentActivity(eventName: AppEventName, order: CustomerOrderRow, paymentId: string, eventKey: string, result: 'succeeded' | 'failed' | 'cancelled' | 'processing') {
  void recordBusinessActivity({
    sessionId: `payment-${order.id}`,
    eventName,
    entityType: 'payment',
    entityId: paymentId,
    eventKey: eventKey.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 180),
    metadata: { result },
  }, { customerId: order.customer_id, userId: order.user_id ?? undefined })
}

async function getCustomerForPayment(user: UserContext) {
  requireOperationRole(user, customerPaymentRoles)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,email,first_name,last_name,display_name')
    .eq('user_id', user.userId)
    .maybeSingle()
  const customer = assertNoError<CustomerRow | null>(result).data
  if (!customer) throw httpError(404, 'Cliente no vinculado a la sesión')
  return customer
}

async function getOwnedOrder(orderId: string, user: UserContext) {
  const customer = await getCustomerForPayment(user)
  const result = await supabaseAdminClient
    .from('orders')
    .select('id,order_number,user_id,customer_id,subtotal,discount_total,tax_total,shipping_total,total,currency,status,paid_at,requires_shipping,shipping_status,metadata')
    .eq('id', orderId)
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .maybeSingle()
  const order = assertNoError<CustomerOrderRow | null>(result).data
  if (!order) throw httpError(404, 'Orden no encontrada')
  return { customer, order }
}

async function getOrCreateStripeCustomer(customer: CustomerRow, stripe: Stripe) {
  const environment = stripeEnvironment()
  const existingResult = await supabaseAdminClient
    .from('customer_payment_profiles')
    .select('id,customer_id,user_id,provider_customer_id,provider_environment')
    .eq('customer_id', customer.id)
    .eq('provider', 'stripe')
    .eq('provider_environment', environment)
    .maybeSingle()
  const existing = assertNoError<CustomerPaymentProfileRow | null>(existingResult).data
  if (existing?.provider_customer_id) return existing.provider_customer_id

  const stripeCustomer = await stripe.customers.create({
    email: customer.email ?? undefined,
    name: customerName(customer),
    metadata: {
      hacienda_customer_id: customer.id,
      environment,
    },
  }, { idempotencyKey: `stripe-customer:${environment}:${customer.id}` })

  const saved = await supabaseAdminClient
    .from('customer_payment_profiles')
    .upsert({
      customer_id: customer.id,
      user_id: customer.user_id,
      provider: 'stripe',
      provider_customer_id: stripeCustomer.id,
      provider_environment: environment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_id,provider,provider_environment' })
    .select('provider_customer_id')
    .single()
  return assertNoError<{ provider_customer_id: string }>(saved).data.provider_customer_id
}

async function createPaymentElementCustomerSession(stripe: Stripe, stripeCustomerId: string) {
  const session = await stripe.customerSessions.create({
    customer: stripeCustomerId,
    components: {
      payment_element: {
        enabled: true,
        features: {
          payment_method_redisplay: 'enabled',
          payment_method_redisplay_limit: 5,
          payment_method_remove: 'enabled',
          payment_method_save: 'enabled',
          payment_method_save_usage: 'on_session',
          payment_method_allow_redisplay_filters: ['always'],
        },
      },
    },
  })
  return session.client_secret
}

export async function listCustomerStripePaymentMethods(user: UserContext) {
  const customer = await getCustomerForPayment(user)
  const stripe = requireStripeClient()
  const profileResult = await supabaseAdminClient
    .from('customer_payment_profiles')
    .select('provider_customer_id')
    .eq('customer_id', customer.id)
    .eq('provider', 'stripe')
    .eq('provider_environment', stripeEnvironment())
    .maybeSingle()
  const stripeCustomerId = assertNoError<{ provider_customer_id: string } | null>(profileResult).data?.provider_customer_id
  if (!stripeCustomerId) return { data: [] }

  const methods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
    limit: 10,
  })
  return {
    data: methods.data.map((method) => ({
      id: method.id,
      type: method.type,
      brand: method.card?.brand ?? null,
      last4: method.card?.last4 ?? null,
      expMonth: method.card?.exp_month ?? null,
      expYear: method.card?.exp_year ?? null,
      funding: method.card?.funding ?? null,
    })),
  }
}

async function assertCompleteShippingAddress(order: CustomerOrderRow) {
  const itemResult = await supabaseAdminClient
    .from('order_items')
    .select('item_type')
    .eq('order_id', order.id)
  const orderItems = assertNoError<Array<{ item_type?: string | null }>>(itemResult).data ?? []
  const needsShipping = Boolean(order.requires_shipping) || orderItems.some((item) => item.item_type === 'wine')
  if (!needsShipping) return

  const addressResult = await supabaseAdminClient
    .from('order_shipping_addresses')
    .select('label,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references')
    .eq('order_id', order.id)
    .maybeSingle()
  const address = assertNoError<OrderShippingAddressRow | null>(addressResult).data
  const requiredFields: Array<keyof OrderShippingAddressRow> = [
    'label',
    'recipient_name',
    'phone',
    'email',
    'line1',
    'line2',
    'neighborhood',
    'city',
    'state',
    'postal_code',
    'country',
    'references',
  ]
  if (!address || requiredFields.some((field) => !String(address[field] ?? '').trim())) {
    throw httpError(422, 'Domicilio de entrega completo requerido antes del pago')
  }
}

async function validateOrderAmount(order: CustomerOrderRow) {
  if (order.currency.trim().toUpperCase() !== 'MXN') throw httpError(422, 'Moneda no soportada')

  const itemsResult = await supabaseAdminClient
    .from('order_items')
    .select('subtotal')
    .eq('order_id', order.id)
  const items = assertNoError<OrderItemRow[]>(itemsResult).data ?? []
  const itemSubtotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.subtotal), 0))
  const subtotal = roundMoney(toNumber(order.subtotal))
  const expectedTotal = roundMoney(subtotal - toNumber(order.discount_total) + toNumber(order.tax_total) + toNumber(order.shipping_total))
  const total = roundMoney(toNumber(order.total))

  if (items.length === 0) throw httpError(422, 'Orden sin partidas')
  if (Math.abs(itemSubtotal - subtotal) > 0.01) throw httpError(422, 'Subtotal inconsistente')
  if (Math.abs(expectedTotal - total) > 0.01) throw httpError(422, 'Total inconsistente')
  if (total <= 0) throw httpError(422, 'Total inválido')

  return {
    amount: total,
    amountMinor: toMinorUnits(total),
    currency: order.currency.trim().toLowerCase(),
  }
}

async function findLatestStripePayment(orderId: string) {
  const result = await supabaseAdminClient
    .from('payments')
    .select('id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,provider_response,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,notes,created_at,updated_at')
    .eq('order_id', orderId)
    .eq('provider', 'stripe')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return assertNoError<PaymentRow | null>(result).data
}

async function writeStripePaymentFromIntent(order: CustomerOrderRow, intent: Stripe.PaymentIntent, idempotencyKey: string) {
  const status = stripePaymentStatus(intent)
  const amount = roundMoney(intent.amount / 100)
  const existing = await findLatestStripePayment(order.id)
  const payload = {
    order_id: order.id,
    provider: 'stripe',
    provider_payment_id: intent.id,
    amount,
    currency: intent.currency.toUpperCase(),
    status,
    payment_method_type: intent.payment_method_types?.[0] ?? null,
    provider_response: safeStripeIntent(intent),
    provider_environment: stripeEnvironment() === 'live' ? 'provider' : 'sandbox',
    idempotency_key: idempotencyKey,
    metadata: {
      source: 'customer_app',
      environment: stripeEnvironment(),
    },
  }

  if (existing?.id) {
    const update = await supabaseAdminClient
      .from('payments')
      .update(payload)
      .eq('id', existing.id)
      .select('id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,provider_response,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,notes,created_at,updated_at')
      .single()
    return assertNoError<PaymentRow>(update).data
  }

  const insert = await supabaseAdminClient
    .from('payments')
    .insert(payload)
    .select('id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,provider_response,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,notes,created_at,updated_at')
    .single()
  return assertNoError<PaymentRow>(insert).data
}

function mapPayment(row: PaymentRow) {
  const order = firstRelation(row.orders)
  const customer = firstRelation(order?.customers)
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: order?.order_number ?? null,
    customerName: customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim(),
    provider: row.provider,
    providerEnvironment: row.provider_environment ?? 'manual',
    status: row.status,
    amount: toNumber(row.amount),
    refundedAmount: toNumber(row.refunded_amount),
    currency: row.currency.trim(),
    method: row.payment_method_type ?? null,
    paymentReference: row.payment_reference ?? null,
    hasReceipt: Boolean(row.receipt_storage_path),
    paidAt: row.paid_at ?? null,
    refundedAt: row.refunded_at ?? null,
    refundReason: row.refund_reason ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function applyFilters(request: any, query: PaymentListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.provider) next = next.eq('provider', query.provider)
  if (query.orderId) next = next.eq('order_id', query.orderId)
  if (query.method) next = next.eq('payment_method_type', query.method)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`payment_reference.ilike.%${safe}%,provider.ilike.%${safe}%`)
  }
  return next
}

export async function listPayments(query: PaymentListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyFilters(
    supabaseAdminClient
      .from('payments')
      .select(paymentSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)

  const rows = assertNoError<PaymentRow[]>(result).data ?? []
  return {
    data: rows.map(mapPayment),
    count: result.count ?? rows.length,
  }
}

export async function getPayment(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('payments')
    .select(paymentSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<PaymentRow | null>(result).data
  if (!row) throw httpError(404, 'Pago no encontrado')
  return { data: mapPayment(row) }
}

export async function recordManualPayment(payload: ManualPaymentPayload, user: UserContext) {
  requireOperationRole(user, financeRoles)
  const result = await rpcClient(user).rpc('record_manual_payment', {
    p_order_id: payload.orderId,
    p_amount: payload.amount,
    p_payment_method_type: payload.paymentMethodType,
    p_payment_reference: payload.paymentReference,
    p_receipt_storage_path: payload.receiptStoragePath ?? null,
    p_paid_at: payload.paidAt ?? null,
    p_notes: payload.notes ?? null,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  const payment = await getPayment(String(result.data), user)
  const order = await getOrderById(payload.orderId)
  if (order && ['paid', 'fulfilled'].includes(order.status)) {
    await ensureEventTicketAccessPassesForPaidOrder(order.id)
    await ensureReservationAccessPassForPaidOrder(order.id)
    if (order.requires_shipping) await ensureOrderShippingAfterPayment(order.id)
    await queueOrderPaidEmail(order)
  }
  return payment
}

export async function refundPayment(id: string, payload: RefundPaymentPayload, user: UserContext) {
  requireOperationRole(user, financeRoles)
  const current = assertNoError<PaymentRow | null>(await supabaseAdminClient
    .from('payments')
    .select('id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,provider_response,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,notes,created_at,updated_at')
    .eq('id', id)
    .maybeSingle()).data
  if (!current) throw httpError(404, 'Pago no encontrado')
  if (current.provider === 'stripe') {
    const stripe = requireStripeClient()
    if (!current.provider_payment_id) throw httpError(422, 'Pago Stripe sin referencia')
    if (!['paid', 'partially_refunded'].includes(current.status)) throw httpError(409, 'Pago no reembolsable')
    const remaining = roundMoney(toNumber(current.amount) - toNumber(current.refunded_amount))
    if (payload.amount > remaining) throw httpError(422, 'Reembolso excede el pago')
    await stripe.refunds.create(
      {
        payment_intent: current.provider_payment_id,
        amount: toMinorUnits(payload.amount),
        metadata: {
          payment_id: current.id,
          order_id: current.order_id,
          environment: stripeEnvironment(),
        },
      },
      { idempotencyKey: payload.idempotencyKey ?? `stripe-refund:${current.id}:${payload.amount}` },
    )
  }
  const result = await rpcClient(user).rpc('register_refund', {
    p_payment_id: id,
    p_amount: payload.amount,
    p_reason: payload.reason,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  const payment = await getPayment(id, user)
  const order = await getOrderById(current.order_id)
  if (order?.status === 'refunded') {
    await revokeOrderAccessPasses(order.id, 'payment_refunded')
    const reservationResult = await supabaseAdminClient
      .from('orders')
      .select('reservation_id')
      .eq('id', order.id)
      .maybeSingle()
    const reservationId = assertNoError<{ reservation_id?: string | null } | null>(reservationResult).data?.reservation_id
    if (reservationId) await revokeReservationAccessPasses(reservationId, 'payment_refunded')
  }
  return payment
}

export async function getPaymentReceipt(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient
    .from('payments')
    .select('id,receipt_storage_path')
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<{ id: string; receipt_storage_path?: string | null } | null>(result).data
  if (!row) throw httpError(404, 'Pago no encontrado')
  if (!row.receipt_storage_path) throw httpError(404, 'Comprobante no encontrado')

  const storage = (supabaseAdminClient as unknown as {
    storage?: { from: (bucket: string) => { createSignedUrl: (path: string, seconds: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }> } }
  }).storage
  if (!storage) throw httpError(503, 'Comprobante privado no disponible')
  const signed = await storage.from('documents').createSignedUrl(row.receipt_storage_path, 300)
  const data = assertNoError<{ signedUrl: string }>(signed).data
  return { data: { url: data.signedUrl, expiresIn: 300 } }
}

export async function createCustomerStripePaymentSession(orderId: string, user: UserContext): Promise<{ data: PaymentSessionData }> {
  const { customer, order } = await getOwnedOrder(orderId, user)
  if (order.status !== 'pending_payment') throw httpError(409, 'Orden no disponible para pago')
  await assertCompleteShippingAddress(order)
  const stripe = requireStripeClient()
  const stripeCustomerId = await getOrCreateStripeCustomer(customer, stripe)
  const customerSessionClientSecret = await createPaymentElementCustomerSession(stripe, stripeCustomerId)

  const { amount, amountMinor, currency } = await validateOrderAmount(order)
  const idempotencyKey = `stripe-payment-intent:${order.id}:${amountMinor}:${currency}`
  const existing = await findLatestStripePayment(order.id)

  if (
    existing?.provider_payment_id &&
    ['pending', 'processing'].includes(existing.status) &&
    toMinorUnits(toNumber(existing.amount)) === amountMinor &&
    existing.currency.trim().toLowerCase() === currency
  ) {
    const intent = await stripe.paymentIntents.retrieve(existing.provider_payment_id)
    if (
      intent.client_secret &&
      intent.amount === amountMinor &&
      intent.currency === currency &&
      !['succeeded', 'canceled'].includes(intent.status)
    ) {
      await writeStripePaymentFromIntent(order, intent, idempotencyKey)
      return {
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          provider: 'stripe',
          environment: stripeEnvironment(),
          clientSecret: intent.client_secret,
          customerSessionClientSecret,
          paymentIntentId: intent.id,
          amount,
          currency: currency.toUpperCase(),
          status: stripePaymentStatus(intent),
        },
      }
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountMinor,
      currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      customer: stripeCustomerId,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        source: 'customer_app',
        environment: stripeEnvironment(),
      },
      description: `Hacienda de Letras ${order.order_number}`,
    },
    { idempotencyKey },
  )

  if (!intent.client_secret) throw httpError(502, 'Stripe no devolvió client secret')
  await writeStripePaymentFromIntent(order, intent, idempotencyKey)
  await supabaseAdminClient
    .from('orders')
    .update({
      status: 'pending_payment',
      metadata: {
        ...(order.metadata ?? {}),
        stripePaymentIntentId: intent.id,
        paymentProvider: 'stripe',
        paymentEnvironment: stripeEnvironment(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return {
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      provider: 'stripe',
      environment: stripeEnvironment(),
      clientSecret: intent.client_secret,
      customerSessionClientSecret,
      paymentIntentId: intent.id,
      amount,
      currency: currency.toUpperCase(),
      status: stripePaymentStatus(intent),
    },
  }
}

export async function getCustomerStripePaymentStatus(orderId: string, user: UserContext): Promise<{ data: PaymentStatusData }> {
  const { order } = await getOwnedOrder(orderId, user)
  const payment = await findLatestStripePayment(order.id)
  const status = payment?.status ?? 'pending'
  return {
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: order.status,
      paymentStatus: status,
      provider: payment?.provider ?? null,
      amount: payment ? toNumber(payment.amount) : toNumber(order.total),
      currency: payment?.currency ?? order.currency,
      canRetry: order.status === 'pending_payment' && (!payment || ['failed', 'cancelled'].includes(status)),
      paidAt: order.paid_at ?? payment?.paid_at ?? null,
      failedAt: payment?.failed_at ?? null,
    },
  }
}

export async function retryCustomerStripePayment(orderId: string, user: UserContext): Promise<{ data: PaymentSessionData }> {
  const current = await getCustomerStripePaymentStatus(orderId, user)
  if (!current.data.canRetry) {
    if (current.data.paymentStatus === 'pending' || current.data.paymentStatus === 'processing') {
      return createCustomerStripePaymentSession(orderId, user)
    }
    throw httpError(409, 'Pago no disponible para reintento')
  }
  return createCustomerStripePaymentSession(orderId, user)
}

async function getOrderById(orderId: string) {
  const result = await supabaseAdminClient
    .from('orders')
    .select('id,order_number,user_id,customer_id,subtotal,discount_total,tax_total,shipping_total,total,currency,status,paid_at,requires_shipping,shipping_status,metadata')
    .eq('id', orderId)
    .maybeSingle()
  return assertNoError<CustomerOrderRow | null>(result).data
}

async function getCustomerById(customerId: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,email,first_name,last_name,display_name')
    .eq('id', customerId)
    .maybeSingle()
  return assertNoError<CustomerRow | null>(result).data
}

async function queueOrderPaidEmail(order: CustomerOrderRow) {
  const customer = await getCustomerById(order.customer_id)
  if (!customer?.email) return
  void enqueueAndProcessTransactionalEmail({
    eventType: 'order.paid',
    aggregateType: 'orders',
    aggregateId: order.id,
    customerId: customer.id,
    userId: order.user_id,
    recipientEmail: customer.email,
    locale: 'es-MX',
    payload: {
      customerName: customerName(customer),
      orderNumber: order.order_number,
      status: 'paid',
      total: toNumber(order.total),
      currency: order.currency,
      shippingStatus: order.requires_shipping ? 'pending_preparation' : 'not_required',
    },
    idempotencyKey: `order.paid:${order.id}`,
  }).catch(() => undefined)
}

async function persistIntentFromWebhook(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.order_id
  if (!orderId) return
  const order = await getOrderById(orderId)
  if (!order) return

  const { amountMinor, currency } = await validateOrderAmount(order)
  if (intent.amount !== amountMinor || intent.currency !== currency) {
    throw httpError(422, 'PaymentIntent inconsistente')
  }

  const payment = await writeStripePaymentFromIntent(order, intent, `stripe-webhook:${intent.id}`)
  const now = new Date().toISOString()
  const paymentStatus = stripePaymentStatus(intent)

  if (paymentStatus === 'paid') {
    await supabaseAdminClient
      .from('payments')
      .update({
        status: 'paid',
        paid_at: now,
        failed_at: null,
        provider_response: safeStripeIntent(intent),
        updated_at: now,
      })
      .eq('id', payment.id)
    await supabaseAdminClient
      .from('orders')
      .update({
        status: 'paid',
        paid_at: order.paid_at ?? now,
        updated_at: now,
      })
      .eq('id', order.id)
    await ensureEventTicketAccessPassesForPaidOrder(order.id)
    await ensureReservationAccessPassForPaidOrder(order.id)
    if (order.requires_shipping) await ensureOrderShippingAfterPayment(order.id)
    await queueOrderPaidEmail(order)
    recordPaymentActivity('payment_succeeded', order, payment.id, `payment-succeeded-${intent.id}`, 'succeeded')
    return
  }

  if (paymentStatus === 'processing') {
    await supabaseAdminClient
      .from('orders')
      .update({ status: 'processing', updated_at: now })
      .eq('id', order.id)
    recordPaymentActivity('payment_processing', order, payment.id, `payment-processing-${intent.id}`, 'processing')
    return
  }

  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    await supabaseAdminClient
      .from('payments')
      .update({
        status: paymentStatus,
        failed_at: paymentStatus === 'failed' ? now : null,
        provider_response: safeStripeIntent(intent),
        updated_at: now,
      })
      .eq('id', payment.id)
    await supabaseAdminClient
      .from('orders')
      .update({ status: 'pending_payment', updated_at: now })
      .eq('id', order.id)
    recordPaymentActivity(paymentStatus === 'failed' ? 'payment_failed' : 'payment_cancelled', order, payment.id, `payment-${paymentStatus}-${intent.id}`, paymentStatus)
  }
}

async function persistRefundFromWebhook(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
  if (!paymentIntentId) return
  const paymentResult = await supabaseAdminClient
    .from('payments')
    .select('id,order_id,provider,provider_payment_id,amount,currency,status,payment_method_type,payment_reference,provider_response,paid_at,failed_at,refunded_amount,refunded_at,refund_reason,provider_environment,notes,created_at,updated_at')
    .eq('provider', 'stripe')
    .eq('provider_payment_id', paymentIntentId)
    .maybeSingle()
  const payment = assertNoError<PaymentRow | null>(paymentResult).data
  if (!payment) return

  const refundedAmount = roundMoney(charge.amount_refunded / 100)
  const nextStatus = refundedAmount >= toNumber(payment.amount) ? 'refunded' : 'partially_refunded'
  const now = new Date().toISOString()
  await supabaseAdminClient
    .from('payments')
    .update({
      refunded_amount: refundedAmount,
      refunded_at: refundedAmount > 0 ? now : payment.refunded_at,
      status: nextStatus,
      provider_response: {
        chargeId: charge.id,
        amountRefunded: charge.amount_refunded,
        currency: charge.currency,
        paid: charge.paid,
        refunded: charge.refunded,
      },
      updated_at: now,
    })
    .eq('id', payment.id)

  if (nextStatus === 'refunded') {
    await supabaseAdminClient
      .from('orders')
      .update({ status: 'refunded', updated_at: now })
      .eq('id', payment.order_id)
    await revokeOrderAccessPasses(payment.order_id, 'stripe_refunded')
    const reservationResult = await supabaseAdminClient
      .from('orders')
      .select('reservation_id')
      .eq('id', payment.order_id)
      .maybeSingle()
    const reservationId = assertNoError<{ reservation_id?: string | null } | null>(reservationResult).data?.reservation_id
    if (reservationId) await revokeReservationAccessPasses(reservationId, 'stripe_refunded')
  }

  const orderResult = await supabaseAdminClient
    .from('orders')
    .select('id,order_number,user_id,customer_id,subtotal,discount_total,tax_total,shipping_total,total,currency,status,paid_at,requires_shipping,shipping_status,metadata')
    .eq('id', payment.order_id)
    .maybeSingle()
  const order = assertNoError<CustomerOrderRow | null>(orderResult).data
  if (order) recordPaymentActivity('payment_refunded', order, payment.id, `payment-refunded-${charge.id}`, 'succeeded')
}

async function handleStripeEvent(event: Stripe.Event) {
  if (event.type.startsWith('payment_intent.')) {
    await persistIntentFromWebhook(event.data.object as Stripe.PaymentIntent)
    return
  }
  if (event.type === 'charge.refunded') {
    await persistRefundFromWebhook(event.data.object as Stripe.Charge)
  }
}

export async function processPaymentWebhook(provider: string, payload: PaymentWebhookPayload | Buffer, signature?: string | string[]) {
  if (provider !== 'stripe') throw httpError(503, 'Proveedor de pago no configurado')
  if (!Buffer.isBuffer(payload)) throw httpError(400, 'Payload inválido')
  if (!isStripeWebhookConfigured()) throw httpError(503, 'Webhook Stripe no configurado')
  const stripe = requireStripeClient()
  const signatureValue = Array.isArray(signature) ? signature[0] : signature
  if (!signatureValue) throw httpError(400, 'Firma Stripe requerida')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signatureValue, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    throw httpError(400, 'Firma Stripe inválida')
  }

  const payloadHash = createHash('sha256').update(payload).digest('hex')
  const existingResult = await supabaseAdminClient
    .from('payment_webhook_events')
    .select('id,processed')
    .eq('provider', 'stripe')
    .eq('provider_event_id', event.id)
    .maybeSingle()
  const existing = assertNoError<{ id: string; processed: boolean } | null>(existingResult).data
  if (existing?.processed) {
    return { data: { received: true, duplicate: true } }
  }

  const eventPayload = {
    provider: 'stripe',
    provider_event_id: event.id,
    event_type: event.type,
    payload_hash: payloadHash,
    processed: false,
    provider_environment: stripeEnvironment() === 'live' ? 'provider' : 'sandbox',
    metadata: {
      livemode: event.livemode,
      apiVersion: event.api_version ?? null,
    },
  }
  const inserted = existing?.id
    ? { id: existing.id }
    : assertNoError<{ id: string }>(await supabaseAdminClient
      .from('payment_webhook_events')
      .insert(eventPayload)
      .select('id')
      .single()).data

  try {
    await handleStripeEvent(event)
    await supabaseAdminClient
      .from('payment_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_code: null,
      })
      .eq('id', inserted.id)
  } catch (error) {
    await supabaseAdminClient
      .from('payment_webhook_events')
      .update({
        error_code: error instanceof Error ? error.message.slice(0, 80) : 'WEBHOOK_PROCESSING_FAILED',
      })
      .eq('id', inserted.id)
    throw error
  }

  return { data: { received: true, duplicate: false } }
}

export async function exportPayments(query: PaymentListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listPayments({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'payment_reference',
    'order_number',
    'provider',
    'status',
    'amount',
    'currency',
    'method',
    'paid_at',
    'refunded_amount',
  ]
  const rows = data.map((item) => [
    item.paymentReference ?? '',
    item.orderNumber ?? '',
    item.provider,
    item.status,
    String(item.amount),
    item.currency,
    item.method ?? '',
    item.paidAt ?? '',
    String(item.refundedAmount),
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
