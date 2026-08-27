import { createHash, randomBytes, randomUUID } from 'crypto'
import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { rolesGrantFinancialAccess } from '../admin/controlPermissions'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { createControlNotification, createCustomerCampaignNotification } from '../notifications/notifications.service'
import { assertNoError } from '../operations/operationErrors'
import type { ApprovalDecisionPayload, ApprovalRequestPayload, CampaignAudienceFilters, SendCampaignPayload } from './content.schemas'
import { contentConfigs, getContentConfig } from './content.config'
import { canAccessContent } from './content.permissions'
import {
  createPreviewTokenRecord,
  createPublicationJob,
  getContentById,
  getPreviewToken,
  getPublicContentBySlug,
  getVersion,
  insertContent,
  listContent,
  listPublicContent,
  listVersions,
  markPreviewTokenUsed,
  softDeleteContent,
  updateContent,
  lockDuePublicationJobs,
  completePublicationJob,
  failPublicationJob,
} from './content.repository'
import type {
  ContentAction,
  ContentConfig,
  ContentListQuery,
  ContentRouteEntity,
  PublicationAction,
} from './content.types'

type UserContext = {
  userId?: string
  roles?: string[]
}

type CustomerAudienceRow = {
  id: string
  user_id?: string | null
  customer_number?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  birth_date?: string | null
  source?: string | null
  segment?: string | null
  total_spend?: number | string | null
  total_visits?: number | null
  preferred_language?: string | null
  marketing_email_consent?: boolean | null
  marketing_push_consent?: boolean | null
  metadata?: Record<string, unknown> | null
  status?: string | null
  created_at?: string | null
  last_visit_at?: string | null
}

type AuthDirectoryUser = {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown>
}

type CampaignChannel = 'email' | 'push' | 'in_app'
type CampaignSourceGroup = 'app' | 'web' | 'hacienda' | 'other'

type ResolvedCampaignAudience = {
  rows: CustomerAudienceRow[]
  excludedInternalUsers: number
}

const ROLE_PRIORITY = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer', 'customer']
const STAFF_DIRECTORY_ROLES = new Set(['operations', 'marketing', 'finance', 'viewer'])
const ADMIN_DIRECTORY_ROLES = new Set(['super_admin', 'admin'])

const SEGMENT_ALIASES: Record<string, string[]> = {
  customer: ['customer', 'cliente', 'client'],
  recurring: ['recurring', 'frecuente', 'frequent', 'cliente frecuente', 'clientes frecuentes'],
  vip: ['vip'],
  high_value: ['high_value', 'alto_valor', 'alto valor', 'premium'],
  at_risk: ['at_risk', 'en_riesgo', 'en riesgo'],
  inactive: ['inactive', 'inactivo', 'sin actividad'],
  wine_club: ['wine_club', 'wine club', 'club de vino', 'club'],
  corporate: ['corporate', 'empresa', 'corporativo'],
  new: ['new', 'nuevo', 'nuevos'],
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode, isOperational: true })
}

function requirePermission(config: ContentConfig, action: ContentAction, user: UserContext) {
  if (!canAccessContent(user.roles, config.entityType, action)) {
    throw httpError(403, 'Permisos insuficientes')
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function assertEntity(routeEntity: string): ContentConfig {
  const config = getContentConfig(routeEntity)
  if (!config) throw httpError(404, 'Entidad no permitida')
  return config
}

function controlContentDeepLink(routeEntity: ContentRouteEntity) {
  if (routeEntity === 'grand-events') return '/control/eventos-magnos'
  if (routeEntity === 'membership-plans') return '/control/membresias'
  return `/control/${routeEntity}`
}

function buildStatusPatch(config: ContentConfig, action: PublicationAction) {
  const now = new Date().toISOString()
  if (action === 'publish') {
    return {
      status: config.publishStatus,
      visible_in_app: config.publicEnabled,
      published_at: now,
      publish_at: null,
      unpublish_at: null,
      archived_at: null,
      deleted_at: null,
    }
  }
  if (action === 'unpublish') {
    return {
      status: config.unpublishStatus,
      visible_in_app: false,
      unpublish_at: now,
    }
  }
  if (action === 'archive') {
    return {
      status: config.archiveStatus,
      visible_in_app: false,
      archived_at: now,
    }
  }
  return {
    status: config.restoreStatus,
    archived_at: null,
    deleted_at: null,
  }
}

function timestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function assertPublicationWindowReady(record: Record<string, unknown>) {
  const publishAt = timestamp(record.publish_at)
  const unpublishAt = timestamp(record.unpublish_at)
  const startAt = timestamp(record.start_at)

  if (publishAt !== null && unpublishAt !== null && unpublishAt <= publishAt) {
    throw httpError(422, 'La fecha de retiro debe ser posterior a la fecha de publicación')
  }

  if (unpublishAt !== null && unpublishAt <= Date.now()) {
    throw httpError(422, 'La fecha de retiro ya venció; elimínala o elige una fecha futura para publicar en app')
  }

  if (startAt !== null && unpublishAt !== null && unpublishAt <= startAt) {
    throw httpError(422, 'La fecha de retiro debe ser posterior al inicio del evento')
  }
}

function keepPublishedContentImmediatelyVisible(
  config: ContentConfig,
  current: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
) {
  if (!config.publicEnabled || !current || current.status !== config.publishStatus) return payload

  const candidate = { ...current, ...payload }
  const publishAt = timestamp(candidate.publish_at)
  const remainsPublished = candidate.status === config.publishStatus
  const remainsVisible = candidate.visible_in_app !== false

  if (remainsPublished && remainsVisible && publishAt !== null && publishAt > Date.now()) {
    return { ...payload, publish_at: null }
  }

  return payload
}

function clonePayload(row: Record<string, unknown>, config: ContentConfig) {
  const blocked = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'published_by',
    'published_at',
    'archived_at',
    'deleted_at',
    'version',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!blocked.has(key)) next[key] = value
  }

  const suffix = `copy-${Date.now()}`
  if (config.slugColumn && typeof next[config.slugColumn] === 'string') {
    next[config.slugColumn] = `${next[config.slugColumn]}-${suffix}`
  }
  if (config.codeColumn && typeof next[config.codeColumn] === 'string') {
    next[config.codeColumn] = `${next[config.codeColumn]}-${suffix}`.toUpperCase()
  }
  next.status = config.restoreStatus
  next.visible_in_app = false
  return next
}

