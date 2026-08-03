import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE7D_API_BASE_URL ?? 'http://127.0.0.1:3001'
const adminEmail = 'pgaribay@alqia.tech'
const customerEmail = 'cliente.prueba@alqia.tech'
const runId = `QA_FASE7D_${Date.now()}`

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
    exportSafe: false,
    accessPassIssued: false,
    checkinRegistered: false,
    doubleCheckinBlocked: false,
    paymentRecorded: false,
    refundRegistered: false,
    historyLoaded: false,
  },
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  temporaryCreation: [],
  dataMutated: false,
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
  orderId: null,
  paymentId: null,
  accessPassId: null,
  checkinId: null,
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

async function createTemporaryCustomer() {
  const phone = `5200${String(Date.now()).slice(-8)}`
  const { data, error } = await admin
    .from('customers')
    .insert({
      customer_number: runId,
      first_name: 'QA_FASE7D',
      last_name: 'Temporal',
      display_name: `${runId} Temporal`,
      email: created.customerEmail,
      phone: `+${phone}`,
      phone_normalized: phone,
      status: 'published',
      source: 'QA_FASE7D',
      segment: 'new',
      preferred_language: 'es',
      notes: runId,
    })
    .select('id')
    .single()
  if (error || !data?.id) throw new Error('customer_setup_failed')
  created.customerId = data.id
  result.temporaryCreation.push('customer')
  result.temporaryDataCreated = true
  result.dataMutated = true
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.checkinId) {
    await admin.from('checkins').delete().eq('id', created.checkinId)
  }
  if (created.accessPassId) {
    await admin.from('access_passes').delete().eq('id', created.accessPassId)
  }
  if (created.paymentId) {
    await admin.from('payments').delete().eq('id', created.paymentId)
  }
  if (created.orderId) {
    await admin.from('order_items').delete().eq('order_id', created.orderId)
    await admin.from('orders').delete().eq('id', created.orderId)
    await admin.from('audit_logs').delete().eq('entity_id', created.orderId)
  }
  if (created.customerId) {
    await admin.from('audit_logs').delete().eq('entity_id', created.customerId)
    await admin.from('customers').delete().eq('id', created.customerId)
  } else {
    await admin.from('customers').delete().eq('email', created.customerEmail)
  }
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

  if (!adminSession.session || !adminSession.roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))) {
    throw new Error('admin_session_missing')
  }
  if (!customerSession.session) throw new Error('customer_session_missing')

  const adminToken = adminSession.session.access_token
  const customerToken = customerSession.session.access_token

  result.health = statusOnly(await hit('/api/health'))

  const protectedPaths = [
    '/api/admin/orders',
    '/api/admin/payments',
    '/api/admin/access-passes',
    '/api/admin/checkins',
  ]
  for (const path of protectedPaths) {
    result.unauthenticated[`GET ${path}`] = statusOnly(await hit(path))
    result.customerAccess[`GET ${path}`] = statusOnly(await hit(path, { token: customerToken }))
  }

  const readPaths = [
    '/api/admin/orders',
    '/api/admin/payments',
    '/api/admin/access-passes',
    '/api/admin/checkins',
    '/api/admin/orders/export',
    '/api/admin/payments/export',
    '/api/admin/checkins/export',
  ]
  for (const path of readPaths) {
    result.adminReads[`GET ${path}`] = statusOnly(await hit(path, { token: adminToken }))
  }

  await createTemporaryCustomer()

  const order = await hit('/api/admin/orders', {
    method: 'POST',
    token: adminToken,
    body: {
      customerId: created.customerId,
      source: 'QA_FASE7D',
      idempotencyKey: runId,
      items: [
        {
          itemType: 'experience',
          nameSnapshot: `${runId} acceso temporal`,
          skuSnapshot: runId,
          quantity: 1,
          unitPrice: 125,
        },
      ],
    },
  })
  result.adminWrites['POST /api/admin/orders'] = statusOnly(order)
  created.orderId = firstId(order)
  if (!created.orderId) throw new Error('order_create_failed')
  result.temporaryCreation.push('order')

  result.adminWrites['GET /api/admin/orders/:id'] = statusOnly(await hit(`/api/admin/orders/${created.orderId}`, { token: adminToken }))
  result.adminWrites['GET /api/admin/orders/:id/items'] = statusOnly(await hit(`/api/admin/orders/${created.orderId}/items`, { token: adminToken }))
  const payment = await hit('/api/admin/payments/manual', {
    method: 'POST',
    token: adminToken,
    body: {
      orderId: created.orderId,
      amount: 125,
      paymentMethodType: 'cash',
      paymentReference: runId,
      paidAt: new Date().toISOString(),
      notes: runId,
      idempotencyKey: `${runId}_payment`,
    },
  })
  result.adminWrites['POST /api/admin/payments/manual'] = statusOnly(payment)
  created.paymentId = firstId(payment)
  result.validations.paymentRecorded = Boolean(created.paymentId)
  if (!created.paymentId) throw new Error('payment_create_failed')
  result.temporaryCreation.push('payment')

  result.adminWrites['POST /api/admin/orders/:id/mark-processing'] = statusOnly(await hit(`/api/admin/orders/${created.orderId}/mark-processing`, {
    method: 'POST',
    token: adminToken,
  }))

  result.adminWrites['POST /api/admin/payments/:id/refund'] = statusOnly(await hit(`/api/admin/payments/${created.paymentId}/refund`, {
    method: 'POST',
    token: adminToken,
    body: { amount: 25, reason: runId },
  }))
  result.validations.refundRegistered = result.adminWrites['POST /api/admin/payments/:id/refund'] === 200

  result.adminWrites['POST /api/admin/orders/:id/fulfill'] = statusOnly(await hit(`/api/admin/orders/${created.orderId}/fulfill`, {
    method: 'POST',
    token: adminToken,
  }))
  const history = await hit(`/api/admin/orders/${created.orderId}/history`, { token: adminToken })
  result.adminWrites['GET /api/admin/orders/:id/history'] = statusOnly(history)
  result.validations.historyLoaded = history.status === 200

  const pass = await hit('/api/admin/access-passes', {
    method: 'POST',
    token: adminToken,
    body: {
      orderId: created.orderId,
      validFrom: new Date(Date.now() - 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  })
  result.adminWrites['POST /api/admin/access-passes'] = statusOnly(pass)
  created.accessPassId = firstId(pass)
  result.validations.accessPassIssued = Boolean(created.accessPassId) && !pass.body?.data?.qrTokenHash
  if (!created.accessPassId) throw new Error('access_pass_create_failed')
  const qrToken = pass.body?.data?.qrToken
  if (!qrToken) throw new Error('qr_token_missing')
  result.temporaryCreation.push('access_pass')

  result.adminWrites['POST /api/admin/access-passes/validate'] = statusOnly(await hit('/api/admin/access-passes/validate', {
    method: 'POST',
    token: adminToken,
    body: { code: qrToken },
  }))

  const checkin = await hit('/api/admin/checkins', {
    method: 'POST',
    token: adminToken,
    body: {
      accessPassId: created.accessPassId,
      requestId: `${runId}_checkin`,
      deviceInfo: { source: 'QA_FASE7D' },
      notes: runId,
    },
  })
  result.adminWrites['POST /api/admin/checkins'] = statusOnly(checkin)
  created.checkinId = firstId(checkin)
  result.validations.checkinRegistered = Boolean(created.checkinId)
  if (!created.checkinId) throw new Error('checkin_create_failed')
  result.temporaryCreation.push('checkin')

  const duplicateCheckin = await hit('/api/admin/checkins', {
    method: 'POST',
    token: adminToken,
    body: {
      accessPassId: created.accessPassId,
      requestId: `${runId}_duplicate`,
      deviceInfo: { source: 'QA_FASE7D' },
      notes: runId,
    },
  })
  result.adminWrites['POST /api/admin/checkins duplicate'] = statusOnly(duplicateCheckin)
  result.validations.doubleCheckinBlocked = duplicateCheckin.status === 409

  result.adminWrites['POST /api/admin/checkins/:id/reverse'] = statusOnly(await hit(`/api/admin/checkins/${created.checkinId}/reverse`, {
    method: 'POST',
    token: adminToken,
    body: { reason: runId },
  }))
  result.adminWrites['POST /api/admin/access-passes/:id/revoke'] = statusOnly(await hit(`/api/admin/access-passes/${created.accessPassId}/revoke`, {
    method: 'POST',
    token: adminToken,
    body: { reason: runId },
  }))

  const orderExport = await hit('/api/admin/orders/export', { token: adminToken, csv: true })
  const checkinExport = await hit('/api/admin/checkins/export', { token: adminToken, csv: true })
  result.adminReads['GET /api/admin/orders/export after QA'] = statusOnly(orderExport)
  result.adminReads['GET /api/admin/checkins/export after QA'] = statusOnly(checkinExport)
  result.validations.exportSafe =
    orderExport.status === 200 &&
    checkinExport.status === 200 &&
    !orderExport.text.includes(created.orderId) &&
    !checkinExport.text.includes(created.accessPassId) &&
    !checkinExport.text.includes(qrToken)

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    ...Object.values(result.unauthenticated).map((status) => status === 401),
    ...Object.values(result.customerAccess).map((status) => status === 403),
    ...Object.values(result.adminReads).map((status) => status === 200),
    ...Object.values(result.adminWrites).map((status) => [200, 201, 409].includes(status)),
    result.validations.exportSafe,
    result.validations.accessPassIssued,
    result.validations.checkinRegistered,
    result.validations.doubleCheckinBlocked,
    result.validations.paymentRecorded,
    result.validations.refundRegistered,
    result.validations.historyLoaded,
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
