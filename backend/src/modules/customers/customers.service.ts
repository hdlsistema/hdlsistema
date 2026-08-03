import { supabaseAdminClient } from '../../config/supabase'
import { randomUUID } from 'crypto'
import {
  assertNoError,
  httpError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  CustomerListQuery,
  CustomerNotePayload,
  CustomerPatch,
  CustomerPayload,
  CustomerTagPatch,
  CustomerTagPayload,
} from './customers.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations', 'marketing']
const tagRoles = ['super_admin', 'admin', 'marketing']
const exportRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance']

const customerSelect = `
  id,customer_number,first_name,last_name,display_name,email,phone,phone_normalized,
  birth_date,source,segment,total_spend,total_visits,last_visit_at,notes,status,
  marketing_email_consent,marketing_push_consent,consent_updated_at,preferred_language,
  archived_at,created_at,updated_at,metadata
`

type CustomerRow = {
  id: string
  customer_number: string
  first_name: string
  last_name: string
  display_name?: string | null
  email?: string | null
  phone?: string | null
  phone_normalized?: string | null
  birth_date?: string | null
  source?: string | null
  segment?: string | null
  total_spend?: number | string | null
  total_visits?: number | string | null
  last_visit_at?: string | null
  notes?: string | null
  status: string
  marketing_email_consent?: boolean | null
  marketing_push_consent?: boolean | null
  consent_updated_at?: string | null
  preferred_language?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown> | null
}

type TagRow = {
  id: string
  name: string
  slug: string
  color?: string | null
  description?: string | null
  status?: string | null
  created_at: string
  updated_at?: string | null
}

type NoteRow = {
  id: string
  customer_id: string
  note: string
  created_at: string
  updated_at?: string | null
}

type ReservationRow = {
  id: string
  reservation_number: string
  customer_id: string
  people_count: number
  total: number | string
  currency: string
  status: string
  source?: string | null
  created_at: string
  updated_at: string
}

type OrderRow = {
  id: string
  order_number: string
  customer_id: string
  total: number | string
  currency: string
  status: string
  created_at: string
  updated_at: string
}

type MembershipRow = {
  id: string
  customer_id: string
  membership_number: string
  status: string
  points_balance: number
  starts_at: string
  ends_at?: string | null
  membership_plans?: {
    code: string
    name: string
    price: number | string
  } | Array<{
    code: string
    name: string
    price: number | string
  }> | null
}

