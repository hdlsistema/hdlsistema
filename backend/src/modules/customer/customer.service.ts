import {
  createSupabaseUserRequestClient,
  supabaseAdminClient,
} from '../../config/supabase'
import {
  ensureReservationAccessPass,
  listCustomerAccessPasses,
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
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { recordBusinessActivity } from '../activity/activity.service'
import type { AppEventName } from '../activity/activity.schemas'
import type {
  CancelCustomerReservationPayload,
  AddCustomerCartItemPayload,
  CreateCustomerOrderPayload,
  CustomerAddressPayload,
  CustomerAddressUpdatePayload,
  CreateCustomerReservationPayload,
  CustomerAvailabilityQuery,
  CustomerProfilePatch,
  CustomerReservationListQuery,
  RegisterCustomerDevicePayload,
  RescheduleCustomerReservationPayload,
  UpdateCustomerCartItemPayload,
} from './customer.schemas'

const customerRoles = ['customer', 'super_admin', 'admin']

type Relation<T> = T | T[] | null
type CustomerRow = {
  id: string
  user_id: string | null
  customer_number: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  status: string
}
type ReservationRow = {
  id: string
  reservation_number: string
  customer_id: string
  user_id?: string | null
  experience_id?: string | null
  experience_slot_id?: string | null
  people_count: number
  subtotal: number
  total: number
  currency: string
  status: string
  customer_notes?: string | null
  confirmed_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  rescheduled_at?: string | null
  created_at: string
  updated_at: string
  experiences?: Relation<{ id: string; title: string; slug: string; cover_image_url?: string | null; location?: string | null }>
  experience_slots?: Relation<{ id: string; start_at: string; end_at: string; capacity: number; confirmed_count?: number | null; reserved_count?: number | null }>
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
type AuditRow = {
  id: string
  action: string
  entity_type: string
  created_at: string
}
type CustomerReservationData = ReturnType<typeof mapReservation>

type CustomerAddressRow = {
  id: string
  customer_id: string
  user_id?: string | null
  label: string
  recipient_name: string
  phone?: string | null
  email?: string | null
  line1: string
  line2?: string | null
  neighborhood?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  references?: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

type OrderShippingAddressRow = {
  id: string
  order_id: string
  customer_id: string
  user_id?: string | null
  label: string
  recipient_name: string
  phone?: string | null
  email?: string | null
  line1: string
  line2?: string | null
  neighborhood?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  references?: string | null
  created_at: string
}

type ShipmentRow = {
  id: string
  order_id: string
  shipment_number?: string | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  status_text: string
  tracking_assigned_at?: string | null
  handed_to_carrier_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at: string
}

const reservationSelect = `
  id,reservation_number,customer_id,user_id,experience_id,experience_slot_id,people_count,
  subtotal,total,currency,status,customer_notes,confirmed_at,cancelled_at,cancellation_reason,
  rescheduled_at,created_at,updated_at,
  experiences(id,title,slug,cover_image_url,location),
  experience_slots(id,start_at,end_at,capacity,confirmed_count,reserved_count)
`

function rpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

function assertCustomerAccess(user: UserContext) {
  requireOperationRole(user, customerRoles)
}

function first<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function toDate(value?: string) {
  return value ? `${value}T00:00:00.000Z` : null
}

function mapReservation(row: ReservationRow) {
  const experience = first(row.experiences)
  const slot = first(row.experience_slots)
  const confirmed = Number(slot?.confirmed_count ?? slot?.reserved_count ?? 0)
  const capacity = Number(slot?.capacity ?? 0)
  return {
    id: row.id,
    reservationNumber: row.reservation_number,
    status: row.status,
    peopleCount: row.people_count,
    subtotal: row.subtotal,
    total: row.total,
    currency: row.currency,
    customerNotes: row.customer_notes ?? null,
    experienceId: experience?.id ?? row.experience_id ?? null,
    experienceTitle: experience?.title ?? 'Experiencia',
    experienceSlug: experience?.slug ?? null,
    coverImageUrl: experience?.cover_image_url ?? null,
    location: experience?.location ?? null,
    slotId: slot?.id ?? row.experience_slot_id ?? null,
    startAt: slot?.start_at ?? null,
    endAt: slot?.end_at ?? null,
    available: Math.max(capacity - confirmed, 0),
    confirmedAt: row.confirmed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    rescheduledAt: row.rescheduled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function withReservationAccessPass(reservation: CustomerReservationData) {
  const accessPass = await ensureReservationAccessPass({
    id: reservation.id,
    status: reservation.status,
    peopleCount: reservation.peopleCount,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
  })
  return { ...reservation, accessPass }
}

function customerDisplayName(customer: CustomerRow) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email || 'Cliente'
}

function mapCustomerAddress(row: CustomerAddressRow) {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    line1: row.line1,
    line2: row.line2 ?? null,
    neighborhood: row.neighborhood ?? null,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    references: row.references ?? null,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrderShippingAddress(row?: OrderShippingAddressRow | null) {
  if (!row) return null
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    line1: row.line1,
    line2: row.line2 ?? null,
    neighborhood: row.neighborhood ?? null,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    references: row.references ?? null,
    createdAt: row.created_at,
  }
}

function mapShipment(row?: ShipmentRow | null) {
  if (!row) return null
  return {
    id: row.id,
    shipmentNumber: row.shipment_number ?? null,
    carrier: row.carrier ?? null,
    trackingNumber: row.tracking_number ?? null,
    trackingUrl: row.tracking_url ?? null,
    status: row.status_text,
    trackingAssignedAt: row.tracking_assigned_at ?? null,
    handedToCarrierAt: row.handed_to_carrier_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function addressInsert(customer: CustomerRow, user: UserContext, payload: CustomerAddressPayload | CustomerAddressUpdatePayload) {
  return {
    customer_id: customer.id,
    user_id: user.userId,
    label: payload.label ?? 'Casa',
    recipient_name: payload.recipientName,
    phone: payload.phone ?? null,
    email: payload.email ?? customer.email ?? null,
    line1: payload.line1,
    line2: payload.line2 ?? null,
    neighborhood: payload.neighborhood ?? null,
    city: payload.city,
    state: payload.state,
    postal_code: payload.postalCode,
    country: payload.country ?? 'MX',
    references: payload.references ?? null,
    is_default: payload.isDefault ?? false,
  }
}

function cartRequiresShipping(cart: unknown) {
  const data = cart && typeof cart === 'object' ? cart as Record<string, unknown> : {}
  const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : []
  return items.some((item) => item.itemType === 'wine' || item.item_type === 'wine')
}

async function loadOrderShipping(orderId: string) {
  const [addressResult, shipmentResult] = await Promise.all([
    supabaseAdminClient
      .from('order_shipping_addresses')
      .select('id,order_id,customer_id,user_id,label,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,created_at')
      .eq('order_id', orderId)
      .maybeSingle(),
    supabaseAdminClient
      .from('shipments')
      .select('id,order_id,shipment_number,carrier,tracking_number,tracking_url,status_text,tracking_assigned_at,handed_to_carrier_at,shipped_at,delivered_at,created_at,updated_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    shippingAddress: mapOrderShippingAddress(assertNoError<OrderShippingAddressRow | null>(addressResult).data),
    shipment: mapShipment(assertNoError<ShipmentRow | null>(shipmentResult).data),
  }
}

async function enrichCustomerOrder(order: unknown) {
  if (!order || typeof order !== 'object') return order
  const data = order as Record<string, unknown>
  const orderId = typeof data.id === 'string' ? data.id : ''
  if (!orderId) return order
  const rowResult = await supabaseAdminClient
    .from('orders')
    .select('requires_shipping,shipping_status')
    .eq('id', orderId)
    .maybeSingle()
  const row = assertNoError<{ requires_shipping?: boolean | null; shipping_status?: string | null } | null>(rowResult).data
  const shipping = await loadOrderShipping(orderId)
  return {
    ...data,
    paymentStatus: data.paymentStatus === 'recorded' ? 'paid' : data.paymentStatus,
    requiresShipping: Boolean(row?.requires_shipping),
    shippingStatus: row?.requires_shipping ? row?.shipping_status ?? 'pending_preparation' : 'not_required',
    ...shipping,
  }
}

function recordCustomerOperation(
  customer: CustomerRow,
  user: UserContext,
  eventName: AppEventName,
  entityType: 'customer' | 'reservation' | 'cart' | 'cart_item' | 'order',
  entityId: string,
  eventKey: string,
  metadata: Record<string, unknown> = {},
) {
  void recordBusinessActivity({
    sessionId: `customer-${customer.id}`,
    eventName,
    entityType,
    entityId,
    eventKey: eventKey.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 180),
    metadata,
  }, { userId: user.userId, customerId: customer.id })
}

function cartIdFrom(data: unknown) {
  if (!data || typeof data !== 'object') return null
  const id = (data as Record<string, unknown>).id
  return typeof id === 'string' ? id : null
}

function queueReservationEmail(event: 'reservation.created' | 'reservation.rescheduled' | 'reservation.cancelled', reservation: CustomerReservationData, customer: CustomerRow, user: UserContext, locale?: string | null) {
  void enqueueAndProcessTransactionalEmail({
    eventType: event,
    aggregateType: 'reservations',
    aggregateId: reservation.id,
    customerId: customer.id,
    userId: user.userId ?? null,
    recipientEmail: customer.email,
    locale,
    payload: {
      customerName: customerDisplayName(customer),
      reservationNumber: reservation.reservationNumber,
      experienceTitle: reservation.experienceTitle,
      peopleCount: reservation.peopleCount,
      status: reservation.status,
      startAt: reservation.startAt,
      total: reservation.total,
      currency: reservation.currency,
    },
    idempotencyKey: `${event}:${reservation.id}:${customer.email ?? 'no-email'}`,
  }).catch(() => undefined)
}

function queueOrderEmails(order: unknown, customer: CustomerRow, user: UserContext, locale?: string | null) {
  const data = order && typeof order === 'object' ? order as Record<string, unknown> : {}
  const orderId = String(data.id ?? '')
  const orderNumber = String(data.orderNumber ?? '')
  if (!orderId) return
  const payload = {
    customerName: customerDisplayName(customer),
    orderNumber,
    status: typeof data.status === 'string' ? data.status : null,
    total: typeof data.total === 'number' ? data.total : Number(data.total ?? 0),
    currency: typeof data.currency === 'string' ? data.currency : 'MXN',
  }
  for (const eventType of ['order.created', 'order.pending_payment'] as const) {
    void enqueueAndProcessTransactionalEmail({
      eventType,
      aggregateType: 'orders',
      aggregateId: orderId,
      customerId: customer.id,
      userId: user.userId ?? null,
      recipientEmail: customer.email,
      locale,
      payload,
      idempotencyKey: `${eventType}:${orderId}:${customer.email ?? 'no-email'}`,
    }).catch(() => undefined)
  }
}

async function getCustomerForUser(user: UserContext) {
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,customer_number,first_name,last_name,email,phone,status')
    .eq('user_id', user.userId)
    .maybeSingle()
  const customer = assertNoError<CustomerRow | null>(result).data
  if (!customer) throw httpError(404, 'Cliente no vinculado a la sesión')
  return customer
}

export async function getCustomerMe(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_profile')
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data }
}

export async function updateCustomerMe(payload: CustomerProfilePatch, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('update_customer_profile', {
    p_first_name: payload.firstName ?? null,
    p_last_name: payload.lastName ?? null,
    p_display_name: payload.displayName ?? null,
    p_phone: payload.phone ?? null,
    p_preferred_language: payload.preferredLanguage ?? null,
    p_marketing_email: payload.marketingEmail ?? null,
    p_marketing_push: payload.marketingPush ?? null,
    p_transactional_push: payload.transactionalPush ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const customer = await getCustomerForUser(user)
  recordCustomerOperation(customer, user, 'customer_profile_updated', 'customer', customer.id, `customer-profile-updated-${customer.id}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`)
  return { data: result.data }
}

export async function registerCustomerDevice(payload: RegisterCustomerDevicePayload, user: UserContext) {
  assertCustomerAccess(user)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('notification_devices')
    .upsert({
      user_id: user.userId,
      firebase_token: payload.firebaseToken,
      platform: payload.platform,
      active: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'firebase_token' })
    .select('id,platform,active,last_seen_at,updated_at')
    .single()
  const device = assertNoError<{
    id: string
    platform: string
    active: boolean
    last_seen_at?: string | null
    updated_at: string
  }>(result).data
  return {
    data: {
      id: device.id,
      platform: device.platform,
      active: device.active,
      lastSeenAt: device.last_seen_at ?? null,
      updatedAt: device.updated_at,
    },
  }
}

export async function disableCustomerDevice(firebaseToken: string, user: UserContext) {
  assertCustomerAccess(user)
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('notification_devices')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.userId)
    .eq('firebase_token', firebaseToken)
    .select('id')
  return { data: assertNoError<Array<{ id: string }>>(result).data ?? [] }
}

export async function listCustomerAvailability(query: CustomerAvailabilityQuery, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_bookable_experience_slots', {
    p_experience_id: query.experienceId ?? null,
    p_from: toDate(query.from),
    p_to: query.to ? `${query.to}T23:59:59.999Z` : null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data ?? [] }
}

export async function listCustomerReservations(query: CustomerReservationListQuery, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  let request: any = supabaseAdminClient
    .from('reservations')
    .select(reservationSelect, { count: 'exact' })
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
  if (query.status) request = request.eq('status', query.status)
  const result = await request.range(from, to)
  const data = await Promise.all((assertNoError<ReservationRow[]>(result).data ?? []).map((row) => withReservationAccessPass(mapReservation(row))))
  return { data, count: result.count ?? 0 }
}

export async function getCustomerReservation(id: string, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  const result = await supabaseAdminClient
    .from('reservations')
    .select(reservationSelect)
    .eq('id', id)
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .maybeSingle()
  const row = assertNoError<ReservationRow | null>(result).data
  if (!row) throw httpError(404, 'Reservación no encontrada')
  return { data: await withReservationAccessPass(mapReservation(row)) }
}

export async function createCustomerReservation(payload: CreateCustomerReservationPayload, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  try {
    const result = await rpcClient(user).rpc('create_customer_reservation', {
      p_experience_slot_id: payload.experienceSlotId,
      p_people_count: payload.peopleCount,
      p_customer_notes: payload.customerNotes ?? null,
      p_language: payload.language,
      p_idempotency_key: payload.idempotencyKey,
    })
    if (result.error) normalizeDatabaseError(result.error)
    const response = await getCustomerReservation(String(result.data), user)
    queueReservationEmail('reservation.created', response.data, customer, user, payload.language)
    recordCustomerOperation(customer, user, 'reservation_created', 'reservation', response.data.id, `reservation-created-${response.data.id}`)
    return { data: await withReservationAccessPass(response.data) }
  } catch (error) {
    recordCustomerOperation(customer, user, 'reservation_failed', 'customer', customer.id, `reservation-failed-${payload.idempotencyKey}`, { result: 'failed' })
    throw error
  }
}

export async function cancelCustomerReservation(id: string, payload: CancelCustomerReservationPayload, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('cancel_customer_reservation', {
    p_reservation_id: id,
    p_reason: payload.reason ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const response = await getCustomerReservation(String(result.data), user)
  const customer = await getCustomerForUser(user)
  await revokeReservationAccessPasses(response.data.id, 'customer_reservation_cancelled')
  queueReservationEmail('reservation.cancelled', response.data, customer, user)
  recordCustomerOperation(customer, user, 'reservation_cancelled', 'reservation', response.data.id, `reservation-cancelled-${response.data.id}-${response.data.updatedAt}`)
  return response
}

export async function rescheduleCustomerReservation(id: string, payload: RescheduleCustomerReservationPayload, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('reschedule_customer_reservation', {
    p_reservation_id: id,
    p_new_slot_id: payload.experienceSlotId,
    p_idempotency_key: payload.idempotencyKey,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const response = await getCustomerReservation(String(result.data), user)
  const customer = await getCustomerForUser(user)
  const data = await withReservationAccessPass(response.data)
  queueReservationEmail('reservation.rescheduled', response.data, customer, user)
  recordCustomerOperation(customer, user, 'reservation_rescheduled', 'reservation', response.data.id, `reservation-rescheduled-${response.data.id}-${response.data.rescheduledAt ?? response.data.updatedAt}`)
  return { data }
}

export async function listCustomerAccessPassesForMe(user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  return listCustomerAccessPasses(customer.id, String(user.userId))
}

export async function getCustomerMembership(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_membership')
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data ?? null }
}

async function getCurrentMembershipId(user: UserContext) {
  const customer = await getCustomerForUser(user)
  const result = await supabaseAdminClient
    .from('memberships')
    .select('id')
    .eq('customer_id', customer.id)
    .in('status', ['pending', 'active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return assertNoError<{ id: string } | null>(result).data?.id ?? null
}

export async function listCustomerMembershipBenefits(user: UserContext) {
  assertCustomerAccess(user)
  const membershipId = await getCurrentMembershipId(user)
  if (!membershipId) return { data: [] }
  const result = await supabaseAdminClient
    .from('membership_benefits')
    .select('id,membership_id,benefit_code,description,usage_limit,used_count,valid_from,valid_until')
    .eq('membership_id', membershipId)
    .order('created_at', { ascending: true })
  return {
    data: (assertNoError<BenefitRow[]>(result).data ?? []).map((row) => ({
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

export async function getCustomerMembershipLoyalty(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_loyalty_summary')
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data }
}

export async function listCustomerMembershipHistory(user: UserContext) {
  assertCustomerAccess(user)
  const membershipId = await getCurrentMembershipId(user)
  if (!membershipId) return { data: [] }
  const result = await supabaseAdminClient
    .from('audit_logs')
    .select('id,action,entity_type,created_at')
    .eq('entity_id', membershipId)
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

export async function getCustomerCart(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_cart')
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data }
}

export async function listCustomerAddresses(user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  const result = await supabaseAdminClient
    .from('customer_addresses')
    .select('id,customer_id,user_id,label,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,is_default,created_at,updated_at')
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  return { data: (assertNoError<CustomerAddressRow[]>(result).data ?? []).map(mapCustomerAddress) }
}

export async function createCustomerAddress(payload: CustomerAddressPayload, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  if (payload.isDefault) {
    await supabaseAdminClient
      .from('customer_addresses')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('customer_id', customer.id)
      .eq('user_id', user.userId)
      .is('deleted_at', null)
  }
  const result = await supabaseAdminClient
    .from('customer_addresses')
    .insert(addressInsert(customer, user, payload))
    .select('id,customer_id,user_id,label,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,is_default,created_at,updated_at')
    .single()
  return { data: mapCustomerAddress(assertNoError<CustomerAddressRow>(result).data) }
}

export async function updateCustomerAddress(id: string, payload: CustomerAddressUpdatePayload, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  if (payload.isDefault) {
    await supabaseAdminClient
      .from('customer_addresses')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('customer_id', customer.id)
      .eq('user_id', user.userId)
      .is('deleted_at', null)
  }
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.label !== undefined) patch.label = payload.label
  if (payload.recipientName !== undefined) patch.recipient_name = payload.recipientName
  if (payload.phone !== undefined) patch.phone = payload.phone ?? null
  if (payload.email !== undefined) patch.email = payload.email ?? null
  if (payload.line1 !== undefined) patch.line1 = payload.line1
  if (payload.line2 !== undefined) patch.line2 = payload.line2 ?? null
  if (payload.neighborhood !== undefined) patch.neighborhood = payload.neighborhood ?? null
  if (payload.city !== undefined) patch.city = payload.city
  if (payload.state !== undefined) patch.state = payload.state
  if (payload.postalCode !== undefined) patch.postal_code = payload.postalCode
  if (payload.country !== undefined) patch.country = payload.country
  if (payload.references !== undefined) patch.references = payload.references ?? null
  if (payload.isDefault !== undefined) patch.is_default = payload.isDefault

  const result = await supabaseAdminClient
    .from('customer_addresses')
    .update(patch)
    .eq('id', id)
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .is('deleted_at', null)
    .select('id,customer_id,user_id,label,recipient_name,phone,email,line1,line2,neighborhood,city,state,postal_code,country,references,is_default,created_at,updated_at')
    .maybeSingle()
  const row = assertNoError<CustomerAddressRow | null>(result).data
  if (!row) throw httpError(404, 'Dirección no encontrada')
  return { data: mapCustomerAddress(row) }
}

export async function deleteCustomerAddress(id: string, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  const result = await supabaseAdminClient
    .from('customer_addresses')
    .update({ deleted_at: new Date().toISOString(), is_default: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('customer_id', customer.id)
    .eq('user_id', user.userId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  const row = assertNoError<{ id: string } | null>(result).data
  if (!row) throw httpError(404, 'Dirección no encontrada')
  return { data: row }
}

export async function addCustomerCartItem(payload: AddCustomerCartItemPayload, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('add_customer_cart_item', {
    p_item_type: payload.itemType,
    p_item_id: payload.itemId,
    p_quantity: payload.quantity,
    p_idempotency_key: payload.idempotencyKey,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const customer = await getCustomerForUser(user)
  const cartId = cartIdFrom(result.data)
  if (cartId) {
    recordCustomerOperation(customer, user, 'cart_created', 'cart', cartId, `cart-created-${cartId}`)
    recordCustomerOperation(customer, user, 'cart_item_added', 'cart', cartId, `cart-item-added-${payload.idempotencyKey}`, {
      itemType: payload.itemType,
      quantity: payload.quantity,
    })
  }
  return { data: result.data }
}

export async function updateCustomerCartItem(id: string, payload: UpdateCustomerCartItemPayload, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('update_customer_cart_item', {
    p_cart_item_id: id,
    p_quantity: payload.quantity,
    p_idempotency_key: payload.idempotencyKey ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const customer = await getCustomerForUser(user)
  const cartId = cartIdFrom(result.data)
  if (cartId) {
    recordCustomerOperation(customer, user, 'cart_quantity_updated', 'cart', cartId, `cart-item-updated-${payload.idempotencyKey ?? `${id}-${payload.quantity}`}`, { quantity: payload.quantity })
  }
  return { data: result.data }
}

export async function removeCustomerCartItem(id: string, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('remove_customer_cart_item', {
    p_cart_item_id: id,
  })
  if (result.error) normalizeDatabaseError(result.error)
  const customer = await getCustomerForUser(user)
  const cartId = cartIdFrom(result.data)
  if (cartId) recordCustomerOperation(customer, user, 'cart_item_removed', 'cart', cartId, `cart-item-removed-${id}`)
  return { data: result.data }
}

export async function clearCustomerCart(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('clear_customer_cart')
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data }
}

export async function createCustomerOrder(payload: CreateCustomerOrderPayload, user: UserContext) {
  assertCustomerAccess(user)
  const customer = await getCustomerForUser(user)
  const cart = await getCustomerCart(user)
  const needsShipping = cartRequiresShipping(cart.data)
  if (needsShipping && !payload.shippingAddress) {
    throw httpError(422, 'Domicilio de envío requerido')
  }
  const result = needsShipping && payload.shippingAddress
    ? await rpcClient(user).rpc('create_customer_shipping_order_from_cart', {
        p_idempotency_key: payload.idempotencyKey,
        p_shipping_address: payload.shippingAddress,
        p_discount_code: payload.discountCode ?? null,
        p_save_address: payload.saveAddress,
      })
    : await rpcClient(user).rpc('create_customer_order_from_cart', {
        p_idempotency_key: payload.idempotencyKey,
        p_discount_code: payload.discountCode ?? null,
      })
  if (result.error) normalizeDatabaseError(result.error)
  const orderId = String(result.data)
  const response = await getCustomerOrder(orderId, user)
  queueOrderEmails(response.data, customer, user, payload.language)
  recordCustomerOperation(customer, user, 'checkout_started', 'order', String((response.data as Record<string, unknown>).id ?? result.data), `checkout-started-${String((response.data as Record<string, unknown>).id ?? result.data)}`)
  return response
}

export async function listCustomerOrders(user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_orders')
  if (result.error) normalizeDatabaseError(result.error)
  const rows = Array.isArray(result.data) ? result.data : []
  return { data: await Promise.all(rows.map(enrichCustomerOrder)) }
}

export async function getCustomerOrder(id: string, user: UserContext) {
  assertCustomerAccess(user)
  const result = await rpcClient(user).rpc('get_customer_order_detail', {
    p_order_id: id,
  })
  if (result.error) normalizeDatabaseError(result.error)
  if (!result.data || result.data === null) throw httpError(404, 'Orden no encontrada')
  return { data: await enrichCustomerOrder(result.data) }
}
