import { supabaseAdminClient } from '../../config/supabase'
import { httpError, type UserContext } from '../operations/operationErrors'
import { explicitUserScopeCodes, rolesGrantFinancialAccess } from './controlPermissions'

const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

type Metadata = Record<string, unknown> | null | undefined

export type ControlDataScopeAccess = {
  unrestricted: boolean
  scopeCodes: string[]
}

export type ControlDataScopeRecord = {
  locationKind?: unknown
  locationKinds?: unknown[]
  slug?: string | null
  name?: string | null
  alias?: string | null
  address?: string | null
  restaurantSlug?: string | null
  restaurantName?: string | null
  restaurantMetadata?: Metadata
  eventSlug?: string | null
  eventTitle?: string | null
  eventVenue?: string | null
  eventMetadata?: Metadata
  experienceSlug?: string | null
  experienceTitle?: string | null
  experienceLocation?: string | null
  experienceMetadata?: Metadata
  metadata?: Metadata
}

const SCOPE_LOCATION_KINDS: Record<string, string[]> = {
  hacienda_teodoro: ['estate', 'hacienda_teodoro', 'vineyard', 'boutique', 'event_venue', 'cabins'],
  restaurante_teodoro: ['restaurant_estate', 'restaurante_teodoro'],
  restaurante_nieto: ['restaurant_center', 'restaurante_nieto'],
}