function sanitizeRestorePayload(snapshot: Record<string, unknown>) {
  const blocked = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'published_by',
    'published_at',
    'version',
  ])
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snapshot)) {
    if (!blocked.has(key)) next[key] = value
  }
  next.deleted_at = null
  next.archived_at = null
  return next
}

function campaignHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)
}

function normalizeRecordJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function frontendPreviewUrl(token: string) {
  return `${env.FRONTEND_URL.replace(/\/+$/, '')}/vista-previa/${encodeURIComponent(token)}`
}

function editorialApproval(record: Record<string, unknown>) {
  return normalizeRecordJson(normalizeRecordJson(record.metadata).editorial_approval)
}

function approvalHistory(record: Record<string, unknown>) {
  const history = editorialApproval(record).history
  return Array.isArray(history) ? history.slice(-40) : []
}

function isAdminApproverRole(roles?: string[]) {
  return Boolean(roles?.some((role) => role === 'super_admin' || role === 'admin'))
}

function reminderDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function timestampMs(value: unknown) {
  if (typeof value !== 'string' || !value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

async function writeContentAudit(
  user: UserContext,
  action: string,
  entityType: string,
  entityId: string,
  afterData: Record<string, unknown>,
) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData,
  })
}

function isEventContentRoute(routeEntity: string) {
  return routeEntity === 'events' || routeEntity === 'grand-events'
}

function withContentDefaults(
  config: ContentConfig,
  payload: Record<string, unknown>,
  current?: Record<string, unknown> | null,
) {
  if (!config.defaultMetadata && !Object.prototype.hasOwnProperty.call(payload, 'metadata')) return payload

  const currentMetadata = normalizeRecordJson(current?.metadata)
  const payloadMetadata = normalizeRecordJson(payload.metadata)

  return {
    ...payload,
    metadata: {
      ...currentMetadata,
      ...payloadMetadata,
      ...(config.defaultMetadata ?? {}),
    },
  }
}

async function resolvePublicationJobConfig(job: {
  entity_type: string
  entity_id: string
  metadata?: unknown
}) {
  const jobMetadata = normalizeRecordJson(job.metadata)
  const route = typeof jobMetadata.route === 'string' ? jobMetadata.route : ''
  const explicitConfig = route ? getContentConfig(route) : null
  if (explicitConfig && explicitConfig.entityType === job.entity_type) return explicitConfig

  const candidates = Object.values(contentConfigs).filter((item) => item.entityType === job.entity_type)
  if (candidates.length <= 1) return candidates[0] ?? null

  if (job.entity_type === 'event') {
    const eventResult = await supabaseAdminClient
      .from('events')
      .select('metadata')
      .eq('id', job.entity_id)
      .maybeSingle()
    const eventMetadata = normalizeRecordJson(assertNoError<{ metadata?: unknown } | null>(eventResult).data?.metadata)
    if (eventMetadata.event_scope === 'grand') return contentConfigs['grand-events']
  }

  return candidates[0] ?? null
}

