import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE7B_API_BASE_URL ?? 'http://127.0.0.1:3001'
const adminEmail = 'pgaribay@alqia.tech'
const customerEmail = 'cliente.prueba@alqia.tech'
const runId = `QA_FASE7B_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  admin: { email: maskEmail(adminEmail), exists: false, roles: [] },
  customer: { email: maskEmail(customerEmail), exists: false, roles: [] },
  health: null,
  unauthenticated: {},
  customerAccess: {},
  adminReads: {},
  adminWrites: {},
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  secretsPrinted: false,
  tokensPrinted: false,
}

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.log(JSON.stringify({ ok: false, status: 'missing_configuration', secretsPrinted: false }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const created = {
  reservationId: null,
  blockoutId: null,
  slotIds: [],
  customerEmail: `${runId.toLowerCase()}@example.invalid`,
  customerId: null,
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

async function hit(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  let body = null
  const text = await response.text()
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

async function pickExperience() {
  const { data, error } = await admin
    .from('experiences')
    .select('id')
    .is('deleted_at', null)
    .limit(1)
  if (error) throw new Error('experience_lookup_failed')
  if (!data?.[0]?.id) throw new Error('experience_missing')
  return data[0].id
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.reservationId) {
    await admin.from('reservation_status_history').delete().eq('reservation_id', created.reservationId)
    await admin.from('reservations').delete().eq('id', created.reservationId)
  }
  if (created.blockoutId) {
    await admin.from('experience_blockouts').delete().eq('id', created.blockoutId)
  }
  for (const slotId of created.slotIds) {
    await admin.from('experience_slots').delete().eq('id', slotId)
  }
  await admin.from('customers').delete().eq('email', created.customerEmail)
  result.cleanup.completed = true
}

try {
  const [adminSession, customerSession] = await Promise.all([
    sessionFor(adminEmail),
    sessionFor(customerEmail),
  ])
  result.admin.exists = adminSession.exists
  result.admin.roles = adminSession.roles
  result.customer.exists = customerSession.exists
  result.customer.roles = customerSession.roles

  if (!adminSession.session || !adminSession.roles.includes('super_admin')) {
    throw new Error('admin_session_missing')
  }
  if (!customerSession.session) {
    throw new Error('customer_session_missing')
  }

  const adminToken = adminSession.session.access_token
  const customerToken = customerSession.session.access_token

  result.health = statusOnly(await hit('/api/health'))
  result.unauthenticated['GET /api/admin/availability'] = statusOnly(await hit('/api/admin/availability'))
  result.unauthenticated['GET /api/admin/reservations'] = statusOnly(await hit('/api/admin/reservations'))
  result.customerAccess['GET /api/admin/availability'] = statusOnly(await hit('/api/admin/availability', { token: customerToken }))
  result.customerAccess['GET /api/admin/reservations'] = statusOnly(await hit('/api/admin/reservations', { token: customerToken }))

  const readPaths = [
    '/api/admin/availability',
    '/api/admin/availability/calendar',
    '/api/admin/availability/slots',
    '/api/admin/availability/blockouts',
    '/api/admin/reservations',
    '/api/admin/reservations/export',
  ]
  for (const path of readPaths) {
    result.adminReads[`GET ${path}`] = statusOnly(await hit(path, { token: adminToken }))
  }

  const experienceId = await pickExperience()
  const start = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
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
      capacity: 2,
      notes: runId,
      isBookable: true,
      operationalStatus: 'open',
    },
  })
  result.adminWrites['POST /api/admin/availability/slots'] = statusOnly(createSlot)
  const slotId = firstId(createSlot)
  if (!slotId) throw new Error('slot_create_failed')
  created.slotIds.push(slotId)
  result.temporaryDataCreated = true

  const secondSlot = await hit('/api/admin/availability/slots', {
    method: 'POST',
    token: adminToken,
    body: {
      experienceId,
      startAt: secondStart.toISOString(),
      endAt: secondEnd.toISOString(),
      capacity: 2,
      notes: runId,
      isBookable: true,
      operationalStatus: 'open',
    },
  })
  const secondSlotId = firstId(secondSlot)
  if (!secondSlotId) throw new Error('second_slot_create_failed')
  created.slotIds.push(secondSlotId)

  result.adminWrites['POST /api/admin/availability/slots/:id/block'] = statusOnly(await hit(`/api/admin/availability/slots/${slotId}/block`, {
    method: 'POST',
    token: adminToken,
    body: { reason: runId },
  }))
  result.adminWrites['POST /api/admin/availability/slots/:id/unblock'] = statusOnly(await hit(`/api/admin/availability/slots/${slotId}/unblock`, {
    method: 'POST',
    token: adminToken,
  }))

  const blockout = await hit('/api/admin/availability/blockouts', {
    method: 'POST',
    token: adminToken,
    body: {
      experienceId,
      startAt: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      reason: runId,
      blockType: 'operations',
    },
  })
  result.adminWrites['POST /api/admin/availability/blockouts'] = statusOnly(blockout)
  created.blockoutId = firstId(blockout)

  const reservation = await hit('/api/admin/reservations', {
    method: 'POST',
    token: adminToken,
    body: {
      customerName: 'QA FASE7B Temporal',
      customerEmail: created.customerEmail,
      customerPhone: '0000000000',
      experienceSlotId: slotId,
      peopleCount: 1,
      status: 'pending',
      source: 'QA_FASE7B',
      internalNotes: runId,
    },
  })
  result.adminWrites['POST /api/admin/reservations'] = statusOnly(reservation)
  created.reservationId = firstId(reservation)
  created.customerId = reservation.body?.data?.customerId ?? null
  if (!created.reservationId) throw new Error('reservation_create_failed')

  result.adminWrites['GET /api/admin/reservations/:id'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}`, { token: adminToken }))
  result.adminWrites['POST /api/admin/reservations/:id/reschedule'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/reschedule`, {
    method: 'POST',
    token: adminToken,
    body: { experienceSlotId: secondSlotId },
  }))
  result.adminWrites['POST /api/admin/reservations/:id/confirm'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/confirm`, {
    method: 'POST',
    token: adminToken,
  }))
  result.adminWrites['POST /api/admin/reservations/:id/change-party-size'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/change-party-size`, {
    method: 'POST',
    token: adminToken,
    body: { peopleCount: 2 },
  }))
  result.adminWrites['POST /api/admin/reservations/:id/notes'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/notes`, {
    method: 'POST',
    token: adminToken,
    body: { note: runId },
  }))
  result.adminWrites['GET /api/admin/reservations/:id/history'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/history`, { token: adminToken }))
  result.adminWrites['POST /api/admin/reservations/:id/cancel'] = statusOnly(await hit(`/api/admin/reservations/${created.reservationId}/cancel`, {
    method: 'POST',
    token: adminToken,
    body: { reason: runId },
  }))

  if (created.blockoutId) {
    result.adminWrites['DELETE /api/admin/availability/blockouts/:id'] = statusOnly(await hit(`/api/admin/availability/blockouts/${created.blockoutId}`, {
      method: 'DELETE',
      token: adminToken,
    }))
    created.blockoutId = null
  }

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    result.unauthenticated['GET /api/admin/availability'] === 401,
    result.unauthenticated['GET /api/admin/reservations'] === 401,
    result.customerAccess['GET /api/admin/availability'] === 403,
    result.customerAccess['GET /api/admin/reservations'] === 403,
    ...Object.values(result.adminReads).map((status) => status === 200),
    ...Object.values(result.adminWrites).map((status) => [200, 201].includes(status)),
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