const SCOPE_RESTAURANT_SLUGS: Record<string, string[]> = {
  restaurante_teodoro: ['restaurante-hacienda-de-letras', 'restaurante-teodoro'],
  restaurante_nieto: ['restaurante-centro-aguascalientes', 'restaurante-nieto'],
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function metadataObject(value: Metadata) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function metadataString(value: Metadata, keys: string[]) {
  const source = metadataObject(value)
  for (const key of keys) {
    const current = source[key]
    if (typeof current === 'string' && current.trim()) return current.trim()
  }
  return null
}

function collectLocationKinds(record: ControlDataScopeRecord) {
  return unique([
    typeof record.locationKind === 'string' ? record.locationKind : '',
    ...(Array.isArray(record.locationKinds) ? record.locationKinds.filter((item): item is string => typeof item === 'string') : []),
    metadataString(record.metadata, ['locationKind', 'location_kind', 'site', 'siteCode', 'site_code']),
    metadataString(record.restaurantMetadata, ['locationKind', 'location_kind', 'site', 'siteCode', 'site_code']),
    metadataString(record.eventMetadata, ['locationKind', 'location_kind', 'site', 'siteCode', 'site_code']),
    metadataString(record.experienceMetadata, ['locationKind', 'location_kind', 'site', 'siteCode', 'site_code']),
  ].filter((value): value is string => Boolean(value)).map(normalizeText))
}

function collectSlugs(record: ControlDataScopeRecord) {
  return unique([
    record.slug,
    record.restaurantSlug,
    record.eventSlug,
    record.experienceSlug,
    metadataString(record.metadata, ['restaurantSlug', 'restaurant_slug', 'mapSlug', 'map_slug']),
    metadataString(record.restaurantMetadata, ['restaurantSlug', 'restaurant_slug', 'mapSlug', 'map_slug']),
    metadataString(record.eventMetadata, ['restaurantSlug', 'restaurant_slug', 'mapSlug', 'map_slug']),
  ].filter((value): value is string => Boolean(value)).map(normalizeText))
}

function searchableText(record: ControlDataScopeRecord) {
  return normalizeText([
    record.slug,
    record.name,
    record.alias,
    record.address,
    record.restaurantSlug,
    record.restaurantName,
    record.eventSlug,
    record.eventTitle,
    record.eventVenue,
    record.experienceSlug,
    record.experienceTitle,
    record.experienceLocation,
    metadataString(record.metadata, ['displayName', 'legacyName', 'address', 'venue_label', 'venueLabel']),
    metadataString(record.restaurantMetadata, ['displayName', 'legacyName', 'address', 'venue_label', 'venueLabel']),
    metadataString(record.eventMetadata, ['displayName', 'legacyName', 'address', 'venue_label', 'venueLabel']),
    metadataString(record.experienceMetadata, ['displayName', 'legacyName', 'address', 'venue_label', 'venueLabel']),
  ].filter(Boolean).join(' '))
}

function textLooksNieto(text: string) {
  return text.includes('nieto') || text.includes('calle nieto') || text.includes('zona centro') || text.includes('restaurante centro')
}

function recordMatchesScopeCode(scopeCode: string, record: ControlDataScopeRecord) {
  const locationKinds = collectLocationKinds(record)
  const slugs = collectSlugs(record)
  const text = searchableText(record)
  const allowedKinds = SCOPE_LOCATION_KINDS[scopeCode] ?? []
  const allowedSlugs = SCOPE_RESTAURANT_SLUGS[scopeCode] ?? []
  if (locationKinds.some((kind) => allowedKinds.includes(kind))) return true
  if (slugs.some((slug) => allowedSlugs.includes(slug))) return true

  if (scopeCode === 'restaurante_nieto') return textLooksNieto(text)
  if (scopeCode === 'restaurante_teodoro') {
    return !textLooksNieto(text)
      && text.includes('restaurante')
      && (text.includes('hacienda de letras') || text.includes('teodoro') || text.includes('san luis de letras'))
  }
  if (scopeCode === 'hacienda_teodoro') {
    return !textLooksNieto(text)
      && (text.includes('teodoro') || text.includes('san luis de letras') || text.includes('vinedos') || text.includes('viñedos'))
  }
  return false
}

export async function resolveControlDataScope(user: UserContext): Promise<ControlDataScopeAccess> {
  if (rolesGrantFinancialAccess(user.roles)) return { unrestricted: true, scopeCodes: ['all_sites'] }
  const scopeCodes = user.userId ? await explicitUserScopeCodes(user.userId) : []
  if (scopeCodes.length === 0 || scopeCodes.includes('all_sites')) {
    return { unrestricted: true, scopeCodes }
  }
  return { unrestricted: false, scopeCodes }
}

export function controlDataScopeAllowsRecord(access: ControlDataScopeAccess, record: ControlDataScopeRecord) {
  if (access.unrestricted) return true
  return access.scopeCodes.some((scopeCode) => recordMatchesScopeCode(scopeCode, record))
}

export async function assertControlDataScopeRecord(user: UserContext, record: ControlDataScopeRecord, message = 'Registro no disponible para esta sede') {
  const access = await resolveControlDataScope(user)
  if (!controlDataScopeAllowsRecord(access, record)) throw httpError(403, message)
}

export async function filterRowsByControlDataScope<T>(
  user: UserContext,
  rows: T[],
  getRecord: (row: T) => ControlDataScopeRecord,
) {
  const access = await resolveControlDataScope(user)
  if (access.unrestricted) return rows
  return rows.filter((row) => controlDataScopeAllowsRecord(access, getRecord(row)))
}

export function isRestaurantOnlyDataScope(access: ControlDataScopeAccess) {
  return !access.unrestricted
    && access.scopeCodes.length > 0
    && access.scopeCodes.every((code) => code === 'restaurante_teodoro' || code === 'restaurante_nieto')
}

function uuidListFilter(column: string, ids: string[]) {
  const safeIds = unique(ids).filter((value) => /^[0-9a-f-]{36}$/i.test(value))
  return safeIds.length ? `${column}.in.(${safeIds.join(',')})` : null
}

async function scopedRows<T extends Record<string, unknown>>(
  user: UserContext,
  table: string,
  select: string,
  getRecord: (row: T) => ControlDataScopeRecord,
) {
  const access = await resolveControlDataScope(user)
  if (access.unrestricted) return null
  const result = await supabaseAdminClient.from(table).select(select)
  if (result.error) return []
  return ((result.data ?? []) as unknown as T[])
    .filter((row) => controlDataScopeAllowsRecord(access, getRecord(row)))
    .map((row) => String(row.id ?? ''))
    .filter(Boolean)
}

export async function controlDataScopeRestaurantLocationIds(user: UserContext) {
  return scopedRows<{ id: string; slug?: string | null; name?: string | null; alias?: string | null; full_address?: string | null; metadata?: Metadata }>(
    user,
    'restaurant_locations',
    'id,slug,name,alias,full_address,metadata',
    (row) => ({
      slug: row.slug,
      name: row.name,
      alias: row.alias,
      address: row.full_address,
      restaurantSlug: row.slug,
      restaurantName: row.name,
      restaurantMetadata: row.metadata,
      metadata: row.metadata,
    }),
  )
}

export async function controlDataScopeEventIds(user: UserContext) {
  return scopedRows<{ id: string; slug?: string | null; title?: string | null; venue?: string | null; metadata?: Metadata }>(
    user,
    'events',
    'id,slug,title,venue,metadata',
    (row) => ({
      slug: row.slug,
      eventSlug: row.slug,
      eventTitle: row.title,
      eventVenue: row.venue,
      eventMetadata: row.metadata,
      metadata: row.metadata,
    }),
  )
}

export async function controlDataScopeExperienceIds(user: UserContext) {
  return scopedRows<{ id: string; slug?: string | null; title?: string | null; location?: string | null; metadata?: Metadata }>(
    user,
    'experiences',
    'id,slug,title,location,metadata',
    (row) => ({
      slug: row.slug,
      experienceSlug: row.slug,
      experienceTitle: row.title,
      experienceLocation: row.location,
      experienceMetadata: row.metadata,
      metadata: row.metadata,
    }),
  )
}

export async function controlDataScopeReservationOrFilter(user: UserContext) {
  const [restaurantIds, eventIds, experienceIds] = await Promise.all([
    controlDataScopeRestaurantLocationIds(user),
    controlDataScopeEventIds(user),
    controlDataScopeExperienceIds(user),
  ])
  if (restaurantIds === null || eventIds === null || experienceIds === null) return null
  const parts = [
    uuidListFilter('restaurant_location_id', restaurantIds),
    uuidListFilter('event_id', eventIds),
    uuidListFilter('experience_id', experienceIds),
  ].filter((value): value is string => Boolean(value))
  return parts.length ? parts.join(',') : false
}

export async function controlDataScopeEventTicketTypeIds(user: UserContext) {
  const eventIds = await controlDataScopeEventIds(user)
  if (eventIds === null) return null
  if (eventIds.length === 0) return []
  const result = await supabaseAdminClient
    .from('event_ticket_types')
    .select('id,event_id')
    .in('event_id', eventIds)
  if (result.error) return []
  return (result.data ?? []).map((row) => String(row.id)).filter(Boolean)
}

export async function controlDataScopeReservationIds(user: UserContext) {
  const filter = await controlDataScopeReservationOrFilter(user)
  if (filter === null) return null
  if (filter === false) return []
  const result = await supabaseAdminClient
    .from('reservations')
    .select('id')
    .or(filter)
  if (result.error) return []
  return (result.data ?? []).map((row) => String(row.id)).filter(Boolean)
}

export async function controlDataScopeAccessPassOrFilter(user: UserContext) {
  const [reservationIds, ticketTypeIds] = await Promise.all([
    controlDataScopeReservationIds(user),
    controlDataScopeEventTicketTypeIds(user),
  ])
  if (reservationIds === null || ticketTypeIds === null) return null
  const parts = [
    uuidListFilter('reservation_id', reservationIds),
    uuidListFilter('event_ticket_type_id', ticketTypeIds),
  ].filter((value): value is string => Boolean(value))
  return parts.length ? parts.join(',') : false
}

export async function controlDataScopeAccessPassIds(user: UserContext) {
  const filter = await controlDataScopeAccessPassOrFilter(user)
  if (filter === null) return null
  if (filter === false) return []
  const result = await supabaseAdminClient
    .from('access_passes')
    .select('id')
    .or(filter)
  if (result.error) return []
  return (result.data ?? []).map((row) => String(row.id)).filter(Boolean)
}

export function noRowsId() {
  return ZERO_UUID
}