function normalizeCustomerEmail(value?: string | null) {
  const email = String(value ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function customerDisplayName(row: CustomerAudienceRow) {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
  return name || row.email || row.customer_number || 'Cliente'
}

function ageFromBirthDate(value?: string | null) {
  if (!value) return null
  const birth = new Date(`${value}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function metadataText(row: CustomerAudienceRow) {
  return JSON.stringify(row.metadata ?? {}).toLowerCase()
}

function normalizeTextToken(value?: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function segmentValues(value?: string | null) {
  const normalized = normalizeTextToken(value)
  if (!normalized) return []
  return SEGMENT_ALIASES[normalized] ?? [String(value).trim()]
}

function sourceGroupForCustomer(row: CustomerAudienceRow): CampaignSourceGroup {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const tokens = [
    row.source,
    metadata.source,
    metadata.origin,
    metadata.channel,
    metadata.checkoutMode,
    metadata.checkout_mode,
    metadata.platform,
  ].map(normalizeTextToken).filter(Boolean)
  const text = tokens.join(' ')
  if (text.includes('mobile_app') || /\b(app|mobile|ios|android|movil)\b/.test(text)) return 'app'
  if (text.includes('public_signup') || /\b(web|online|sitio|checkout)\b/.test(text)) return 'web'
  if (/(centro de control|manual|hacienda|atencion directa|atencion|tel[eé]fono|telefono|whatsapp|mostrador|boutique|restaurante)/.test(text)) return 'hacienda'
  return 'other'
}

function matchesSourceGroup(row: CustomerAudienceRow, sourceGroup?: CampaignSourceGroup) {
  if (!sourceGroup) return true
  return sourceGroupForCustomer(row) === sourceGroup
}

function cleanAuthEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function userIdFromAudienceRow(row: CustomerAudienceRow) {
  return typeof row.user_id === 'string' && row.user_id ? row.user_id : null
}

function extractRoleCode(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { code?: unknown } | undefined
    return typeof first?.code === 'string' ? first.code : null
  }
  if (value && typeof value === 'object') {
    const code = (value as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

function sortRoles(roles: string[]) {
  return [...new Set(roles)].sort((a, b) => {
    const priorityA = ROLE_PRIORITY.indexOf(a)
    const priorityB = ROLE_PRIORITY.indexOf(b)
    return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB)
  })
}

function hasStaffMetadata(user?: AuthDirectoryUser | null) {
  return Boolean(user?.app_metadata?.staff_account || user?.app_metadata?.managed_password_locked)
}

async function listAuthUsersForAudienceEmails(emails: string[]) {
  const wanted = new Set(emails.map(cleanAuthEmail).filter(Boolean))
  const usersByEmail = new Map<string, AuthDirectoryUser>()
  if (!wanted.size) return usersByEmail

  const perPage = 100
  const maxPages = 25
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({ page, perPage })
    if (error) return usersByEmail
    const users = (data?.users ?? []) as AuthDirectoryUser[]
    for (const user of users) {
      const email = cleanAuthEmail(user.email)
      if (wanted.has(email)) usersByEmail.set(email, user)
    }
    if (users.length < perPage || usersByEmail.size === wanted.size) break
  }

  return usersByEmail
}

async function getAudienceUserRolesMap(userIds: string[]): Promise<Map<string, string[]>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('user_roles')
    .select('user_id,roles(code)')
    .in('user_id', userIds)
  if (error) return new Map()
  const roles = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const role = extractRoleCode(row.roles)
    if (!userId || !role) continue
    roles.set(userId, [...(roles.get(userId) ?? []), role])
  }
  return new Map([...roles.entries()].map(([userId, values]) => [userId, sortRoles(values)]))
}

async function getAudienceExplicitPermissionsMap(userIds: string[]): Promise<Map<string, string[]>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('user_control_permissions')
    .select('user_id,permission_code')
    .in('user_id', userIds)
  if (error) return new Map()
  const permissions = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const permission = typeof row.permission_code === 'string' ? row.permission_code : ''
    if (!userId || !permission) continue
    permissions.set(userId, [...(permissions.get(userId) ?? []), permission])
  }
  return permissions
}

async function getAudienceFinancialGrantUserIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set()
  const { data, error } = await supabaseAdminClient
    .from('financial_access_grants')
    .select('user_id')
    .in('user_id', userIds)
    .is('revoked_at', null)
  if (error) return new Set()
  return new Set((data ?? []).map((row) => typeof row.user_id === 'string' ? row.user_id : '').filter(Boolean))
}

async function getAudienceUserScopesMap(userIds: string[]): Promise<Map<string, string[]>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('user_control_scopes')
    .select('user_id,scope_code')
    .in('user_id', userIds)
  if (error) return new Map()
  const scopes = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const scopeCode = typeof row.scope_code === 'string' ? row.scope_code : ''
    if (!userId || !scopeCode) continue
    scopes.set(userId, [...(scopes.get(userId) ?? []), scopeCode])
  }
  return scopes
}

async function internalCustomerIdsForAudience(rows: CustomerAudienceRow[]) {
  const emailAuthUsers = await listAuthUsersForAudienceEmails(
    rows
      .filter((row) => !userIdFromAudienceRow(row))
      .map((row) => row.email)
      .filter((email): email is string => Boolean(email)),
  )
  const userIdByCustomerId = new Map<string, string>()
  const authUserById = new Map<string, AuthDirectoryUser>()

  for (const row of rows) {
    const directUserId = userIdFromAudienceRow(row)
    if (directUserId) {
      userIdByCustomerId.set(row.id, directUserId)
      continue
    }
    const user = emailAuthUsers.get(cleanAuthEmail(row.email))
    if (user?.id) {
      userIdByCustomerId.set(row.id, user.id)
      authUserById.set(user.id, user)
    }
  }

  const userIds = [...new Set(userIdByCustomerId.values())]
  const [rolesMap, explicitPermissionsMap, financialGrantUserIds, scopesMap] = await Promise.all([
    getAudienceUserRolesMap(userIds),
    getAudienceExplicitPermissionsMap(userIds),
    getAudienceFinancialGrantUserIds(userIds),
    getAudienceUserScopesMap(userIds),
  ])

  const internalIds = new Set<string>()
  for (const row of rows) {
    const userId = userIdByCustomerId.get(row.id)
    if (!userId) continue
    const roles = rolesMap.get(userId) ?? []
    const explicitPermissions = explicitPermissionsMap.get(userId) ?? []
    const scopes = scopesMap.get(userId) ?? []
    const isInternal = hasStaffMetadata(authUserById.get(userId)) ||
      roles.some((role) => STAFF_DIRECTORY_ROLES.has(role) || ADMIN_DIRECTORY_ROLES.has(role)) ||
      rolesGrantFinancialAccess(roles) ||
      explicitPermissions.length > 0 ||
      financialGrantUserIds.has(userId) ||
      scopes.length > 0
    if (isInternal) internalIds.add(row.id)
  }
  return internalIds
}

async function idsFromRelation(table: string, column = 'customer_id') {
  const result = await supabaseAdminClient.from(table).select(column)
  if (result.error) throw httpError(500, 'No fue posible resolver audiencia')
  return new Set((result.data ?? []).map((item) => String((item as unknown as Record<string, unknown>)[column] ?? '')).filter(Boolean))
}

async function idsFromCartStatus(cartStatus: 'active' | 'abandoned' | 'converted') {
  const result = await supabaseAdminClient
    .from('carts')
    .select('customer_id')
    .eq('cart_status', cartStatus)
  if (result.error) throw httpError(500, 'No fue posible resolver carritos de campaña')
  return new Set((result.data ?? []).map((item) => String(item.customer_id ?? '')).filter(Boolean))
}

async function idsFromOrderStatus(orderStatus: 'draft' | 'pending_payment' | 'paid' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded') {
  const result = await supabaseAdminClient
    .from('orders')
    .select('customer_id')
    .eq('status', orderStatus)
  if (result.error) throw httpError(500, 'No fue posible resolver órdenes de campaña')
  return new Set((result.data ?? []).map((item) => String(item.customer_id ?? '')).filter(Boolean))
}

async function resolveCampaignAudience(filters: CampaignAudienceFilters = {}): Promise<ResolvedCampaignAudience> {
  const limit = Math.min(filters.limit ?? 250, 500)
  const exactEmails = Array.from(new Set((filters.emails ?? []).map(normalizeCustomerEmail).filter(Boolean)))
  const segmentOptions = segmentValues(filters.segment)
  let query: any = supabaseAdminClient
    .from('customers')
    .select('id,user_id,customer_number,first_name,last_name,email,birth_date,source,segment,total_spend,total_visits,preferred_language,marketing_email_consent,marketing_push_consent,metadata,status,created_at,last_visit_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (exactEmails.length) query = query.in('email', exactEmails)
  if (segmentOptions.length > 1) query = query.in('segment', segmentOptions)
  else if (segmentOptions.length === 1) query = query.eq('segment', segmentOptions[0])
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.minTotalSpend !== undefined) query = query.gte('total_spend', filters.minTotalSpend)
  if (filters.maxTotalSpend !== undefined) query = query.lte('total_spend', filters.maxTotalSpend)
  if (filters.minTotalVisits !== undefined) query = query.gte('total_visits', filters.minTotalVisits)
  if (filters.maxTotalVisits !== undefined) query = query.lte('total_visits', filters.maxTotalVisits)
  if (filters.createdFrom) query = query.gte('created_at', filters.createdFrom)
  if (filters.createdTo) query = query.lte('created_at', filters.createdTo)
  if (filters.lastVisitFrom) query = query.gte('last_visit_at', filters.lastVisitFrom)
  if (filters.lastVisitTo) query = query.lte('last_visit_at', filters.lastVisitTo)
  if (filters.search) {
    const term = filters.search.replaceAll(',', ' ').trim()
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%`)
  }

  const result = await query
  if (result.error) throw httpError(500, 'No fue posible consultar clientes')
  let rows = (result.data ?? []) as CustomerAudienceRow[]

  if (exactEmails.length) {
    rows = rows.filter((row) => exactEmails.includes(normalizeCustomerEmail(row.email)))
  }

  if (filters.sourceGroup) {
    rows = rows.filter((row) => matchesSourceGroup(row, filters.sourceGroup))
  }

  if (filters.tagId) {
    const tagResult = await supabaseAdminClient.from('customer_tag_assignments').select('customer_id').eq('tag_id', filters.tagId)
    if (tagResult.error) throw httpError(500, 'No fue posible resolver etiqueta')
    const ids = new Set((tagResult.data ?? []).map((row) => String(row.customer_id)))
    rows = rows.filter((row) => ids.has(row.id))
  }

  if (filters.hasOrders !== undefined) {
    const ids = await idsFromRelation('orders')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasOrders)
  }
  if (filters.orderStatus) {
    const ids = await idsFromOrderStatus(filters.orderStatus)
    rows = rows.filter((row) => ids.has(row.id))
  }
  if (filters.hasReservations !== undefined) {
    const ids = await idsFromRelation('reservations')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasReservations)
  }
  if (filters.hasMembership !== undefined) {
    const ids = await idsFromRelation('memberships')
    rows = rows.filter((row) => ids.has(row.id) === filters.hasMembership)
  }
  if (filters.cartStatus) {
    const ids = await idsFromCartStatus(filters.cartStatus)
    rows = rows.filter((row) => ids.has(row.id))
  }
  if (filters.minAge !== undefined || filters.maxAge !== undefined) {
    rows = rows.filter((row) => {
      const age = ageFromBirthDate(row.birth_date)
      if (age === null) return false
      if (filters.minAge !== undefined && age < filters.minAge) return false
      if (filters.maxAge !== undefined && age > filters.maxAge) return false
      return true
    })
  }
  if (filters.location) {
    const value = filters.location.toLowerCase()
    rows = rows.filter((row) => metadataText(row).includes(value))
  }

  let excludedInternalUsers = 0
  const allowInternalUsers = filters.includeInternalUsers === true || exactEmails.length > 0
  if (!allowInternalUsers) {
    const internalIds = await internalCustomerIdsForAudience(rows)
    excludedInternalUsers = internalIds.size
    rows = rows.filter((row) => !internalIds.has(row.id))
  }

  const unique = new Map<string, CustomerAudienceRow>()
  for (const row of rows) {
    unique.set(row.id, row)
  }

  return { rows: Array.from(unique.values()).slice(0, limit), excludedInternalUsers }
}

