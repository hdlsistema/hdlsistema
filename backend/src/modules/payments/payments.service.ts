import { randomUUID } from 'crypto'
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
  ManualPaymentPayload,
  PaymentListQuery,
  PaymentWebhookPayload,
  RefundPaymentPayload,
} from './payments.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const financeRoles = ['super_admin', 'admin', 'finance']
const exportRoles = ['super_admin', 'admin', 'finance', 'viewer']

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
  return getPayment(String(result.data), user)
}

export async function refundPayment(id: string, payload: RefundPaymentPayload, user: UserContext) {
  requireOperationRole(user, financeRoles)
  const result = await rpcClient(user).rpc('register_refund', {
    p_payment_id: id,
    p_amount: payload.amount,
    p_reason: payload.reason,
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getPayment(id, user)
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

export function processPaymentWebhook(_provider: string, _payload: PaymentWebhookPayload) {
  throw httpError(503, 'Proveedor de pago no configurado')
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
