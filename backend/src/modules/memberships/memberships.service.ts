import { randomUUID } from 'crypto'
import { createSupabaseUserRequestClient, supabaseAdminClient } from '../../config/supabase'
import {
  assertNoError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import type {
  CreateMembershipPayload,
  MembershipListQuery,
  PatchMembershipPayload,
} from './memberships.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const writeRoles = ['super_admin', 'admin', 'finance']
const exportRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']

type Relation<T> = T | T[] | null
type MembershipRow = {
  id: string
  customer_id: string
  plan_id: string
  membership_number: string
  status: string
  starts_at: string
  renewal_date?: string | null
  expires_at?: string | null
  ends_at?: string | null
  auto_renew: boolean
  points_balance: number
  cancellation_reason?: string | null
  created_at: string
  updated_at: string
  customers?: Relation<{ customer_number: string; display_name?: string | null; first_name: string; last_name: string; email?: string | null }>
  membership_plans?: Relation<{ code: string; name: string; billing_period: string; price: number | string }>
}
type BenefitRow = {
  id: string
  membership_id: string
  benefit_code: string
  description?: string | null
  usage_limit?: number | null
  used_count: number
  valid_from?: string | null
  valid_until?: string | null
}
type LoyaltyRow = {
  id: string
  membership_id: string
  transaction_type: string
  points: number
  reference_type?: string | null
  reference_id?: string | null
  description?: string | null
  created_at: string
}
type AuditRow = { id: string; action: string; entity_type: string; created_at: string }

const membershipSelect = `
  id,customer_id,plan_id,membership_number,status,starts_at,renewal_date,expires_at,ends_at,auto_renew,
  points_balance,cancellation_reason,created_at,updated_at,
  customers(customer_number,display_name,first_name,last_name,email),
  membership_plans(code,name,billing_period,price)
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function first<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function customerName(row: MembershipRow) {
  const customer = first(row.customers)
  return customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
}

function mapMembership(row: MembershipRow) {
  const customer = first(row.customers)
  const plan = first(row.membership_plans)
  return {
    id: row.id,
    membershipNumber: row.membership_number,
    customerId: row.customer_id,
    customerNumber: customer?.customer_number ?? null,
    customerName: customerName(row),
    customerEmail: customer?.email ?? null,
    planId: row.plan_id,
    planCode: plan?.code ?? null,
    planName: plan?.name ?? null,
    billingPeriod: plan?.billing_period ?? null,
    planPrice: toNumber(plan?.price),
    status: row.status,
    startsAt: row.starts_at,
    renewalDate: row.renewal_date ?? null,
    expiresAt: row.expires_at ?? row.ends_at ?? null,
    autoRenew: row.auto_renew,
    pointsBalance: row.points_balance,
    cancellationReason: row.cancellation_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function queueMembershipEmail(action: 'activate' | 'renew', membership: ReturnType<typeof mapMembership>, user: UserContext) {
  const eventType = action === 'activate' ? 'membership.activated' : 'membership.renewed'
  void enqueueAndProcessTransactionalEmail({
    eventType,
    aggregateType: 'memberships',
    aggregateId: membership.id,
    customerId: membership.customerId,
    userId: user.userId ?? null,
    recipientEmail: membership.customerEmail,
    locale: null,
    payload: {
      customerName: membership.customerName,
      membershipNumber: membership.membershipNumber,
      planName: membership.planName,
      status: membership.status,
      renewalDate: membership.renewalDate,
      expiresAt: membership.expiresAt,
    },
    idempotencyKey: `${eventType}:${membership.id}:${membership.customerEmail ?? 'no-email'}`,
  }).catch(() => undefined)
}

function applyFilters(request: any, query: MembershipListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.customerId) next = next.eq('customer_id', query.customerId)
  if (query.planId) next = next.eq('plan_id', query.planId)
  if (query.active !== undefined) {
    next = query.active ? next.in('status', ['pending', 'active', 'paused']) : next.in('status', ['cancelled', 'expired'])
  }
  if (query.renewalFrom) next = next.gte('renewal_date', `${query.renewalFrom}T00:00:00.000Z`)
  if (query.renewalTo) next = next.lte('renewal_date', `${query.renewalTo}T23:59:59.999Z`)
  if (query.expirationFrom) next = next.gte('expires_at', `${query.expirationFrom}T00:00:00.000Z`)
  if (query.expirationTo) next = next.lte('expires_at', `${query.expirationTo}T23:59:59.999Z`)
  if (query.minPoints !== undefined) next = next.gte('points_balance', query.minPoints)
  if (query.maxPoints !== undefined) next = next.lte('points_balance', query.maxPoints)
  if (query.search) {
    const safe = query.search.replace(/[%(),]/g, '').trim()
    next = next.or(`membership_number.ilike.%${safe}%`)
  }
  return next
}

export async function listMemberships(query: MembershipListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const result = await applyFilters(
    supabaseAdminClient
      .from('memberships')
      .select(membershipSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  return {
    data: (assertNoError<MembershipRow[]>(result).data ?? []).map(mapMembership),
    count: result.count ?? 0,
  }
}

export async function getMembership(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const result = await supabaseAdminClient.from('memberships').select(membershipSelect).eq('id', id).maybeSingle()
  const row = assertNoError<MembershipRow | null>(result).data
  if (!row) throw Object.assign(new Error('Membresía no encontrada'), { statusCode: 404, isOperational: true })
  return { data: mapMembership(row) }
}

export async function createMembership(payload: CreateMembershipPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('assign_membership', {
    p_customer_id: payload.customerId,
    p_plan_id: payload.planId,
    p_start_date: payload.startDate ?? new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey ?? randomUUID(),
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getMembership(String(result.data), user)
}

export async function patchMembership(id: string, payload: PatchMembershipPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const current = await getMembership(id, user)
  if (['cancelled', 'expired'].includes(current.data.status)) {
    throw Object.assign(new Error('No se puede editar una membresía cerrada'), { statusCode: 422, isOperational: true })
  }
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if (payload.planId) patch.plan_id = payload.planId
  if (payload.autoRenew !== undefined) patch.auto_renew = payload.autoRenew
  if (payload.metadata) patch.metadata = payload.metadata
  assertNoError(await supabaseAdminClient.from('memberships').update(patch).eq('id', id).select('id').single())
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId,
    action: 'membership_updated',
    entity_type: 'memberships',
    entity_id: id,
    after_data: { fields: Object.keys(patch).filter((key) => !['updated_by', 'updated_at'].includes(key)) },
  })
  return getMembership(id, user)
}

export async function runMembershipAction(id: string, action: 'activate' | 'pause' | 'resume' | 'cancel' | 'renew', reason: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const rpcMap = {
    activate: 'activate_membership',
    pause: 'pause_membership',
    resume: 'resume_membership',
    cancel: 'cancel_membership',
    renew: 'renew_membership',
  } as const
  const params =
    action === 'activate' || action === 'resume'
      ? { p_membership_id: id }
      : action === 'renew'
        ? { p_membership_id: id, p_idempotency_key: randomUUID() }
        : { p_membership_id: id, p_reason: reason ?? null }
  const result = await rpcClient(user).rpc(rpcMap[action], params)
  if (result.error) normalizeDatabaseError(result.error)
  const response = await getMembership(String(result.data), user)
  if (action === 'activate' || action === 'renew') queueMembershipEmail(action, response.data, user)
  return response
}

export async function listMembershipBenefits(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getMembership(id, user)
  const result = await supabaseAdminClient
    .from('membership_benefits')
    .select('id,membership_id,benefit_code,description,usage_limit,used_count,valid_from,valid_until')
    .eq('membership_id', id)
    .order('created_at', { ascending: true })
  const rows = assertNoError<BenefitRow[]>(result).data ?? []
  return {
    data: rows.map((row) => ({
      id: row.id,
      membershipId: row.membership_id,
      benefitCode: row.benefit_code,
      description: row.description ?? null,
      usageLimit: row.usage_limit ?? null,
      usedCount: row.used_count,
      validFrom: row.valid_from ?? null,
      validUntil: row.valid_until ?? null,
    })),
  }
}

export async function listMembershipLoyalty(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getMembership(id, user)
  const result = await supabaseAdminClient
    .from('loyalty_transactions')
    .select('id,membership_id,transaction_type,points,reference_type,reference_id,description,created_at')
    .eq('membership_id', id)
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = assertNoError<LoyaltyRow[]>(result).data ?? []
  return {
    data: rows.map((row) => ({
      id: row.id,
      membershipId: row.membership_id,
      transactionType: row.transaction_type,
      points: row.points,
      referenceType: row.reference_type ?? null,
      referenceId: row.reference_id ?? null,
      description: row.description ?? null,
      createdAt: row.created_at,
    })),
  }
}

export async function adjustLoyalty(id: string, points: number, reason: string, idempotencyKey: string | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('adjust_loyalty_points', {
    p_membership_id: id,
    p_points: points,
    p_reason: reason,
    p_idempotency_key: idempotencyKey ?? randomUUID(),
  })
  if (result.error) normalizeDatabaseError(result.error)
  return listMembershipLoyalty(id, user)
}

export async function grantOrderLoyalty(id: string, orderId: string, points: number | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await rpcClient(user).rpc('grant_order_loyalty_points', {
    p_membership_id: id,
    p_order_id: orderId,
    p_points: points ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return listMembershipLoyalty(id, user)
}

export async function listMembershipHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getMembership(id, user)
  const result = await supabaseAdminClient
    .from('audit_logs')
    .select('id,action,entity_type,created_at')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  return {
    data: (assertNoError<AuditRow[]>(result).data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      createdAt: row.created_at,
    })),
  }
}

export async function exportMemberships(query: MembershipListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listMemberships({ ...query, page: 1, perPage: 100 }, user)
  const headers = ['membership_number', 'customer', 'plan', 'status', 'start_date', 'renewal_date', 'expiration_date', 'points']
  const rows = data.map((item) => [
    item.membershipNumber,
    item.customerName,
    item.planName ?? '',
    item.status,
    item.startsAt,
    item.renewalDate ?? '',
    item.expiresAt ?? '',
    String(item.pointsBalance),
  ])
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}