function requestedCampaignChannels(value: unknown): CampaignChannel[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;+]/)
      : []
  const channels = source
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is CampaignChannel => ['email', 'push', 'in_app'].includes(item))
  return Array.from(new Set(channels.length ? channels : ['email']))
}

function customerEligibleForChannel(row: CustomerAudienceRow, channel: CampaignChannel) {
  if (channel === 'email') return Boolean(normalizeCustomerEmail(row.email) && row.marketing_email_consent)
  return Boolean(row.user_id && row.marketing_push_consent)
}

async function upsertCampaignDelivery(input: {
  campaignId: string
  customerId: string
  channel: CampaignChannel
  status: string
  notificationId?: string | null
  providerReference?: string | null
  errorCode?: string | null
}) {
  const delivered = ['sent', 'delivered', 'read'].includes(input.status)
  await supabaseAdminClient
    .from('campaign_recipient_deliveries')
    .upsert({
      campaign_id: input.campaignId,
      customer_id: input.customerId,
      channel: input.channel,
      notification_id: input.notificationId ?? null,
      status: input.status,
      provider_reference: input.providerReference ?? null,
      error_code: input.errorCode ?? null,
      delivered_at: delivered ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id,customer_id,channel' })
}

function publicAudienceRow(row: CustomerAudienceRow) {
  const consentChannels = (['email', 'push', 'in_app'] as CampaignChannel[])
    .filter((channel) => customerEligibleForChannel(row, channel))
  return {
    id: row.id,
    customerNumber: row.customer_number ?? null,
    name: customerDisplayName(row),
    email: row.email ?? null,
    segment: row.segment ?? null,
    source: row.source ?? null,
    sourceGroup: sourceGroupForCustomer(row),
    preferredLanguage: row.preferred_language ?? null,
    totalSpend: Number(row.total_spend ?? 0),
    totalVisits: row.total_visits ?? 0,
    customerSince: row.created_at ?? null,
    lastVisitAt: row.last_visit_at ?? null,
    consentChannels,
  }
}

async function assertEventSalesReady(eventId: string, event: Record<string, unknown>) {
  if (event.sales_enabled !== true) return
  const endAt = typeof event.end_at === 'string' ? new Date(event.end_at).getTime() : Number.NaN
  if (!Number.isFinite(endAt) || endAt <= Date.now()) {
    throw httpError(422, 'Un evento con venta activa debe terminar en una fecha futura')
  }
  const ticketsResult = await supabaseAdminClient
    .from('event_ticket_types')
    .select('id,capacity,sold_count,reserved_count,status,active,visible_in_app,sales_start_at,sales_end_at')
    .eq('event_id', eventId)
    .eq('status', 'published')
    .eq('active', true)
    .eq('visible_in_app', true)
    .is('deleted_at', null)
    .is('archived_at', null)
  const tickets = assertNoError<Array<Record<string, unknown>>>(ticketsResult).data ?? []
  const now = Date.now()
  const usable = tickets.some((ticket) => (
    Number(ticket.capacity ?? 0) > Number(ticket.sold_count ?? 0) + Number(ticket.reserved_count ?? 0)
    && (typeof ticket.sales_end_at !== 'string' || new Date(ticket.sales_end_at).getTime() >= now)
  ))
  if (!usable) throw httpError(422, 'Configura y publica al menos un tipo de boleto con cupo antes de activar la venta')
}

export async function listAdminContent(
  routeEntity: string,
  query: ContentListQuery,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return listContent(config, query)
}

export async function getAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return getContentById(config, id)
}

export async function previewCampaignAudience(filters: CampaignAudienceFilters, user: UserContext) {
  const config = assertEntity('campaigns')
  requirePermission(config, 'read', user)
  const resolved = await resolveCampaignAudience(filters)
  const recipients = resolved.rows
  const channels = requestedCampaignChannels(filters.channels)
  const eligible = recipients.filter((recipient) => channels.some((channel) => customerEligibleForChannel(recipient, channel)))
  return {
    data: {
      total: eligible.length,
      consentRequired: 'channel_specific_marketing_consent',
      channels,
      channelTotals: Object.fromEntries(channels.map((channel) => [
        channel,
        recipients.filter((recipient) => customerEligibleForChannel(recipient, channel)).length,
      ])),
      filters,
      excludedInternalUsers: resolved.excludedInternalUsers,
      sample: eligible.slice(0, 20).map(publicAudienceRow),
    },
  }
}

export async function sendCampaignEmail(id: string, payload: SendCampaignPayload, user: UserContext) {
  const config = assertEntity('campaigns')
  requirePermission(config, 'publish', user)
  const { data } = await getContentById(config, id)
  if (!data) throw httpError(404, 'Campaña no encontrada')

  const campaign = data as unknown as Record<string, unknown>
  const storedContent = normalizeRecordJson(campaign.content)
  const content = {
    ...storedContent,
    subject: payload.subject ?? storedContent.subject,
    body: payload.body ?? storedContent.body,
    cta_label: payload.ctaLabel ?? storedContent.cta_label,
    cta_url: payload.ctaUrl ?? storedContent.cta_url,
  }
  const subject = typeof content.subject === 'string' ? content.subject.trim() : ''
  const body = typeof content.body === 'string' ? content.body.trim() : ''
  if (!subject || !body) throw httpError(422, 'La campaña requiere asunto y mensaje')

  const storedAudience = normalizeRecordJson(campaign.audience_definition)
  const audience = {
    ...storedAudience,
    ...(payload.audience ?? {}),
    limit: payload.limit ?? payload.audience?.limit ?? storedAudience.limit,
  } as CampaignAudienceFilters
  const channels = requestedCampaignChannels(payload.channels ?? audience.channels ?? campaign.channel)
  audience.channels = channels
  const resolved = await resolveCampaignAudience(audience)
  const recipients = resolved.rows.filter((recipient) => channels.some((channel) => customerEligibleForChannel(recipient, channel)))
  if (recipients.length === 0) throw httpError(422, 'No hay destinatarios con consentimiento para esta audiencia')

  const sendHash = campaignHash({ subject, body, cta: content.cta_label, url: content.cta_url, audience })
  const results = []
  for (const recipient of recipients) {
    const email = normalizeCustomerEmail(recipient.email)
    const channelResults: Array<{ channel: CampaignChannel; status: string }> = []

    if (channels.includes('email') && customerEligibleForChannel(recipient, 'email') && email) {
      const sent = await enqueueAndProcessTransactionalEmail({
        eventType: 'campaign.marketing',
        aggregateType: 'campaigns',
        aggregateId: id,
        customerId: recipient.id,
        userId: recipient.user_id ?? null,
        recipientEmail: email,
        locale: recipient.preferred_language ?? audience.locale ?? 'es-MX',
        payload: {
          subject,
          title: subject,
          body,
          campaignName: String(campaign.name ?? 'Campaña Hacienda de Letras'),
          customerName: customerDisplayName(recipient),
          ctaLabel: typeof content.cta_label === 'string' ? content.cta_label : undefined,
          ctaUrl: typeof content.cta_url === 'string' ? content.cta_url : undefined,
        },
        idempotencyKey: `campaign.marketing:${id}:${recipient.id}:${sendHash}:email`,
      })
      const emailStatus = sent.outbox.status === 'sent' || sent.outbox.status === 'delivered'
        ? sent.outbox.status
        : sent.outbox.status === 'failed'
          ? 'failed'
          : sent.outbox.status === 'pending_configuration'
            ? 'pending_configuration'
            : 'pending'
      await upsertCampaignDelivery({
        campaignId: id,
        customerId: recipient.id,
        channel: 'email',
        status: emailStatus,
        providerReference: sent.outbox.id,
        errorCode: sent.outbox.error_code ?? null,
      })
      channelResults.push({ channel: 'email', status: emailStatus })
    }

    const wantsPush = channels.includes('push') && customerEligibleForChannel(recipient, 'push')
    const wantsInApp = channels.includes('in_app') && customerEligibleForChannel(recipient, 'in_app')
    if (wantsPush || wantsInApp) {
      const notification = await createCustomerCampaignNotification({
        campaignId: id,
        customerId: recipient.id,
        userId: recipient.user_id ?? null,
        title: subject,
        body,
        deepLink: '/app/inicio',
        data: { campaignId: id, campaignName: String(campaign.name ?? '') },
        sendPush: wantsPush,
      })
      if (wantsPush) {
        await upsertCampaignDelivery({
          campaignId: id,
          customerId: recipient.id,
          channel: 'push',
          status: notification.delivery.status,
          notificationId: notification.data.id,
          errorCode: notification.delivery.errorCode,
        })
        channelResults.push({ channel: 'push', status: notification.delivery.status })
      }
      if (wantsInApp) {
        await upsertCampaignDelivery({
          campaignId: id,
          customerId: recipient.id,
          channel: 'in_app',
          status: 'sent',
          notificationId: notification.data.id,
        })
        channelResults.push({ channel: 'in_app', status: 'sent' })
      }
    }

    const deliveryStatus = channelResults.some((item) => ['sent', 'delivered', 'read'].includes(item.status))
      ? 'sent'
      : channelResults.some((item) => item.status === 'failed')
        ? 'failed'
        : 'pending'
    await supabaseAdminClient
      .from('campaign_recipients')
      .upsert({
        campaign_id: id,
        customer_id: recipient.id,
        delivery_status: deliveryStatus,
        delivered_at: deliveryStatus === 'sent' ? new Date().toISOString() : null,
        error_code: deliveryStatus === 'failed' ? 'channel_delivery_failed' : null,
      }, { onConflict: 'campaign_id,customer_id' })
    results.push({
      customerId: recipient.id,
      channelResults,
      status: deliveryStatus,
    })
  }

  const sentAt = new Date().toISOString()
  await updateContent(config, id, {
    audience_definition: audience,
    content,
    status: 'completed',
    visible_in_app: false,
    sent_at: sentAt,
    updated_by: user.userId,
  })

  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: user.userId ?? null,
    action: 'campaign_multichannel_sent',
    entity_type: 'campaigns',
    entity_id: id,
    before_data: { status: campaign.status },
    after_data: {
      status: 'completed',
      recipients: results.length,
      channels,
      sendHash,
    },
  })

  return {
    data: {
      campaignId: id,
      sentAt,
      recipients: results.length,
      channels,
      sent: results.filter((item) => item.status === 'sent').length,
      pending: results.filter((item) => item.status === 'pending').length,
      failed: results.filter((item) => item.status === 'failed').length,
    },
  }
}

