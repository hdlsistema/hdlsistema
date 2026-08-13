import { createHash, randomBytes } from 'crypto'
import { supabaseAdminClient } from '../../config/supabase'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { recordBusinessActivity } from '../activity/activity.service'
import {
  assertNoError,
  httpError,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  CreateCabinReservationPayload,
  CreateAdminQuoteRequestPayload,
  CreateQuoteRequestPayload,
  CreateRestaurantReservationPayload,
  CabinCatalogPayload,
  CommercialCatalogEntity,
  PatchQuoteRequestPayload,
  QuoteRequestListQuery,
  SendQuoteRequestEmailPayload,
  RestaurantCatalogPayload,
  VenueCatalogPayload,
} from './commercial.schemas'

const customerRoles = ['customer', 'super_admin', 'admin']
const quoteReadRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const quoteWriteRoles = ['super_admin', 'admin', 'operations', 'marketing']

type Relation<T> = T | T[] | null
type CustomerRow = {
  id: string
  user_id?: string | null
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  email?: string | null
  phone?: string | null
}
type ServiceContentRow = {
  id: string
  slug: string
  name?: string | null
  title?: string | null
  subtitle?: string | null
  description?: string | null
  short_description?: string | null
  category?: string | null
  duration_minutes?: number | null
  base_price?: number | string | null
  price?: number | string | null
  currency?: string | null
  price_unit?: string | null
  min_guests?: number | null
  max_guests?: number | null
  min_people?: number | null
  max_people?: number | null
  nights?: number | null
  capacity?: number | null
  dimensions?: string | null
  location?: string | null
  full_address?: string | null
  city?: string | null
  state?: string | null
  alias?: string | null
  hours?: Record<string, unknown> | null
  reservation_enabled?: boolean | null
  inclusions?: string[] | null
  cover_image_url?: string | null
  status: string
  visible_in_app?: boolean | null
  verification_status?: string | null
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}
type ReservationRow = {
  id: string
  reservation_number: string
  reservation_type: string
  customer_id: string
  user_id?: string | null
  people_count: number
  total: number | string
  currency: string
  status: string
  source?: string | null
  customer_notes?: string | null
  reservation_date?: string | null
  reservation_time?: string | null
  check_in?: string | null
  check_out?: string | null
  occasion?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  cabin_packages?: Relation<{ id: string; name: string; slug: string; price: number | string }>
  restaurant_locations?: Relation<{ id: string; name: string; slug: string }>
}
type QuoteRequestRow = {
  id: string
  quote_number: string
  customer_id?: string | null
  user_id?: string | null
  event_category: string
  event_type: string
  preferred_date?: string | null
  alternative_date?: string | null
  preferred_start_time?: string | null
  preferred_end_time?: string | null
  guest_count: number
  venue_space_id?: string | null
  venue_space_name?: string | null
  food_required: string
  food_type?: string | null
  wine_required: string
  wine_option?: string | null
  requested_services?: string[] | null
  contact_first_name: string
  contact_last_name: string
  contact_email: string
  contact_phone: string
  company_name?: string | null
  notes?: string | null
  status: string
  source: string
  assigned_to?: string | null
  admin_notes?: string | null
  contacted_at?: string | null
  quoted_at?: string | null
  closed_at?: string | null
  idempotency_key?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  customers?: Relation<{ id: string; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null }>
  venue_spaces?: Relation<{ id: string; name: string; capacity: number; dimensions: string }>
}

function first<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0
}

