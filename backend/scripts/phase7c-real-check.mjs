import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE7C_API_BASE_URL ?? 'http://127.0.0.1:3001'
const adminEmail = 'pgaribay@alqia.tech'
const customerEmail = 'cliente.prueba@alqia.tech'
const runId = `QA_FASE7C_${Date.now()}`
const tagSlug = runId.toLowerCase().replace(/_/g, '-')

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
  validations: {
    auditLog: false,
    exportSafe: false,
    detailLoaded: false,
    relationsLoaded: false,
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
  customerId: null,
  customerEmail: `${runId.toLowerCase()}@example.invalid`,
  tagId: null,
  noteId: null,
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
  const text = await response.text()
  let body = null
  if (text && !options.csv) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }
  return { status: response.status, body, text: options.csv ? text : '' }
}

function statusOnly(entry) {
  return entry.status
}

function firstId(entry) {
  return entry.body?.data?.id ?? null
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.customerId) {
    await admin.from('customer_tag_assignments').delete().eq('customer_id', created.customerId)
    await admin.from('customer_notes').delete().eq('customer_id', created.customerId)
    await admin.from('audit_logs').delete().eq('entity_id', created.customerId)
  }
  if (created.tagId) {
    await admin.from('customer_tag_assignments').delete().eq('tag_id', created.tagId)
    await admin.from('audit_logs').delete().eq('entity_id', created.tagId)
    await admin.from('customer_tags').delete().eq('id', created.tagId)
  }
  if (created.noteId) {
    await admin.from('audit_logs').delete().eq('entity_id', created.noteId)
  }
  await admin.from('customer_tags').delete().eq('slug', tagSlug)
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

  if (!adminSession.session || !adminSession.roles.some((role) => ['super_admin', 'admin'].includes(role))) {
    throw new Error('admin_session_missing')
  }
  if (!customerSession.session) throw new Error('customer_session_missing')

  const adminToken = adminSession.session.access_token
  const customerToken = customerSession.session.access_token

  result.health = statusOnly(await hit('/api/health'))
  result.unauthenticated['GET /api/admin/customers'] = statusOnly(await hit('/api/admin/customers'))
  result.unauthenticated['GET /api/admin/customer-tags'] = statusOnly(await hit('/api/admin/customer-tags'))
  result.customerAccess['GET /api/admin/customers'] = statusOnly(await hit('/api/admin/customers', { token: customerToken }))
  result.customerAccess['GET /api/admin/customer-tags'] = statusOnly(await hit('/api/admin/customer-tags', { token: customerToken }))

  const readPaths = [
    '/api/admin/customers',
    '/api/admin/customer-tags',
    '/api/admin/customers/export',
  ]
  for (const path of readPaths) {
    result.adminReads[`GET ${path}`] = statusOnly(await hit(path, { token: adminToken }))
  }

  const customer = await hit('/api/admin/customers', {
    method: 'POST',
    token: adminToken,
    body: {
      firstName: 'QA_FASE7C',
      lastName: 'Temporal',
      displayName: `${runId} Temporal`,
      email: created.customerEmail,
      phone: `+5200${String(Date.now()).slice(-8)}`,
      source: 'QA_FASE7C',
      segment: 'new',
      preferredLanguage: 'es',
      marketingEmailConsent: true,
      marketingPushConsent: false,
      notes: runId,
    },
  })
  result.adminWrites['POST /api/admin/customers'] = statusOnly(customer)
  created.customerId = firstId(customer)
  if (!created.customerId) throw new Error('customer_create_failed')
  result.temporaryDataCreated = true

  result.adminWrites['PATCH /api/admin/customers/:id'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      segment: 'recurrente',
      marketingPushConsent: true,
      notes: `${runId} editado`,
    },
  }))

  const tag = await hit('/api/admin/customer-tags', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `${runId} Seguimiento`,
      slug: tagSlug,
      color: '#681126',
      description: 'QA temporal',
    },
  })
  result.adminWrites['POST /api/admin/customer-tags'] = statusOnly(tag)
  created.tagId = firstId(tag)
  if (!created.tagId) throw new Error('tag_create_failed')

  result.adminWrites['PATCH /api/admin/customer-tags/:id'] = statusOnly(await hit(`/api/admin/customer-tags/${created.tagId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { color: '#b48a55' },
  }))
  result.adminWrites['POST /api/admin/customers/:id/tags'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/tags`, {
    method: 'POST',
    token: adminToken,
    body: { tagId: created.tagId },
  }))

  const note = await hit(`/api/admin/customers/${created.customerId}/notes`, {
    method: 'POST',
    token: adminToken,
    body: { note: `${runId} nota temporal` },
  })
  result.adminWrites['POST /api/admin/customers/:id/notes'] = statusOnly(note)
  created.noteId = firstId(note)
  if (!created.noteId) throw new Error('note_create_failed')

  result.adminWrites['PATCH /api/admin/customers/:id/notes/:noteId'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/notes/${created.noteId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { note: `${runId} nota editada` },
  }))

  const detail = await hit(`/api/admin/customers/${created.customerId}`, { token: adminToken })
  result.adminReads['GET /api/admin/customers/:id'] = statusOnly(detail)
  result.validations.detailLoaded = detail.status === 200 && detail.body?.data?.displayName?.includes(runId)

  const relations = await Promise.all([
    hit(`/api/admin/customers/${created.customerId}/reservations`, { token: adminToken }),
    hit(`/api/admin/customers/${created.customerId}/orders`, { token: adminToken }),
    hit(`/api/admin/customers/${created.customerId}/memberships`, { token: adminToken }),
    hit(`/api/admin/customers/${created.customerId}/history`, { token: adminToken }),
  ])
  result.adminReads['GET /api/admin/customers/:id/reservations'] = statusOnly(relations[0])
  result.adminReads['GET /api/admin/customers/:id/orders'] = statusOnly(relations[1])
  result.adminReads['GET /api/admin/customers/:id/memberships'] = statusOnly(relations[2])
  result.adminReads['GET /api/admin/customers/:id/history'] = statusOnly(relations[3])
  result.validations.relationsLoaded = relations.every((entry) => entry.status === 200)

  const audit = await admin
    .from('audit_logs')
    .select('id')
    .eq('entity_id', created.customerId)
    .limit(1)
  result.validations.auditLog = !audit.error && Boolean(audit.data?.length)

  const exportResponse = await hit('/api/admin/customers/export', { token: adminToken, csv: true })
  result.adminReads['GET /api/admin/customers/export after QA'] = statusOnly(exportResponse)
  result.validations.exportSafe =
    exportResponse.status === 200 &&
    exportResponse.text.includes('customer_number') &&
    !exportResponse.text.includes(created.customerId)

  result.adminWrites['POST /api/admin/customers/:id/archive'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/archive`, {
    method: 'POST',
    token: adminToken,
  }))
  result.adminWrites['POST /api/admin/customers/:id/restore'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/restore`, {
    method: 'POST',
    token: adminToken,
  }))
  result.adminWrites['DELETE /api/admin/customers/:id/tags/:tagId'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/tags/${created.tagId}`, {
    method: 'DELETE',
    token: adminToken,
  }))
  result.adminWrites['DELETE /api/admin/customers/:id/notes/:noteId'] = statusOnly(await hit(`/api/admin/customers/${created.customerId}/notes/${created.noteId}`, {
    method: 'DELETE',
    token: adminToken,
  }))

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    result.unauthenticated['GET /api/admin/customers'] === 401,
    result.unauthenticated['GET /api/admin/customer-tags'] === 401,
    result.customerAccess['GET /api/admin/customers'] === 403,
    result.customerAccess['GET /api/admin/customer-tags'] === 403,
    ...Object.values(result.adminReads).map((status) => status === 200),
    ...Object.values(result.adminWrites).map((status) => [200, 201].includes(status)),
    result.validations.auditLog,
    result.validations.exportSafe,
    result.validations.detailLoaded,
    result.validations.relationsLoaded,
    result.cleanup.completed,
  ]

  result.ok = expected.every(Boolean)
  console.log(JSON.stringify(result))
  if (!result.ok) process.exit(1)
} catch (error) {
  await cleanup().catch(() => undefined)
  console.log(JSON.stringify({
    ...result,
    ok: false,
    status: error instanceof Error ? error.message : 'unknown_error',
    secretsPrinted: false,
    tokensPrinted: false,
  }))
  process.exit(1)
}