export async function getCampaignMetrics(id: string, user: UserContext) {
  const config = assertEntity('campaigns')
  requirePermission(config, 'read', user)
  const campaign = await getContentById(config, id)
  if (!campaign.data) throw httpError(404, 'Campaña no encontrada')
  const result = await supabaseAdminClient
    .from('campaign_recipient_deliveries')
    .select('customer_id,channel,status,delivered_at,opened_at,clicked_at')
    .eq('campaign_id', id)
  const rows = assertNoError<Array<{
    customer_id: string
    channel: CampaignChannel
    status: string
    delivered_at?: string | null
    opened_at?: string | null
    clicked_at?: string | null
  }>>(result).data ?? []
  const channels = (['email', 'push', 'in_app'] as CampaignChannel[]).map((channel) => {
    const selected = rows.filter((row) => row.channel === channel)
    return {
      channel,
      total: selected.length,
      delivered: selected.filter((row) => Boolean(row.delivered_at) || ['sent', 'delivered', 'read'].includes(row.status)).length,
      pending: selected.filter((row) => ['pending', 'pending_configuration'].includes(row.status)).length,
      failed: selected.filter((row) => row.status === 'failed').length,
      opened: selected.filter((row) => Boolean(row.opened_at)).length,
      clicked: selected.filter((row) => Boolean(row.clicked_at)).length,
    }
  })
  return {
    data: {
      campaignId: id,
      recipients: new Set(rows.map((row) => row.customer_id)).size,
      channels,
    },
  }
}

