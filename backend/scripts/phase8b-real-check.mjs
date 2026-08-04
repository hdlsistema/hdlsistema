import { randomBytes } from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE8B_API_BASE_URL ?? 'http://127.0.0.1:3001'
const adminEmail = 'pgaribay@alqia.tech'
const runId = `QA_FASE8B_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  admin: { email: maskEmail(adminEmail), exists: false, roles: [] },
  customer: { email: maskEmail(`${runId.toLowerCase()}@example.invalid`), created: false, roles: [] },
  health: null,
  publicContent: {},
  unauthenticated: {},
  customerAccess: {},
  customerReads: {},
  customerWrites: {},
  validations: {
    customerProfile: false,
    availability: false,
    reservationCreated: false,
    reservationVisible: false,
    rescheduled: false,
    cancelled: false,
    membershipReadable: false,
    adminPreviewSafe: false,
    customerCannotAdmin: false,
    auditLog: false,
    cleanupClean: false,
  },
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  secretsPrinted: false,
  tokensPrinted: false,
}

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.log(JSON.stringify({ ok: false, status: 'missing_configuration', secretsPrinted: false, tokensPrinted: false }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const created = {
  customerUserId: null,
  customerEmail: `${runId.toLowerCase()}@example.invalid`,
  customerId: null,
  slotIds: [],
  reservationId: null,
}

function maskEmail(email) {
  const [name, domain = ''] = email.split('@')
  const [domainName = '', ...rest] = domain.split('.')
  return `${name.slice(0, 2)}***@${domainName.slice(0, 1)}***.${rest.join('.') || '***'}`
}

function rolesFromRows(rows) {
  return (rows ?? [])
    .map((row) => {
      const value = row.roles
      if (Array.isArray(value)) return value[0]?.code
      return value?.code
    })
    .filter(Boolean)
}

async function sleep(ms) {
  await new Promise((resolveTimer) => setTimeout(resolveTimer, ms))
}

async function findUser(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error('list_users_failed')
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function getRoles(userId) {
  const { data, error } = await admin
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', userId)
  if (error) throw new Error('roles_failed')
  return rolesFromRows(data)
}

async function sessionFor(email) {
  const user = await findUser(email)
  if (!user) return { exists: false, roles: [], session: null }
  const roles = await getRoles(user.id)
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error('magiclink_failed')
  const actionLink = data.properties?.action_link ?? ''
  const hashedToken =
    data.properties?.hashed_token ?? new URL(actionLink).searchParams.get('token_hash')
  if (!hashedToken) throw new Error('token_hash_missing')
  const { data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  })
  if (verifyError || !sessionData.session) throw new Error('verify_failed')
  return { exists: true, roles, session: sessionData.session }
}

async function createCustomerSession() {
  const password = `Tmp-${randomBytes(18).toString('base64url')}1a!`
  const { data, error } = await admin.auth.admin.createUser({
    email: created.customerEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'QA_FASE8B',
      last_name: 'Temporal',
      display_name: `${runId} Temporal`,
    },
  })
  if (error || !data.user) throw new Error('customer_user_create_failed')
  created.customerUserId = data.user.id
  result.customer.created = true
  result.temporaryDataCreated = true

  await sleep(900)

  const roles = await getRoles(data.user.id)
  result.customer.roles = roles
  if (!roles.includes('customer')) throw new Error('customer_role_missing')

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (customerError || !customer?.id) throw new Error('customer_profile_missing')
  created.customerId = customer.id

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: created.customerEmail,
    password,
  })
  if (signInError || !signInData.session) throw new Error('customer_login_failed')
  return signInData.session
}

async function hit(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text.slice(0, 80) }
    }
  }
  return { status: response.status, body }
}

function statusOnly(entry) {
  return entry.status
}

function firstId(entry) {
  return entry.body?.data?.id ?? null
}

async function exposeQaSlot(slotId) {
  const { error } = await admin
    .from('experience_slots')
    .update({
      status: 'published',
      visible_in_app: true,
      is_bookable: true,
      operational_status: 'open',
    })
    .eq('id', slotId)
  if (error) throw new Error('slot_publish_failed')
}

async function pickExperience() {
  const { data, error } = await admin
    .from('experiences')
    .select('id')
    .eq('status', 'published')
    .eq('visible_in_app', true)
    .is('deleted_at', null)
    .limit(1)
  if (error) throw new Error('experience_lookup_failed')
  if (!data?.[0]?.id) throw new Error('published_experience_missing')
  return data[0].id
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.reservationId) {
    await admin.from('reservation_status_history').delete().eq('reservation_id', created.reservationId)
    await admin.from('audit_logs').delete().eq('entity_id', created.reservationId)
    await admin.from('reservations').delete().eq('id', created.reservationId)
  }
  for (const slotId of created.slotIds) {
    await admin.from('audit_logs').delete().eq('entity_id', slotId)
    await admin.from('experience_slots').delete().eq('id', slotId)
  }
  if (created.customerId) {
    await admin.from('audit_logs').delete().eq('entity_id', created.customerId)
    await admin.from('customers').delete().eq('id', created.customerId)
  }
  if (created.customerUserId) {
    await admin.from('user_preferences').delete().eq('user_id', created.customerUserId)
    await admin.from('user_roles').delete().eq('user_id', created.customerUserId)
    await admin.from('profiles').delete().eq('id', created.customerUserId)
    await admin.auth.admin.deleteUser(created.customerUserId)
  }

  const [{ data: customers }, { data: slots }, { data: reservations }] = await Promise.all([
    admin.from('customers').select('id').eq('email', created.customerEmail),
    admin.from('experience_slots').select('id').in('id', created.slotIds.length ? created.slotIds : ['00000000-0000-0000-0000-000000000000']),
    created.reservationId
      ? admin.from('reservations').select('id').eq('id', created.reservationId)
      : Promise.resolve({ data: [] }),
  ])
  result.validations.cleanupClean = (customers ?? []).length === 0 && (slots ?? []).length === 0 && (reservations ?? []).length === 0
  result.cleanup.completed = result.validations.cleanupClean
}

try {
  const [adminSession, customerSession] = await Promise.all([
    sessionFor(adminEmail),
    createCustomerSession(),
  ])
  result.admin.exists = adminSession.exists
  result.admin.roles = adminSession.roles
  if (!adminSession.session || !adminSession.roles.some((role) => ['super_admin', 'admin'].includes(role))) {
    throw new Error('admin_session_missing')
  }

  const adminToken = adminSession.session.access_token
  const customerToken = customerSession.access_token

  const health = await hit('/api/health')
  result.health = statusOnly(health)
  result.publicContent['GET /api/public/wines'] = statusOnly(await hit('/api/public/wines'))
  result.publicContent['GET /api/public/experiences'] = statusOnly(await hit('/api/public/experiences'))
  result.publicContent['GET /api/public/events'] = statusOnly(await hit('/api/public/events'))
  result.publicContent['GET /api/public/membership-plans'] = statusOnly(await hit('/api/public/membership-plans'))

  result.unauthenticated['GET /api/customer/me'] = statusOnly(await hit('/api/customer/me'))
  result.unauthenticated['GET /api/customer/reservations'] = statusOnly(await hit('/api/customer/reservations'))
  result.customerAccess['GET /api/admin/users'] = statusOnly(await hit('/api/admin/users', { token: customerToken }))
  result.customerAccess['GET /api/admin/availability'] = statusOnly(await hit('/api/admin/availability', { token: customerToken }))
  result.customerAccess['GET /api/customer/me as admin'] = statusOnly(await hit('/api/customer/me', { token: adminToken }))

  const experienceId = await pickExperience()
  const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  start.setUTCHours(18, 0, 0, 0)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const secondStart = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const secondEnd = new Date(secondStart.getTime() + 90 * 60 * 1000)

  const createSlot = await hit('/api/admin/availability/slots', {
    method: 'POST',
    token: adminToken,
    body: {
      experienceId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      capacity: 3,
      notes: runId,
      isBookable: true,
      operationalStatus: 'open',
    },
  })
  const slotId = firstId(createSlot)
  if (!slotId) throw new Error('slot_create_failed')
  created.slotIds.push(slotId)
  await exposeQaSlot(slotId)

  const createSecondSlot = await hit('/api/admin/availability/slots', {
    method: 'POST',
    token: adminToken,
    body: {
      experienceId,
      startAt: secondStart.toISOString(),
      endAt: secondEnd.toISOString(),
      capacity: 3,
      notes: runId,
      isBookable: true,
      operationalStatus: 'open',
    },
  })
  const secondSlotId = firstId(createSecondSlot)
  if (!secondSlotId) throw new Error('second_slot_create_failed')
  created.slotIds.push(secondSlotId)
  await exposeQaSlot(secondSlotId)

  const me = await hit('/api/customer/me', { token: customerToken })
  const availability = await hit(`/api/customer/availability?experienceId=${experienceId}`, { token: customerToken })
  const membership = await hit('/api/customer/membership', { token: customerToken })
  const benefits = await hit('/api/customer/membership/benefits', { token: customerToken })
  const loyalty = await hit('/api/customer/membership/loyalty', { token: customerToken })

  result.customerReads['GET /api/customer/me'] = statusOnly(me)
  result.customerReads['GET /api/customer/availability'] = statusOnly(availability)
  result.customerReads['GET /api/customer/membership'] = statusOnly(membership)
  result.customerReads['GET /api/customer/membership/benefits'] = statusOnly(benefits)
  result.customerReads['GET /api/customer/membership/loyalty'] = statusOnly(loyalty)

  const reservation = await hit('/api/customer/reservations', {
    method: 'POST',
    token: customerToken,
    body: {
      experienceSlotId: slotId,
      peopleCount: 2,
      customerNotes: runId,
      language: 'es',
      idempotencyKey: `${runId}_reservation`,
    },
  })
  result.customerWrites['POST /api/customer/reservations'] = statusOnly(reservation)
  created.reservationId = firstId(reservation)
  if (!created.reservationId) throw new Error('customer_reservation_create_failed')

  const reservations = await hit('/api/customer/reservations', { token: customerToken })
  result.customerReads['GET /api/customer/reservations'] = statusOnly(reservations)

  const reschedule = await hit(`/api/customer/reservations/${created.reservationId}/reschedule`, {
    method: 'POST',
    token: customerToken,
    body: {
      experienceSlotId: secondSlotId,
      idempotencyKey: `${runId}_reschedule`,
    },
  })
  result.customerWrites['POST /api/customer/reservations/:id/reschedule'] = statusOnly(reschedule)

  const cancel = await hit(`/api/customer/reservations/${created.reservationId}/cancel`, {
    method: 'POST',
    token: customerToken,
    body: { reason: runId },
  })
  result.customerWrites['POST /api/customer/reservations/:id/cancel'] = statusOnly(cancel)

  const { data: auditRows } = await admin
    .from('audit_logs')
    .select('id,action')
    .eq('entity_id', created.reservationId)

  result.validations.customerProfile = statusOnly(me) === 200 && Boolean(me.body?.data?.customer?.customerNumber)
  result.validations.availability = statusOnly(availability) === 200 && (availability.body?.data ?? []).some((slot) => slot.id === slotId)
  result.validations.reservationCreated = statusOnly(reservation) === 201
  result.validations.reservationVisible = statusOnly(reservations) === 200 && (reservations.body?.data ?? []).some((item) => item.id === created.reservationId)
  result.validations.rescheduled = statusOnly(reschedule) === 200
  result.validations.cancelled = statusOnly(cancel) === 200
  result.validations.membershipReadable = [statusOnly(membership), statusOnly(benefits), statusOnly(loyalty)].every((status) => status === 200)
  result.validations.adminPreviewSafe = [200, 404].includes(result.customerAccess['GET /api/customer/me as admin'])
  result.validations.customerCannotAdmin =
    result.customerAccess['GET /api/admin/users'] === 403 &&
    result.customerAccess['GET /api/admin/availability'] === 403
  result.validations.auditLog = (auditRows ?? []).some((row) => row.action === 'customer_reservation_created')

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    ...Object.values(result.publicContent).map((status) => status === 200),
    ...Object.values(result.unauthenticated).map((status) => status === 401),
    ...Object.values(result.customerReads).map((status) => status === 200),
    ...Object.values(result.customerWrites).map((status) => [200, 201].includes(status)),
    ...Object.values(result.validations).map(Boolean),
    result.cleanup.completed,
  ]
  result.ok = expected.every(Boolean)
  console.log(JSON.stringify(result))
  if (!result.ok) process.exit(1)
} catch (error) {
  await cleanup().catch(() => undefined)
  console.log(
    JSON.stringify({
      ...result,
      ok: false,
      status: error instanceof Error ? error.message : 'unknown_error',
      secretsPrinted: false,
      tokensPrinted: false,
    }),
  )
  process.exit(1)
}