function quoteContactName(row: QuoteRequestRow) {
  return [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ').trim()
}

function quoteNumber() {
  return `HDL-COT-${randomBytes(3).toString('hex').toUpperCase()}`
}

function hashQuoteSend(payload: SendQuoteRequestEmailPayload) {
  return createHash('sha256')
    .update(JSON.stringify({
      subject: payload.subject,
      message: payload.message,
      quoteAmount: payload.quoteAmount ?? null,
      currency: payload.currency,
      validUntil: payload.validUntil ?? null,
    }))
    .digest('hex')
    .slice(0, 18)
}

function publicContent(row: ServiceContentRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name ?? row.title ?? '',
    title: row.title ?? row.name ?? '',
    subtitle: row.subtitle ?? null,
    description: row.description ?? null,
    shortDescription: row.short_description ?? null,
    category: row.category ?? String(row.metadata?.category ?? ''),
    durationMinutes: row.duration_minutes ?? null,
    price: numberValue(row.price ?? row.base_price),
    currency: row.currency ?? 'MXN',
    priceUnit: row.price_unit ?? null,
    minGuests: row.min_guests ?? row.min_people ?? null,
    maxGuests: row.max_guests ?? row.max_people ?? null,
    nights: row.nights ?? null,
    capacity: row.capacity ?? null,
    dimensions: row.dimensions ?? null,
    location: row.location ?? row.full_address ?? null,
    address: row.full_address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    alias: row.alias ?? null,
    hours: row.hours ?? {},
    reservationEnabled: row.reservation_enabled ?? true,
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    coverImageUrl: row.cover_image_url ?? null,
    status: row.status,
    visibleInApp: row.visible_in_app ?? true,
    verificationStatus: row.verification_status ?? 'verified',
    sortOrder: row.sort_order ?? 0,
    metadata: row.metadata ?? {},
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function mapReservation(row: ReservationRow) {
  const cabin = first(row.cabin_packages)
  const restaurant = first(row.restaurant_locations)
  return {
    id: row.id,
    reservationNumber: row.reservation_number,
    reservationType: row.reservation_type,
    customerId: row.customer_id,
    peopleCount: row.people_count,
    total: numberValue(row.total),
    currency: row.currency,
    status: row.status,
    source: row.source ?? 'app',
    customerNotes: row.customer_notes ?? null,
    reservationDate: row.reservation_date ?? null,
    reservationTime: row.reservation_time ?? null,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    occasion: row.occasion ?? null,
    cabinPackage: cabin ? { id: cabin.id, name: cabin.name, slug: cabin.slug, price: numberValue(cabin.price) } : null,
    restaurantLocation: restaurant ? { id: restaurant.id, name: restaurant.name, slug: restaurant.slug } : null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuote(row: QuoteRequestRow) {
  const customer = first(row.customers)
  const venue = first(row.venue_spaces)
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id ?? null,
    customerName: customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || customer.email || quoteContactName(row)
      : quoteContactName(row),
    eventCategory: row.event_category,
    eventType: row.event_type,
    preferredDate: row.preferred_date ?? null,
    alternativeDate: row.alternative_date ?? null,
    preferredStartTime: row.preferred_start_time ?? null,
    preferredEndTime: row.preferred_end_time ?? null,
    guestCount: row.guest_count,
    venueSpaceId: row.venue_space_id ?? null,
    venueSpaceName: row.venue_space_name ?? venue?.name ?? null,
    venueSpace: venue ? { id: venue.id, name: venue.name, capacity: venue.capacity, dimensions: venue.dimensions } : null,
    foodRequired: row.food_required,
    foodType: row.food_type ?? null,
    wineRequired: row.wine_required,
    wineOption: row.wine_option ?? null,
    requestedServices: row.requested_services ?? [],
    contactFirstName: row.contact_first_name,
    contactLastName: row.contact_last_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    companyName: row.company_name ?? null,
    notes: row.notes ?? null,
    status: row.status,
    source: row.source,
    assignedTo: row.assigned_to ?? null,
    adminNotes: row.admin_notes ?? null,
    contactedAt: row.contacted_at ?? null,
    quotedAt: row.quoted_at ?? null,
    closedAt: row.closed_at ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCustomerForUser(user: UserContext) {
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,first_name,last_name,display_name,email,phone')
    .eq('user_id', user.userId)
    .maybeSingle()
  const customer = assertNoError<CustomerRow | null>(result).data
  if (!customer) throw httpError(404, 'Cliente no vinculado a la sesión')
  return customer
}

async function findExistingReservation(user: UserContext, idempotencyKey: string) {
  if (!user.userId) return null
  const result = await supabaseAdminClient
    .from('reservations')
    .select(reservationSelect)
    .eq('user_id', user.userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  return assertNoError<ReservationRow | null>(result).data
}

const reservationSelect = `
  id,reservation_number,reservation_type,customer_id,user_id,people_count,total,currency,status,source,
  customer_notes,reservation_date,reservation_time,check_in,check_out,occasion,metadata,created_at,updated_at,
  cabin_packages(id,name,slug,price),
  restaurant_locations(id,name,slug)
`

const quoteSelect = `
  id,quote_number,customer_id,user_id,event_category,event_type,preferred_date,alternative_date,
  preferred_start_time,preferred_end_time,guest_count,venue_space_id,venue_space_name,food_required,
  food_type,wine_required,wine_option,requested_services,contact_first_name,contact_last_name,
  contact_email,contact_phone,company_name,notes,status,source,assigned_to,admin_notes,contacted_at,
  quoted_at,closed_at,idempotency_key,metadata,created_at,updated_at,
  customers(id,first_name,last_name,email,phone),
  venue_spaces(id,name,capacity,dimensions)
`

export async function listPublicCommercialServices() {
  const [experiencesResult, cabinsResult, restaurantsResult, spacesResult] = await Promise.all([
    supabaseAdminClient
      .from('experiences')
      .select('id,slug,title,subtitle,description,short_description,category,duration_minutes,base_price,min_people,max_people,capacity,location,cover_image_url,status,visible_in_app,sort_order,metadata,created_at,updated_at')
      .eq('status', 'published')
      .eq('visible_in_app', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabaseAdminClient
      .from('cabin_packages')
      .select('id,slug,name,subtitle,description,price,currency,price_unit,min_guests,max_guests,nights,inclusions,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at')
      .eq('status', 'published')
      .eq('visible_in_app', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabaseAdminClient
      .from('restaurant_locations')
      .select('id,slug,name,alias,description,full_address,city,state,hours,reservation_enabled,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at')
      .eq('status', 'published')
      .eq('visible_in_app', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabaseAdminClient
      .from('venue_spaces')
      .select('id,slug,name,capacity,dimensions,description,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at')
      .eq('status', 'published')
      .eq('visible_in_app', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
  ])

  return {
    data: {
      experiences: (assertNoError<ServiceContentRow[]>(experiencesResult).data ?? []).map(publicContent),
      cabins: (assertNoError<ServiceContentRow[]>(cabinsResult).data ?? []).map(publicContent),
      restaurants: (assertNoError<ServiceContentRow[]>(restaurantsResult).data ?? []).map(publicContent),
      venueSpaces: (assertNoError<ServiceContentRow[]>(spacesResult).data ?? []).map(publicContent),
    },
  }
}

export async function listAdminCommercialCatalog(user: UserContext) {
  requireOperationRole(user, quoteReadRoles)
  const [cabinsResult, restaurantsResult, spacesResult] = await Promise.all([
    supabaseAdminClient.from('cabin_packages').select('id,slug,name,subtitle,description,price,currency,price_unit,min_guests,max_guests,nights,inclusions,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').is('deleted_at', null).order('sort_order'),
    supabaseAdminClient.from('restaurant_locations').select('id,slug,name,alias,description,full_address,city,state,phone,hours,reservation_enabled,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').is('deleted_at', null).order('sort_order'),
    supabaseAdminClient.from('venue_spaces').select('id,slug,name,capacity,dimensions,description,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').is('deleted_at', null).order('sort_order'),
  ])
  return { data: { cabins: (assertNoError<ServiceContentRow[]>(cabinsResult).data ?? []).map(publicContent), restaurants: (assertNoError<ServiceContentRow[]>(restaurantsResult).data ?? []).map(publicContent), venueSpaces: (assertNoError<ServiceContentRow[]>(spacesResult).data ?? []).map(publicContent) } }
}

function catalogCommonPayload(payload: CabinCatalogPayload | RestaurantCatalogPayload | VenueCatalogPayload) {
  return {
    slug: payload.slug,
    name: payload.name,
    status: payload.status,
    visible_in_app: payload.visibleInApp,
    verification_status: payload.verificationStatus,
    cover_image_url: payload.coverImageUrl ?? null,
    sort_order: payload.sortOrder,
    metadata: payload.metadata ?? {},
    updated_at: new Date().toISOString(),
  }
}

export async function saveCommercialCatalogItem(entity: CommercialCatalogEntity, id: string | null, payload: CabinCatalogPayload | RestaurantCatalogPayload | VenueCatalogPayload, user: UserContext) {
  requireOperationRole(user, quoteWriteRoles)
  let result: unknown
  if (entity === 'cabins') {
    const value = payload as CabinCatalogPayload
    const row = { ...catalogCommonPayload(value), subtitle: value.subtitle ?? null, description: value.description ?? null, price: value.price, currency: value.currency.toUpperCase(), price_unit: value.priceUnit, min_guests: value.minGuests, max_guests: value.maxGuests, nights: value.nights, inclusions: value.inclusions }
    result = id ? await supabaseAdminClient.from('cabin_packages').update(row).eq('id', id).select('id,slug,name,subtitle,description,price,currency,price_unit,min_guests,max_guests,nights,inclusions,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single() : await supabaseAdminClient.from('cabin_packages').insert(row).select('id,slug,name,subtitle,description,price,currency,price_unit,min_guests,max_guests,nights,inclusions,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single()
  } else if (entity === 'restaurants') {
    const value = payload as RestaurantCatalogPayload
    const row = { ...catalogCommonPayload(value), alias: value.alias ?? null, description: value.description ?? null, full_address: value.fullAddress ?? null, city: value.city ?? null, state: value.state ?? null, phone: value.phone ?? null, hours: value.hours, reservation_enabled: value.reservationEnabled }
    result = id ? await supabaseAdminClient.from('restaurant_locations').update(row).eq('id', id).select('id,slug,name,alias,description,full_address,city,state,phone,hours,reservation_enabled,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single() : await supabaseAdminClient.from('restaurant_locations').insert(row).select('id,slug,name,alias,description,full_address,city,state,phone,hours,reservation_enabled,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single()
  } else {
    const value = payload as VenueCatalogPayload
    const row = { ...catalogCommonPayload(value), capacity: value.capacity, dimensions: value.dimensions, description: value.description }
    result = id ? await supabaseAdminClient.from('venue_spaces').update(row).eq('id', id).select('id,slug,name,capacity,dimensions,description,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single() : await supabaseAdminClient.from('venue_spaces').insert(row).select('id,slug,name,capacity,dimensions,description,cover_image_url,status,visible_in_app,verification_status,sort_order,metadata,created_at,updated_at').single()
  }
  const row = assertNoError<ServiceContentRow>(result as never).data
  await supabaseAdminClient.from('audit_logs').insert({ actor_user_id: user.userId ?? null, action: id ? 'commercial_catalog_updated' : 'commercial_catalog_created', entity_type: entity, entity_id: row.id, after_data: { name: row.name, status: row.status } })
  return { data: publicContent(row) }
}

export async function createCabinReservation(payload: CreateCabinReservationPayload, user: UserContext) {
  requireOperationRole(user, customerRoles)
  const customer = await getCustomerForUser(user)
  const existing = await findExistingReservation(user, payload.idempotencyKey)
  if (existing) return { data: mapReservation(existing), duplicate: true }

  const packageResult = await supabaseAdminClient
    .from('cabin_packages')
    .select('id,name,slug,price,currency,min_guests,max_guests,nights,status,visible_in_app')
    .eq('id', payload.cabinPackageId)
    .eq('status', 'published')
    .eq('visible_in_app', true)
    .maybeSingle()
  const cabinPackage = assertNoError<{
    id: string
    name: string
    slug: string
    price: number | string
    currency: string
    min_guests: number
    max_guests: number
    nights: number
  } | null>(packageResult).data
  if (!cabinPackage) throw httpError(404, 'Paquete no disponible')
  if (payload.peopleCount < cabinPackage.min_guests || payload.peopleCount > cabinPackage.max_guests) {
    throw httpError(400, 'Número de personas fuera del paquete')
  }

  const defaultCheckOut = new Date(`${payload.checkIn}T12:00:00.000Z`)
  defaultCheckOut.setUTCDate(defaultCheckOut.getUTCDate() + Math.max(cabinPackage.nights, 1))
  const checkOut = payload.checkOut ?? defaultCheckOut.toISOString().slice(0, 10)

  const createResult = await supabaseAdminClient.rpc('create_lodging_reservation_customer', {
    p_user_id: user.userId,
    p_cabin_package_id: cabinPackage.id,
    p_check_in: payload.checkIn,
    p_check_out: checkOut,
    p_people_count: payload.peopleCount,
    p_customer_notes: payload.customerNotes ?? null,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: { language: payload.language, bookingMode: 'TIMED_HOLD' },
  })
  const reservationId = String(assertNoError<string>(createResult).data)
  const result = await supabaseAdminClient
    .from('reservations')
    .select(reservationSelect)
    .eq('id', reservationId)
    .single()
  const reservation = mapReservation(assertNoError<ReservationRow>(result).data)

  void recordBusinessActivity({
    sessionId: `customer-${customer.id}`,
    eventName: 'cabin_reservation_submitted',
    entityType: 'reservation',
    entityId: reservation.id,
    eventKey: `cabin-reservation-${reservation.id}`,
    metadata: { result: 'succeeded' },
  }, { userId: user.userId, customerId: customer.id })

  return { data: reservation, duplicate: false }
}

export async function createRestaurantReservation(payload: CreateRestaurantReservationPayload, user: UserContext) {
  requireOperationRole(user, customerRoles)
  const customer = await getCustomerForUser(user)
  const existing = await findExistingReservation(user, payload.idempotencyKey)
  if (existing) return { data: mapReservation(existing), duplicate: true }

  const restaurantResult = await supabaseAdminClient
    .from('restaurant_locations')
    .select('id,name,slug,reservation_enabled,status,visible_in_app')
    .eq('id', payload.restaurantLocationId)
    .eq('status', 'published')
    .eq('visible_in_app', true)
    .maybeSingle()
  const restaurant = assertNoError<{ id: string; name: string; slug: string; reservation_enabled: boolean } | null>(restaurantResult).data
  if (!restaurant || !restaurant.reservation_enabled) throw httpError(404, 'Restaurante no disponible')

  const result = await supabaseAdminClient
    .from('reservations')
    .insert({
      reservation_number: `RST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(4).toString('hex').toUpperCase()}`,
      customer_id: customer.id,
      user_id: user.userId,
      reservation_type: 'restaurant',
      restaurant_location_id: restaurant.id,
      people_count: payload.peopleCount,
      subtotal: 0,
      total: 0,
      currency: 'MXN',
      status: 'pending',
      operational_status: 'active',
      source: 'app',
      booking_channel: 'mobile_app',
      reservation_date: payload.reservationDate,
      reservation_time: payload.reservationTime,
      occasion: payload.occasion ?? null,
      customer_notes: payload.customerNotes ?? null,
      idempotency_key: payload.idempotencyKey,
      metadata: { language: payload.language, bookingMode: 'REQUEST_CONFIRMATION' },
    })
    .select(reservationSelect)
    .single()
  const reservation = mapReservation(assertNoError<ReservationRow>(result).data)

  void recordBusinessActivity({
    sessionId: `customer-${customer.id}`,
    eventName: 'restaurant_reservation_submitted',
    entityType: 'reservation',
    entityId: reservation.id,
    eventKey: `restaurant-reservation-${reservation.id}`,
    metadata: { result: 'succeeded' },
  }, { userId: user.userId, customerId: customer.id })

  return { data: reservation, duplicate: false }
}

async function createQuoteNotification(quote: ReturnType<typeof mapQuote>) {
  const idempotencyKey = `quote_request_created:${quote.id}`
  const existing = await supabaseAdminClient
    .from('notifications')
    .select('id')
    .contains('data', { quoteRequestId: quote.id, type: 'quote_request_created' })
    .maybeSingle()
  if (assertNoError<{ id: string } | null>(existing).data) return

  const result = await supabaseAdminClient
    .from('notifications')
    .insert({
      channel: 'control',
      title: 'Nueva solicitud de cotización',
      body: `${quote.customerName} solicita información para ${quote.eventType} con ${quote.guestCount} personas.`,
      data: {
        type: 'quote_request_created',
        quoteRequestId: quote.id,
        quoteNumber: quote.quoteNumber,
        deepLink: `/control/cotizaciones/${quote.id}`,
        idempotencyKey,
      },
      status: 'pending',
    })
    .select('id')
    .single()
  assertNoError<{ id: string }>(result)
}

export async function createQuoteRequest(payload: CreateQuoteRequestPayload, user: UserContext) {
  requireOperationRole(user, customerRoles)
  const customer = await getCustomerForUser(user)

  const existingResult = await supabaseAdminClient
    .from('quote_requests')
    .select(quoteSelect)
    .eq('user_id', user.userId)
    .eq('idempotency_key', payload.idempotencyKey)
    .maybeSingle()
  const existing = assertNoError<QuoteRequestRow | null>(existingResult).data
  if (existing) {
    const quote = mapQuote(existing)
    await createQuoteNotification(quote)
    return { data: quote, duplicate: true }
  }

  const result = await supabaseAdminClient
    .from('quote_requests')
    .insert({
      quote_number: quoteNumber(),
      customer_id: customer.id,
      user_id: user.userId,
      event_category: payload.eventCategory,
      event_type: payload.eventType,
      preferred_date: payload.preferredDate ?? null,
      alternative_date: payload.alternativeDate ?? null,
      preferred_start_time: payload.preferredStartTime ?? null,
      preferred_end_time: payload.preferredEndTime ?? null,
      guest_count: payload.guestCount,
      venue_space_id: payload.venueSpaceId ?? null,
      venue_space_name: payload.venueSpaceName ?? null,
      food_required: payload.foodRequired,
      food_type: payload.foodType ?? null,
      wine_required: payload.wineRequired,
      wine_option: payload.wineOption ?? null,
      requested_services: payload.requestedServices,
      contact_first_name: payload.contactFirstName,
      contact_last_name: payload.contactLastName,
      contact_email: payload.contactEmail,
      contact_phone: payload.contactPhone,
      company_name: payload.companyName ?? null,
      notes: payload.notes ?? null,
      source: 'mobile_app',
      idempotency_key: payload.idempotencyKey,
      metadata: { language: payload.language, source: 'client_call_2026_08_11' },
    })
    .select(quoteSelect)
    .single()
  const quote = mapQuote(assertNoError<QuoteRequestRow>(result).data)

  await createQuoteNotification(quote)

  void enqueueAndProcessTransactionalEmail({
    eventType: 'quote.request.created',
    aggregateType: 'quote_requests',
    aggregateId: quote.id,
    customerId: customer.id,
    userId: user.userId ?? null,
    recipientEmail: quote.contactEmail,
    locale: payload.language,
    payload: {
      customerName: quote.customerName,
      quoteNumber: quote.quoteNumber,
      eventType: quote.eventType,
      preferredDate: quote.preferredDate,
      guestCount: quote.guestCount,
    },
    idempotencyKey: `quote.request.created:${quote.id}:${quote.contactEmail}`,
  }).catch(() => undefined)

  void recordBusinessActivity({
    sessionId: `customer-${customer.id}`,
    eventName: 'quote_submitted',
    entityType: 'quote_request',
    entityId: quote.id,
    eventKey: `quote-submitted-${quote.id}`,
    metadata: { result: 'succeeded' },
  }, { userId: user.userId, customerId: customer.id })

  return { data: quote, duplicate: false }
}

export async function createQuoteRequestAdmin(payload: CreateAdminQuoteRequestPayload, user: UserContext) {
  requireOperationRole(user, quoteWriteRoles)

  if (payload.customerId) {
    const customerResult = await supabaseAdminClient
      .from('customers')
      .select('id')
      .eq('id', payload.customerId)
      .maybeSingle()
    if (!assertNoError<{ id: string } | null>(customerResult).data) throw httpError(404, 'Cliente no encontrado')
  }

  const existingResult = await supabaseAdminClient
    .from('quote_requests')
    .select(quoteSelect)
    .eq('idempotency_key', payload.idempotencyKey)
    .eq('source', payload.source)
    .maybeSingle()
  const existing = assertNoError<QuoteRequestRow | null>(existingResult).data
  if (existing) return { data: mapQuote(existing), duplicate: true }

  const result = await supabaseAdminClient
    .from('quote_requests')
    .insert({
      quote_number: quoteNumber(),
      customer_id: payload.customerId ?? null,
      user_id: null,
      event_category: payload.eventCategory,
      event_type: payload.eventType,
      preferred_date: payload.preferredDate ?? null,
      alternative_date: payload.alternativeDate ?? null,
      preferred_start_time: payload.preferredStartTime ?? null,
      preferred_end_time: payload.preferredEndTime ?? null,
      guest_count: payload.guestCount,
      venue_space_id: payload.venueSpaceId ?? null,
      venue_space_name: payload.venueSpaceName ?? null,
      food_required: payload.foodRequired,
      food_type: payload.foodType ?? null,
      wine_required: payload.wineRequired,
      wine_option: payload.wineOption ?? null,
      requested_services: payload.requestedServices,
      contact_first_name: payload.contactFirstName,
      contact_last_name: payload.contactLastName,
      contact_email: payload.contactEmail,
      contact_phone: payload.contactPhone,
      company_name: payload.companyName ?? null,
      notes: payload.notes ?? null,
      source: payload.source,
      admin_notes: payload.adminNotes ?? null,
      idempotency_key: payload.idempotencyKey,
      metadata: { language: payload.language, source: 'control_center', capturedBy: user.userId ?? null },
    })
    .select(quoteSelect)
    .single()
  const quote = mapQuote(assertNoError<QuoteRequestRow>(result).data)
  await createQuoteNotification(quote)

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'quote_request_created_admin',
    entity_type: 'quote_requests',
    entity_id: quote.id,
    after_data: { quoteNumber: quote.quoteNumber, source: payload.source },
  })

  return { data: quote, duplicate: false }
}

function applyQuoteFilters(request: any, query: QuoteRequestListQuery) {
  let next = request
  if (query.status) next = next.eq('status', query.status)
  if (query.from) next = next.gte('created_at', `${query.from}T00:00:00.000Z`)
  if (query.to) next = next.lte('created_at', `${query.to}T23:59:59.999Z`)
  return next
}

function matchesQuoteSearch(row: QuoteRequestRow, search?: string) {
  if (!search) return true
  const term = search.toLocaleLowerCase('es-MX')
  return [
    row.quote_number,
    quoteContactName(row),
    row.contact_email,
    row.contact_phone,
    row.event_type,
    row.venue_space_name ?? '',
  ].some((value) => String(value).toLocaleLowerCase('es-MX').includes(term))
}

export async function listQuoteRequests(query: QuoteRequestListQuery, user: UserContext) {
  requireOperationRole(user, quoteReadRoles)
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1
  const request = applyQuoteFilters(
    supabaseAdminClient
      .from('quote_requests')
      .select(quoteSelect, { count: 'exact' })
      .order(query.orderBy, { ascending: query.orderDirection === 'asc' }),
    query,
  ).range(from, to)
  const result = await request
  const rows = (assertNoError<QuoteRequestRow[]>(result).data ?? []).filter((row) => matchesQuoteSearch(row, query.search))
  return {
    data: rows.map(mapQuote),
    count: query.search ? rows.length : result.count ?? rows.length,
  }
}

export async function getQuoteRequest(id: string, user: UserContext) {
  requireOperationRole(user, quoteReadRoles)
  const result = await supabaseAdminClient
    .from('quote_requests')
    .select(quoteSelect)
    .eq('id', id)
    .maybeSingle()
  const row = assertNoError<QuoteRequestRow | null>(result).data
  if (!row) throw httpError(404, 'Cotización no encontrada')
  return { data: mapQuote(row) }
}

export async function updateQuoteRequest(id: string, payload: PatchQuoteRequestPayload, user: UserContext) {
  requireOperationRole(user, quoteWriteRoles)
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.status) {
    patch.status = payload.status
    if (payload.status === 'contacted') patch.contacted_at = new Date().toISOString()
    if (payload.status === 'quoted') patch.quoted_at = new Date().toISOString()
    if (['won', 'lost', 'cancelled'].includes(payload.status)) patch.closed_at = new Date().toISOString()
  }
  if ('assignedTo' in payload) patch.assigned_to = payload.assignedTo ?? null
  if ('adminNotes' in payload) patch.admin_notes = payload.adminNotes ?? null

  const result = await supabaseAdminClient
    .from('quote_requests')
    .update(patch)
    .eq('id', id)
    .select(quoteSelect)
    .single()
  return { data: mapQuote(assertNoError<QuoteRequestRow>(result).data) }
}

export async function sendQuoteRequestEmail(id: string, payload: SendQuoteRequestEmailPayload, user: UserContext) {
  requireOperationRole(user, quoteWriteRoles)
  const current = await getQuoteRequest(id, user)
  const quote = current.data
  if (!quote.contactEmail) throw httpError(422, 'La cotización no tiene correo de contacto')

  const idempotencyKey = `quote.sent:${quote.id}:${hashQuoteSend(payload)}`
  const result = await enqueueAndProcessTransactionalEmail({
    eventType: 'quote.sent',
    aggregateType: 'quote_requests',
    aggregateId: quote.id,
    customerId: quote.customerId,
    userId: null,
    recipientEmail: quote.contactEmail,
    locale: String(quote.metadata?.language ?? 'es'),
    payload: {
      subject: payload.subject,
      title: payload.subject,
      customerName: quote.customerName,
      quoteNumber: quote.quoteNumber,
      eventType: quote.eventType,
      preferredDate: quote.preferredDate,
      guestCount: quote.guestCount,
      message: payload.message,
      body: payload.message,
      quoteAmount: payload.quoteAmount ?? null,
      currency: payload.currency,
      validUntil: payload.validUntil ?? null,
    },
    idempotencyKey,
  })

  const sentAt = new Date().toISOString()
  const adminNotes = payload.adminNotes ?? quote.adminNotes ?? null
  await updateQuoteRequest(id, {
    status: 'quoted',
    adminNotes,
  }, user)

  await supabaseAdminClient
    .from('quote_requests')
    .update({
      quoted_at: sentAt,
      metadata: {
        ...quote.metadata,
        lastQuoteEmail: {
          subject: payload.subject,
          quoteAmount: payload.quoteAmount ?? null,
          currency: payload.currency,
          validUntil: payload.validUntil ?? null,
          sentAt,
          communicationEventId: result.event.id,
          outboxId: result.outbox.id,
        },
      },
      updated_at: sentAt,
    })
    .eq('id', id)

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'quote_email_sent',
    entity_type: 'quote_requests',
    entity_id: id,
    before_data: { status: quote.status },
    after_data: {
      status: 'quoted',
      communicationEventId: result.event.id,
      emailStatus: result.outbox.status,
    },
  })

  const finalQuote = await getQuoteRequest(id, user)

  return {
    data: {
      quote: finalQuote.data,
      email: {
        eventId: result.event.id,
        outboxId: result.outbox.id,
        status: result.outbox.status,
        recipientEmail: quote.contactEmail,
        subject: payload.subject,
      },
    },
  }
}