export async function listEditorialApprovers(routeEntity: ContentRouteEntity, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'preview', user)

  const roleResult = await supabaseAdminClient
    .from('user_roles')
    .select('user_id,roles(code)')
  const roleRows = assertNoError<Array<{ user_id?: string | null; roles?: { code?: string | null } | Array<{ code?: string | null }> | null }>>(roleResult).data ?? []
  const approverIds = Array.from(new Set(roleRows
    .filter((row) => {
      const roleValue = Array.isArray(row.roles) ? row.roles[0]?.code : row.roles?.code
      return row.user_id && (roleValue === 'super_admin' || roleValue === 'admin')
    })
    .map((row) => String(row.user_id))))

  if (!approverIds.length) return { data: [] }

  const profileResult = await supabaseAdminClient
    .from('profiles')
    .select('id,first_name,last_name,display_name')
    .in('id', approverIds)
  const profiles = new Map((assertNoError<Array<Record<string, unknown>>>(profileResult).data ?? [])
    .map((row) => [String(row.id), row]))

  const users = await supabaseAdminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailById = new Map((users.data.users ?? []).map((authUser) => [authUser.id, authUser.email ?? '']))

  const roleByUser = new Map<string, string[]>()
  for (const row of roleRows) {
    const userId = String(row.user_id ?? '')
    if (!approverIds.includes(userId)) continue
    const roleValue = Array.isArray(row.roles) ? row.roles[0]?.code : row.roles?.code
    if (roleValue) roleByUser.set(userId, [...(roleByUser.get(userId) ?? []), roleValue])
  }

  return {
    data: approverIds
      .map((id) => {
        const profile = profiles.get(id) ?? {}
        const displayName = normalizeString(profile.display_name) ||
          `${normalizeString(profile.first_name)} ${normalizeString(profile.last_name)}`.trim() ||
          emailById.get(id) ||
          'Administrador'
        return {
          id,
          displayName,
          email: emailById.get(id) || null,
          roles: Array.from(new Set(roleByUser.get(id) ?? [])),
        }
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'es-MX')),
  }
}

export async function requestEditorialApproval(
  routeEntity: ContentRouteEntity,
  id: string,
  payload: ApprovalRequestPayload,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'preview', user)
  const current = await getContentById(config, id)
  if (!current.data) throw httpError(404, 'Contenido no encontrado')

  const approvers = await listEditorialApprovers(routeEntity, user)
  const approver = approvers.data.find((item) => item.id === payload.approverUserId)
  if (!approver) throw httpError(422, 'Selecciona un administrador válido para autorización')

  const preview = await generatePreviewToken(routeEntity, id, payload.expiresInMinutes, payload.locale, user)
  const previewUrl = frontendPreviewUrl(preview.token)
  const now = new Date().toISOString()
  const record = current.data as unknown as Record<string, unknown>
  const previousMetadata = normalizeRecordJson(record.metadata)
  const previousApproval = editorialApproval(record)
  const approval = {
    ...previousApproval,
    status: 'pending',
    requested_at: now,
    requested_by: user.userId ?? null,
    requested_to: payload.approverUserId,
    requested_to_name: approver.displayName,
    preview_url: previewUrl,
    preview_expires_at: preview.expires_at,
    note: payload.note ?? null,
    last_reminder_at: now,
    reminder_count: Number(previousApproval.reminder_count ?? 0),
    history: [
      ...approvalHistory(record),
      {
        action: 'approval_requested',
        at: now,
        by: user.userId ?? null,
        to: payload.approverUserId,
        note: payload.note ?? null,
      },
    ],
  }

  const updated = await updateContent(config, id, withContentDefaults(config, {
    metadata: {
      ...previousMetadata,
      editorial_approval: approval,
    },
    updated_by: user.userId,
  }, record))

  await createControlNotification({
    type: 'content_approval_request',
    userId: payload.approverUserId,
    title: 'Autorización editorial pendiente',
    body: `Revisa ${normalizeString(record.title) || normalizeString(record.name) || 'la publicación'} antes de publicarla.`,
    deepLink: controlContentDeepLink(routeEntity),
    idempotencyKey: `content-approval:${routeEntity}:${id}:${payload.approverUserId}:${now.slice(0, 13)}`,
    data: {
      entity: routeEntity,
      entityId: id,
      previewUrl,
      requestedBy: user.userId ?? null,
    },
  })

  await writeContentAudit(user, 'content_approval_requested', config.entityType, id, {
    entity: routeEntity,
    approverUserId: payload.approverUserId,
    previewExpiresAt: preview.expires_at,
  })

  return { data: { content: updated.data, approval, previewUrl } }
}