type AuditRow = {
  id: string
  action: string
  entity_type: string
  created_at: string
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function normalizeEmail(value: string | null | undefined) {
  return value ? value.trim().toLocaleLowerCase('es-MX') : null
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/[^0-9+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 16) throw httpError(422, 'Teléfono inválido')
  return cleaned
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function displayName(row: Pick<CustomerRow, 'display_name' | 'first_name' | 'last_name'>) {
  return row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
}

function makeCustomerNumber() {
  const compact = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `CUST-${compact}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function customerMutation(payload: CustomerPayload | CustomerPatch, user: UserContext, current?: CustomerRow) {
  const patch: Record<string, unknown> = {}
  const nameChanged =
    ('firstName' in payload && payload.firstName !== undefined) ||
    ('lastName' in payload && payload.lastName !== undefined)
  const displayNameChanged = 'displayName' in payload && payload.displayName !== undefined
  if ('firstName' in payload && payload.firstName !== undefined) patch.first_name = payload.firstName
  if ('lastName' in payload && payload.lastName !== undefined) patch.last_name = payload.lastName ?? ''
  if (displayNameChanged) patch.display_name = payload.displayName
  if ('email' in payload && payload.email !== undefined) patch.email = normalizeEmail(payload.email)
  if ('phone' in payload && payload.phone !== undefined) {
    patch.phone = payload.phone
    patch.phone_normalized = normalizePhone(payload.phone)
  }
  if ('birthDate' in payload && payload.birthDate !== undefined) patch.birth_date = payload.birthDate
  if ('source' in payload && payload.source !== undefined) patch.source = payload.source
  if ('segment' in payload && payload.segment !== undefined) patch.segment = payload.segment
  if ('preferredLanguage' in payload && payload.preferredLanguage !== undefined) patch.preferred_language = payload.preferredLanguage
  if ('notes' in payload && payload.notes !== undefined) patch.notes = payload.notes
  if ('metadata' in payload && payload.metadata !== undefined) patch.metadata = payload.metadata

  const consentChanged =
    ('marketingEmailConsent' in payload && payload.marketingEmailConsent !== undefined) ||
    ('marketingPushConsent' in payload && payload.marketingPushConsent !== undefined)
  if ('marketingEmailConsent' in payload && payload.marketingEmailConsent !== undefined) {
    patch.marketing_email_consent = payload.marketingEmailConsent
  }
  if ('marketingPushConsent' in payload && payload.marketingPushConsent !== undefined) {
    patch.marketing_push_consent = payload.marketingPushConsent
  }
  if (consentChanged) {
    patch.consent_updated_at = new Date().toISOString()
    patch.consent_source = 'Centro de control'
    patch.consent_updated_by = user.userId ?? null
  }

  if (!displayNameChanged && (!current || nameChanged)) {
    const firstName = String(patch.first_name ?? current?.first_name ?? '').trim()
    const lastName = String(patch.last_name ?? current?.last_name ?? '').trim()
    patch.display_name = [firstName, lastName].filter(Boolean).join(' ').trim() || null
  }

  patch.updated_by = user.userId ?? null
  return patch
}

async function writeAudit(
  user: UserContext,
  action: string,
  entityType: string,
  entityId: string,
  beforeData: unknown,
  afterData: unknown,
) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
  })
}

async function assertNoDuplicate(email: string | null, phone: string | null, excludeId?: string) {
  if (!email && !phone) return
  let request: any = supabaseAdminClient
    .from('customers')
    .select('id,email,phone_normalized')
    .is('archived_at', null)
    .limit(1)
  const clauses: string[] = []
  if (email) clauses.push(`email.eq.${email}`)
  if (phone) clauses.push(`phone_normalized.eq.${phone}`)
  request = request.or(clauses.join(','))
  const rows = assertNoError<Array<{ id: string }>>(await request).data ?? []
  const duplicate = rows.find((row) => row.id !== excludeId)
  if (duplicate) throw httpError(409, 'Ya existe un cliente con ese correo o teléfono')
}

async function getCustomerOrThrow(id: string) {
  const result = await supabaseAdminClient
    .from('customers')
    .select(customerSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<CustomerRow | null>(result).data
  if (!row) throw httpError(404, 'Cliente no encontrado')
  return row
}

async function tagMap(customerIds: string[]) {
  if (!customerIds.length) return new Map<string, ReturnType<typeof mapTag>[]>()
  const result = await supabaseAdminClient
    .from('customer_tag_assignments')
    .select('customer_id,customer_tags(id,name,slug,color,description,status,created_at,updated_at)')
    .in('customer_id', customerIds)
  const rows = assertNoError<Array<{ customer_id: string; customer_tags: TagRow | TagRow[] | null }>>(result).data ?? []
  const map = new Map<string, ReturnType<typeof mapTag>[]>()
  for (const row of rows) {
    const tag = firstRelation(row.customer_tags)
    if (!tag || tag.status === 'archived') continue
    const current = map.get(row.customer_id) ?? []
    current.push(mapTag(tag))
    map.set(row.customer_id, current)
  }
  return map
}

async function relationRows(customerIds: string[]) {
  if (!customerIds.length) {
    return { reservations: [], orders: [], memberships: [] }
  }
  const [reservations, orders, memberships] = await Promise.all([
    supabaseAdminClient
      .from('reservations')
      .select('id,reservation_number,customer_id,people_count,total,currency,status,source,created_at,updated_at')
      .in('customer_id', customerIds),
    supabaseAdminClient
      .from('orders')
      .select('id,order_number,customer_id,total,currency,status,created_at,updated_at')
      .in('customer_id', customerIds),
    supabaseAdminClient
      .from('memberships')
      .select('id,customer_id,membership_number,status,points_balance,starts_at,ends_at,membership_plans(code,name,price)')
      .in('customer_id', customerIds),
  ])
  return {
    reservations: assertNoError<ReservationRow[]>(reservations).data ?? [],
    orders: assertNoError<OrderRow[]>(orders).data ?? [],
    memberships: assertNoError<MembershipRow[]>(memberships).data ?? [],
  }
}

function statsFor(
  row: CustomerRow,
  reservations: ReservationRow[],
  orders: OrderRow[],
  memberships: MembershipRow[],
) {
  const completedReservations = reservations.filter((item) => ['confirmed', 'completed'].includes(item.status))
  const revenueOrders = orders.filter((item) => ['paid', 'processing', 'fulfilled'].includes(item.status))
  const orderSpend = revenueOrders.reduce((sum, item) => sum + toNumber(item.total), 0)
  const totalSpend = orderSpend || toNumber(row.total_spend)
  const totalVisits = completedReservations.length || toNumber(row.total_visits)
  return {
    reservationsCount: reservations.length,
    ordersCount: orders.length,
    membershipsCount: memberships.length,
    activeMembershipsCount: memberships.filter((item) => item.status === 'active').length,
    totalSpend,
    totalVisits,
    averageTicket: orders.length ? totalSpend / orders.length : 0,
  }
}

function mapCustomer(
  row: CustomerRow,
  relations: { reservations: ReservationRow[]; orders: OrderRow[]; memberships: MembershipRow[] },
  tags: ReturnType<typeof mapTag>[] = [],
) {
  const stats = statsFor(row, relations.reservations, relations.orders, relations.memberships)
  return {
    id: row.id,
    customerNumber: row.customer_number,
    displayName: displayName(row),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    birthDate: row.birth_date ?? null,
    source: row.source ?? null,
    segment: row.segment ?? 'customer',
    status: row.status,
    preferredLanguage: row.preferred_language ?? 'es',
    marketingEmailConsent: Boolean(row.marketing_email_consent),
    marketingPushConsent: Boolean(row.marketing_push_consent),
    consentUpdatedAt: row.consent_updated_at ?? null,
    totalSpend: stats.totalSpend,
    totalVisits: stats.totalVisits,
    reservationsCount: stats.reservationsCount,
    ordersCount: stats.ordersCount,
    membershipsCount: stats.membershipsCount,
    activeMembershipsCount: stats.activeMembershipsCount,
    averageTicket: stats.averageTicket,
    lastVisitAt: row.last_visit_at ?? null,
    notes: row.notes ?? null,
    tags,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color ?? '#681126',
    description: row.description ?? null,
    status: row.status ?? 'published',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

function mapNote(row: NoteRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

async function relatedCustomerIds(query: CustomerListQuery) {
  const sets: Array<Set<string>> = []
  if (query.hasReservations === 'true') {
    const rows = assertNoError<Array<{ customer_id: string }>>(
      await supabaseAdminClient.from('reservations').select('customer_id'),
    ).data ?? []
    sets.push(new Set(rows.map((row) => row.customer_id)))
  }
  if (query.hasOrders === 'true') {
    const rows = assertNoError<Array<{ customer_id: string }>>(
      await supabaseAdminClient.from('orders').select('customer_id'),
    ).data ?? []
    sets.push(new Set(rows.map((row) => row.customer_id)))
  }
  if (query.hasMembership === 'true') {
    const rows = assertNoError<Array<{ customer_id: string }>>(
      await supabaseAdminClient.from('memberships').select('customer_id').eq('status', 'active'),
    ).data ?? []
    sets.push(new Set(rows.map((row) => row.customer_id)))
  }
  if (query.tagId) {
    const rows = assertNoError<Array<{ customer_id: string }>>(
      await supabaseAdminClient.from('customer_tag_assignments').select('customer_id').eq('tag_id', query.tagId),
    ).data ?? []
    sets.push(new Set(rows.map((row) => row.customer_id)))
  }
  if (!sets.length) return null
  return Array.from(sets.reduce((current, next) => new Set([...current].filter((id) => next.has(id)))))
}

function applyListFilters(request: any, query: CustomerListQuery) {
  let next = request
  if (query.status) {
    next = next.eq('status', query.status)
  } else {
    next = next.is('archived_at', null)
  }
  if (query.segment) next = next.eq('segment', query.segment)
  if (query.source) next = next.eq('source', query.source)
  if (query.consent === 'email') next = next.eq('marketing_email_consent', true)
  if (query.consent === 'push') next = next.eq('marketing_push_consent', true)
  if (query.consent === 'none') {
    next = next.eq('marketing_email_consent', false).eq('marketing_push_consent', false)
  }
  if (query.search) {
    const value = query.search.replace(/[%(),]/g, '').trim()
    next = next.or([
      `first_name.ilike.%${value}%`,
      `last_name.ilike.%${value}%`,
      `display_name.ilike.%${value}%`,
      `email.ilike.%${value}%`,
      `phone.ilike.%${value}%`,
      `customer_number.ilike.%${value}%`,
    ].join(','))
  }
  return next
}

export async function listCustomers(query: CustomerListQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const relationIds = await relatedCustomerIds(query)
  if (relationIds && relationIds.length === 0) {
    return { data: [], count: 0 }
  }

  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  let request = applyListFilters(
    supabaseAdminClient
      .from('customers')
      .select(customerSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  )
  if (relationIds) request = request.in('id', relationIds)

  const result = await request.range(from, to)
  const rows = assertNoError<CustomerRow[]>(result).data ?? []
  const ids = rows.map((row) => row.id)
  const [tags, relations] = await Promise.all([tagMap(ids), relationRows(ids)])
  return {
    data: rows.map((row) => mapCustomer(row, {
      reservations: relations.reservations.filter((item) => item.customer_id === row.id),
      orders: relations.orders.filter((item) => item.customer_id === row.id),
      memberships: relations.memberships.filter((item) => item.customer_id === row.id),
    }, tags.get(row.id) ?? [])),
    count: result.count ?? rows.length,
  }
}

export async function getCustomer(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const row = await getCustomerOrThrow(id)
  const [tags, relations, notes] = await Promise.all([
    tagMap([id]),
    relationRows([id]),
    listCustomerNotes(id, user),
  ])
  return {
    data: {
      ...mapCustomer(row, relations, tags.get(id) ?? []),
      recentNotes: notes.data.slice(0, 5),
    },
  }
}

export async function createCustomer(payload: CustomerPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const phone = normalizePhone(payload.phone)
  const email = normalizeEmail(payload.email)
  await assertNoDuplicate(email, phone)
  const patch = customerMutation(payload, user)
  const result = await supabaseAdminClient
    .from('customers')
    .insert({
      customer_number: makeCustomerNumber(),
      first_name: payload.firstName,
      last_name: payload.lastName ?? '',
      email,
      phone: payload.phone ?? null,
      phone_normalized: phone,
      source: payload.source,
      segment: payload.segment,
      status: 'published',
      created_by: user.userId ?? null,
      ...patch,
    })
    .select(customerSelect)
    .single()
  const row = assertNoError<CustomerRow>(result).data
  await writeAudit(user, 'customer_created', 'customers', row.id, null, row)
  return getCustomer(row.id, user)
}

export async function updateCustomer(id: string, payload: CustomerPatch, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const current = await getCustomerOrThrow(id)
  const email = 'email' in payload ? normalizeEmail(payload.email) : current.email ?? null
  const phone = 'phone' in payload ? normalizePhone(payload.phone) : current.phone_normalized ?? null
  await assertNoDuplicate(email, phone, id)
  const result = await supabaseAdminClient
    .from('customers')
    .update(customerMutation(payload, user, current))
    .eq('id', id)
    .select(customerSelect)
    .single()
  const row = assertNoError<CustomerRow>(result).data
  await writeAudit(user, 'customer_updated', 'customers', id, current, row)
  return getCustomer(id, user)
}

export async function archiveCustomer(id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const current = await getCustomerOrThrow(id)
  const result = await supabaseAdminClient
    .from('customers')
    .update({ status: 'archived', archived_at: new Date().toISOString(), updated_by: user.userId ?? null })
    .eq('id', id)
    .select(customerSelect)
    .single()
  const row = assertNoError<CustomerRow>(result).data
  await writeAudit(user, 'customer_archived', 'customers', id, current, row)
  return getCustomer(id, user)
}

export async function restoreCustomer(id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const current = await getCustomerOrThrow(id)
  const result = await supabaseAdminClient
    .from('customers')
    .update({ status: 'published', archived_at: null, updated_by: user.userId ?? null })
    .eq('id', id)
    .select(customerSelect)
    .single()
  const row = assertNoError<CustomerRow>(result).data
  await writeAudit(user, 'customer_restored', 'customers', id, current, row)
  return getCustomer(id, user)
}

export async function listCustomerReservations(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getCustomerOrThrow(id)
  const rows = assertNoError<ReservationRow[]>(
    await supabaseAdminClient
      .from('reservations')
      .select('id,reservation_number,customer_id,people_count,total,currency,status,source,created_at,updated_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ).data ?? []
  return { data: rows.map((item) => ({
    id: item.id,
    reservationNumber: item.reservation_number,
    peopleCount: item.people_count,
    total: toNumber(item.total),
    currency: item.currency,
    status: item.status,
    source: item.source ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  })) }
}

export async function listCustomerOrders(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getCustomerOrThrow(id)
  const rows = assertNoError<OrderRow[]>(
    await supabaseAdminClient
      .from('orders')
      .select('id,order_number,customer_id,total,currency,status,created_at,updated_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ).data ?? []
  return { data: rows.map((item) => ({
    id: item.id,
    orderNumber: item.order_number,
    total: toNumber(item.total),
    currency: item.currency,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  })) }
}

export async function listCustomerMemberships(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getCustomerOrThrow(id)
  const rows = assertNoError<MembershipRow[]>(
    await supabaseAdminClient
      .from('memberships')
      .select('id,customer_id,membership_number,status,points_balance,starts_at,ends_at,membership_plans(code,name,price)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ).data ?? []
  return { data: rows.map((item) => {
    const plan = firstRelation(item.membership_plans)
    return {
      id: item.id,
      membershipNumber: item.membership_number,
      status: item.status,
      pointsBalance: item.points_balance,
      startsAt: item.starts_at,
      endsAt: item.ends_at ?? null,
      plan: plan ? { code: plan.code, name: plan.name, price: toNumber(plan.price) } : null,
    }
  }) }
}

export async function listCustomerHistory(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  await getCustomerOrThrow(id)
  const rows = assertNoError<AuditRow[]>(
    await supabaseAdminClient
      .from('audit_logs')
      .select('id,action,entity_type,created_at')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ).data ?? []
  return { data: rows.map((item) => ({
    id: item.id,
    action: item.action,
    entityType: item.entity_type,
    createdAt: item.created_at,
  })) }
}

export async function listCustomerNotes(id: string, user: UserContext) {
  requireOperationRole(user, readRoles)
  const rows = assertNoError<NoteRow[]>(
    await supabaseAdminClient
      .from('customer_notes')
      .select('id,customer_id,note,created_at,updated_at')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ).data ?? []
  return { data: rows.map(mapNote) }
}

export async function addCustomerNote(id: string, payload: CustomerNotePayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await getCustomerOrThrow(id)
  const result = await supabaseAdminClient
    .from('customer_notes')
    .insert({
      customer_id: id,
      author_user_id: user.userId ?? null,
      updated_by: user.userId ?? null,
      note: payload.note,
      metadata: payload.metadata ?? {},
    })
    .select('id,customer_id,note,created_at,updated_at')
    .single()
  const row = assertNoError<NoteRow>(result).data
  await writeAudit(user, 'customer_note_created', 'customer_notes', row.id, null, row)
  return { data: mapNote(row) }
}

export async function updateCustomerNote(id: string, noteId: string, payload: CustomerNotePayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('customer_notes')
    .update({
      note: payload.note,
      updated_by: user.userId ?? null,
      metadata: payload.metadata ?? {},
    })
    .eq('id', noteId)
    .eq('customer_id', id)
    .is('deleted_at', null)
    .select('id,customer_id,note,created_at,updated_at')
    .single()
  const row = assertNoError<NoteRow>(result).data
  await writeAudit(user, 'customer_note_updated', 'customer_notes', row.id, null, row)
  return { data: mapNote(row) }
}

export async function deleteCustomerNote(id: string, noteId: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('customer_notes')
    .update({ deleted_at: new Date().toISOString(), updated_by: user.userId ?? null })
    .eq('id', noteId)
    .eq('customer_id', id)
    .is('deleted_at', null)
    .select('id,customer_id,note,created_at,updated_at')
    .single()
  const row = assertNoError<NoteRow>(result).data
  await writeAudit(user, 'customer_note_deleted', 'customer_notes', row.id, row, null)
  return { data: mapNote(row) }
}

export async function listCustomerTags(user: UserContext) {
  requireOperationRole(user, readRoles)
  const rows = assertNoError<TagRow[]>(
    await supabaseAdminClient
      .from('customer_tags')
      .select('id,name,slug,color,description,status,created_at,updated_at')
      .is('deleted_at', null)
      .order('name', { ascending: true }),
  ).data ?? []
  return { data: rows.map(mapTag) }
}

export async function createCustomerTag(payload: CustomerTagPayload, user: UserContext) {
  requireOperationRole(user, tagRoles)
  const slug = payload.slug ?? slugify(payload.name)
  const result = await supabaseAdminClient
    .from('customer_tags')
    .insert({
      name: payload.name,
      slug,
      color: payload.color,
      description: payload.description ?? null,
      created_by: user.userId ?? null,
      updated_by: user.userId ?? null,
      metadata: payload.metadata ?? {},
    })
    .select('id,name,slug,color,description,status,created_at,updated_at')
    .single()
  const row = assertNoError<TagRow>(result).data
  await writeAudit(user, 'customer_tag_created', 'customer_tags', row.id, null, row)
  return { data: mapTag(row) }
}

export async function updateCustomerTag(id: string, payload: CustomerTagPatch, user: UserContext) {
  requireOperationRole(user, tagRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId ?? null }
  if (payload.name) patch.name = payload.name
  if (payload.slug) patch.slug = payload.slug
  if (payload.color) patch.color = payload.color
  if ('description' in payload) patch.description = payload.description ?? null
  if (payload.metadata) patch.metadata = payload.metadata
  const result = await supabaseAdminClient
    .from('customer_tags')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id,name,slug,color,description,status,created_at,updated_at')
    .single()
  const row = assertNoError<TagRow>(result).data
  await writeAudit(user, 'customer_tag_updated', 'customer_tags', id, null, row)
  return { data: mapTag(row) }
}

export async function deleteCustomerTag(id: string, user: UserContext) {
  requireOperationRole(user, tagRoles)
  const result = await supabaseAdminClient
    .from('customer_tags')
    .update({ status: 'archived', deleted_at: new Date().toISOString(), updated_by: user.userId ?? null })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id,name,slug,color,description,status,created_at,updated_at')
    .single()
  const row = assertNoError<TagRow>(result).data
  await writeAudit(user, 'customer_tag_archived', 'customer_tags', id, row, null)
  return { data: mapTag(row) }
}

export async function assignCustomerTag(id: string, tagId: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  await getCustomerOrThrow(id)
  const tag = assertNoError<TagRow | null>(
    await supabaseAdminClient
      .from('customer_tags')
      .select('id,name,slug,color,description,status,created_at,updated_at')
      .eq('id', tagId)
      .is('deleted_at', null)
      .maybeSingle(),
  ).data
  if (!tag) throw httpError(404, 'Etiqueta no encontrada')
  await supabaseAdminClient.from('customer_tag_assignments').upsert({
    customer_id: id,
    tag_id: tagId,
    assigned_by: user.userId ?? null,
  })
  await writeAudit(user, 'customer_tag_assigned', 'customer_tag_assignments', id, null, { customerId: id, tagId })
  return { data: mapTag(tag) }
}

export async function unassignCustomerTag(id: string, tagId: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('customer_tag_assignments')
    .delete()
    .eq('customer_id', id)
    .eq('tag_id', tagId)
    .select('customer_id,tag_id')
    .single()
  const row = assertNoError<{ customer_id: string; tag_id: string }>(result).data
  await writeAudit(user, 'customer_tag_removed', 'customer_tag_assignments', id, row, null)
  return { data: { customerId: row.customer_id, tagId: row.tag_id } }
}

export async function exportCustomers(query: CustomerListQuery, user: UserContext) {
  requireOperationRole(user, exportRoles)
  const { data } = await listCustomers({ ...query, page: 1, perPage: 100 }, user)
  const headers = [
    'customer_number',
    'display_name',
    'email',
    'phone',
    'segment',
    'source',
    'preferred_language',
    'marketing_email_consent',
    'marketing_push_consent',
    'reservations_count',
    'orders_count',
    'active_memberships_count',
    'total_spend',
    'total_visits',
    'created_at',
    'updated_at',
  ]
  const rows = data.map((item) => [
    item.customerNumber,
    item.displayName,
    item.email ?? '',
    item.phone ?? '',
    item.segment,
    item.source ?? '',
    item.preferredLanguage,
    String(item.marketingEmailConsent),
    String(item.marketingPushConsent),
    String(item.reservationsCount),
    String(item.ordersCount),
    String(item.activeMembershipsCount),
    String(item.totalSpend),
    String(item.totalVisits),
    item.createdAt,
    item.updatedAt,
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