export async function decideEditorialApproval(
  routeEntity: ContentRouteEntity,
  id: string,
  payload: ApprovalDecisionPayload,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'publish', user)
  if (!isAdminApproverRole(user.roles)) throw httpError(403, 'Sólo administración puede autorizar publicaciones')
  const current = await getContentById(config, id)
  if (!current.data) throw httpError(404, 'Contenido no encontrado')

  const now = new Date().toISOString()
  const record = current.data as unknown as Record<string, unknown>
  const previousMetadata = normalizeRecordJson(record.metadata)
  const previousApproval = editorialApproval(record)
  const approval = {
    ...previousApproval,
    status: payload.decision,
    decided_at: now,
    decided_by: user.userId ?? null,
    decision_note: payload.note ?? null,
    history: [
      ...approvalHistory(record),
      {
        action: payload.decision === 'approved' ? 'approval_approved' : 'approval_rejected',
        at: now,
        by: user.userId ?? null,
        note: payload.note ?? null,
      },
    ],
  }

  const updated = await updateContent(config, id, withContentDefaults(config, {
    metadata: {
      ...previousMetadata,
      editorial_approval: approval,
    },
    updated_by: user.userId,
  }, record))

  await writeContentAudit(user, payload.decision === 'approved' ? 'content_approval_approved' : 'content_approval_rejected', config.entityType, id, {
    entity: routeEntity,
    note: payload.note ?? null,
  })

  return { data: { content: updated.data, approval } }
}

export async function processEditorialApprovalReminders(limit = 25) {
  const config = assertEntity('grand-events')
  const now = new Date()
  const nowIso = now.toISOString()
  const thresholdMs = now.getTime() - 24 * 60 * 60 * 1000

  const result = await supabaseAdminClient
    .from(config.table)
    .select('id,title,name,metadata')
    .eq('metadata->editorial_approval->>status', 'pending')
    .is('deleted_at', null)
    .is('archived_at', null)
    .limit(Math.max(1, Math.min(limit, 100)))
  const rows = assertNoError<Array<Record<string, unknown>>>(result).data ?? []
  let reminders = 0

  for (const record of rows) {
    const id = normalizeString(record.id)
    const approval = editorialApproval(record)
    const approverUserId = normalizeString(approval.requested_to)
    if (!id || !approverUserId) continue

    const lastReminderMs = timestampMs(approval.last_reminder_at) || timestampMs(approval.requested_at)
    if (lastReminderMs && lastReminderMs > thresholdMs) continue

    const unreadResult = await supabaseAdminClient
      .from('notifications')
      .select('id')
      .eq('channel', 'control')
      .eq('user_id', approverUserId)
      .neq('status', 'read')
      .is('read_at', null)
      .contains('data', { type: 'content_approval_request', entity: 'grand-events', entityId: id })
      .limit(1)
    const unread = assertNoError<Array<{ id: string }>>(unreadResult).data ?? []
    if (!unread.length) continue

    await createControlNotification({
      type: 'content_approval_reminder',
      userId: approverUserId,
      title: 'Recordatorio de autorización editorial',
      body: `Sigue pendiente la revisión de ${normalizeString(record.title) || normalizeString(record.name) || 'la publicación'}.`,
      deepLink: '/control/eventos-magnos',
      idempotencyKey: `content-approval-reminder:grand-events:${id}:${approverUserId}:${reminderDayKey(now)}`,
      data: {
        entity: 'grand-events',
        entityId: id,
        requestedBy: approval.requested_by ?? null,
      },
    })

    const metadata = normalizeRecordJson(record.metadata)
    await updateContent(config, id, withContentDefaults(config, {
      metadata: {
        ...metadata,
        editorial_approval: {
          ...approval,
          last_reminder_at: nowIso,
          reminder_count: Number(approval.reminder_count ?? 0) + 1,
          history: [
            ...approvalHistory(record),
            {
              action: 'approval_reminded',
              at: nowIso,
              to: approverUserId,
            },
          ],
        },
      },
    }, record))
    reminders += 1
  }

  return { processed: rows.length, reminders }
}

export async function createAdminContent(
  routeEntity: ContentRouteEntity,
  payload: Record<string, unknown>,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'create', user)
  if (config.publicEnabled && payload.status === config.publishStatus) {
    assertPublicationWindowReady(payload)
  }
  if (isEventContentRoute(routeEntity) && payload.status === 'published' && payload.sales_enabled === true) {
    throw httpError(422, 'Guarda el evento como borrador, configura sus boletos y después publícalo')
  }
  return insertContent(config, withContentDefaults(config, { ...payload, created_by: user.userId, updated_by: user.userId }))
}

export async function updateAdminContent(
  routeEntity: ContentRouteEntity,
  id: string,
  payload: Record<string, unknown>,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'update', user)
  const current = config.publicEnabled || config.defaultMetadata
    ? await getContentById(config, id)
    : null
  if (isEventContentRoute(routeEntity)) {
    if (!current?.data) throw httpError(404, 'Evento no encontrado')
    const currentRecord = current.data as unknown as Record<string, unknown>
    const candidate = { ...currentRecord, ...payload }
    if (candidate.status === 'published') {
      assertPublicationWindowReady(candidate)
      const publishingNow = currentRecord.status !== 'published' && payload.status === 'published'
      const enablingSales = currentRecord.sales_enabled !== true && payload.sales_enabled === true
      if (candidate.sales_enabled === true && (publishingNow || enablingSales)) {
        await assertEventSalesReady(id, candidate)
      }
    }
  } else if (config.publicEnabled && payload.status === config.publishStatus) {
    const candidate = { ...(current?.data as unknown as Record<string, unknown> | undefined), ...payload }
    assertPublicationWindowReady(candidate)
  }
  const currentRecord = current?.data as Record<string, unknown> | undefined
  const updatePayload = keepPublishedContentImmediatelyVisible(config, currentRecord, payload)
  return updateContent(
    config,
    id,
    withContentDefaults(config, { ...updatePayload, updated_by: user.userId }, currentRecord),
  )
}

export async function deleteAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'delete', user)
  return softDeleteContent(config, id)
}

export async function applyPublicationAction(
  routeEntity: string,
  id: string,
  action: PublicationAction,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, action, user)
  const current = (config.publicEnabled && action === 'publish') || config.defaultMetadata
    ? await getContentById(config, id)
    : null
  if (isEventContentRoute(routeEntity) && action === 'publish') {
    if (!current?.data) throw httpError(404, 'Evento no encontrado')
    assertPublicationWindowReady(current.data as unknown as Record<string, unknown>)
    await assertEventSalesReady(id, current.data as unknown as Record<string, unknown>)
  } else if (config.publicEnabled && action === 'publish' && current?.data) {
    assertPublicationWindowReady(current.data as unknown as Record<string, unknown>)
  }
  const statusPatch: Record<string, unknown> = buildStatusPatch(config, action)
  if (routeEntity === 'grand-events' && action === 'publish' && current?.data) {
    const record = current.data as unknown as Record<string, unknown>
    const previousMetadata = normalizeRecordJson(record.metadata)
    const previousApproval = editorialApproval(record)
    if (previousApproval.status !== 'approved') {
      const now = new Date().toISOString()
      statusPatch.metadata = {
        ...previousMetadata,
        editorial_approval: {
          ...previousApproval,
          status: 'published_without_approval',
          unauthorized_publish_at: now,
          unauthorized_publish_by: user.userId ?? null,
          history: [
            ...approvalHistory(record),
            {
              action: 'published_without_approval',
              at: now,
              by: user.userId ?? null,
            },
          ],
        },
      }
      await writeContentAudit(user, 'content_published_without_approval', config.entityType, id, {
        entity: routeEntity,
      })
    }
  }
  return updateContent(
    config,
    id,
    withContentDefaults(config, { ...statusPatch, updated_by: user.userId }, current?.data as Record<string, unknown> | undefined),
  )
}

export async function schedulePublicationAction(
  routeEntity: string,
  id: string,
  action: PublicationAction,
  runAt: string,
  timezone: string,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'schedule', user)
  if (isEventContentRoute(routeEntity) && action === 'publish') {
    const current = await getContentById(config, id)
    if (!current.data) throw httpError(404, 'Evento no encontrado')
    assertPublicationWindowReady(current.data as unknown as Record<string, unknown>)
    await assertEventSalesReady(id, current.data as unknown as Record<string, unknown>)
  }
  return createPublicationJob(config, id, action, runAt, timezone, user.userId)
}

export async function duplicateAdminContent(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'duplicate', user)
  const { data } = await getContentById(config, id)
  if (!data) throw httpError(404, 'Contenido no encontrado')
  return insertContent(config, withContentDefaults(config, clonePayload(data as unknown as Record<string, unknown>, config)))
}

export async function listAdminContentVersions(routeEntity: string, id: string, user: UserContext) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'read', user)
  return listVersions(config, id)
}

export async function restoreAdminContentVersion(
  routeEntity: string,
  id: string,
  version: number,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'restore', user)
  const { data } = await getVersion(config, id, version)
  if (!data || typeof data !== 'object') throw httpError(404, 'Versión no encontrada')
  const snapshot = (data as { snapshot?: unknown }).snapshot
  if (!snapshot || typeof snapshot !== 'object') throw httpError(422, 'Versión no restaurable')
  return updateContent(config, id, withContentDefaults(config, sanitizeRestorePayload(snapshot as Record<string, unknown>), snapshot as Record<string, unknown>))
}

export async function generatePreviewToken(
  routeEntity: string,
  id: string,
  expiresInMinutes: number,
  locale: string,
  user: UserContext,
) {
  const config = assertEntity(routeEntity)
  requirePermission(config, 'preview', user)
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  const { data } = await createPreviewTokenRecord({
    tokenHash: hashToken(token),
    entityType: config.entityType,
    entityId: id,
    locale,
    expiresAt,
    userId: user.userId,
  })
  return { ...data, token }
}

export async function getPreviewContent(token: string) {
  const { data } = await getPreviewToken(hashToken(token))
  if (!data || typeof data !== 'object') throw httpError(404, 'Preview no encontrado')

  const row = data as {
    id: string
    entity_type: string
    entity_id: string
    expires_at: string
    revoked_at: string | null
  }

  if (row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw httpError(404, 'Preview no encontrado')
  }

  const config = Object.values(contentConfigs).find((item) => item.entityType === row.entity_type)
  if (!config) throw httpError(404, 'Preview no encontrado')

  await markPreviewTokenUsed(row.id)
  const content = await getContentById(config, row.entity_id)
  if (!content.data) throw httpError(404, 'Preview no encontrado')
  return {
    entity: config.entityType,
    data: content.data,
  }
}

export async function listPublicEntity(routeEntity: string, locale: string) {
  const config = assertEntity(routeEntity)
  if (!config.publicEnabled) throw httpError(404, 'Entidad no permitida')
  return listPublicContent(config, locale)
}

export async function getPublicEntityBySlug(routeEntity: string, slug: string, locale: string) {
  const config = assertEntity(routeEntity)
  if (!config.publicEnabled || !config.slugColumn) throw httpError(404, 'Entidad no permitida')
  return getPublicContentBySlug(config, slug, locale)
}

export async function processDuePublicationJobs(limit = 10) {
  const workerId = `api-${randomUUID()}`
  const jobs = (await lockDuePublicationJobs(limit, workerId)) as Array<{
    id: string
    entity_type: string
    entity_id: string
    action: PublicationAction
    attempts: number
    max_attempts: number
    metadata?: unknown
  }>

  for (const job of jobs) {
    const config = await resolvePublicationJobConfig(job)
    if (!config) {
      await failPublicationJob(job.id, job.attempts, job.max_attempts)
      continue
    }

    try {
      const current = config.defaultMetadata ? await getContentById(config, job.entity_id) : null
      await updateContent(
        config,
        job.entity_id,
        withContentDefaults(config, buildStatusPatch(config, job.action), current?.data as Record<string, unknown> | undefined),
      )
      await completePublicationJob(job.id)
    } catch {
      await failPublicationJob(job.id, job.attempts, job.max_attempts)
    }
  }

  return { processed: jobs.length }
}
