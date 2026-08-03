import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.PHASE7E_API_BASE_URL ?? 'http://127.0.0.1:3001'
const adminEmail = 'pgaribay@alqia.tech'
const customerEmail = 'cliente.prueba@alqia.tech'
const runId = `QA_FASE7E_${Date.now()}`
const slug = runId.toLowerCase().replace(/_/g, '-')

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
    wineClub: false,
    inventory: false,
    logistics: false,
    distributors: false,
    exportSafe: false,
    stockGuard: false,
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
  planId: null,
  membershipId: null,
  wineId: null,
  locationAId: null,
  locationBId: null,
  inventoryItemId: null,
  transferItemId: null,
  orderId: null,
  shipmentId: null,
  distributorId: null,
  distributorContactId: null,
  distributorOrderId: null,
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
  const hashedToken = data.properties?.hashed_token ?? new URL(actionLink).searchParams.get('token_hash')
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

async function insertRecord(table, payload, key) {
  const { data, error } = await admin.from(table).insert(payload).select('id').single()
  if (error || !data?.id) throw new Error(`${key}_setup_failed`)
  created[key] = data.id
  result.temporaryCreation.push(key)
  result.temporaryDataCreated = true
  result.dataMutated = true
  return data.id
}

async function setupBaseRecords() {
  const phone = `5200${String(Date.now()).slice(-8)}`
  await insertRecord('customers', {
    customer_number: runId,
    first_name: 'QA_FASE7E',
    last_name: 'Temporal',
    display_name: `${runId} Temporal`,
    email: created.customerEmail,
    phone: `+${phone}`,
    phone_normalized: phone,
    status: 'draft',
    source: 'QA_FASE7E',
    segment: 'new',
    preferred_language: 'es',
    notes: runId,
  }, 'customerId')

  await insertRecord('membership_plans', {
    code: runId,
    name: `${runId} Plan`,
    description: 'Plan temporal QA Fase 7E',
    price: 100,
    billing_period: 'monthly',
    benefits: ['Beneficio temporal QA Fase 7E'],
    daily_sommelier_limit: 1,
    active: true,
    status: 'draft',
  }, 'planId')

  await insertRecord('wines', {
    sku: runId,
    slug,
    name: `${runId} Vino`,
    subtitle: 'Vino temporal QA Fase 7E',
    description: 'Vino temporal QA Fase 7E',
    vintage: 2026,
    grape_variety: 'QA',
    origin: 'Aguascalientes, MX',
    price: 100,
    stock_quantity: 0,
    stock_control_enabled: true,
    featured: false,
    status: 'draft',
  }, 'wineId')
}

async function cleanup() {
  result.cleanup.attempted = true
  if (created.distributorOrderId) {
    await admin.from('distributor_order_items').delete().eq('distributor_order_id', created.distributorOrderId)
    await admin.from('distributor_orders').delete().eq('id', created.distributorOrderId)
    await admin.from('audit_logs').delete().eq('entity_id', created.distributorOrderId)
  }
  if (created.distributorContactId) {
    await admin.from('distributor_contacts').delete().eq('id', created.distributorContactId)
  }
  if (created.distributorId) {
    await admin.from('distributors').delete().eq('id', created.distributorId)
    await admin.from('audit_logs').delete().eq('entity_id', created.distributorId)
  }
  if (created.shipmentId) {
    await admin.from('shipment_events').delete().eq('shipment_id', created.shipmentId)
    await admin.from('shipments').delete().eq('id', created.shipmentId)
    await admin.from('audit_logs').delete().eq('entity_id', created.shipmentId)
  }
  if (created.transferItemId) {
    await admin.from('inventory_movements').delete().eq('inventory_item_id', created.transferItemId)
    await admin.from('inventory_items').delete().eq('id', created.transferItemId)
    await admin.from('audit_logs').delete().eq('entity_id', created.transferItemId)
  }
  if (created.inventoryItemId) {
    await admin.from('inventory_movements').delete().eq('inventory_item_id', created.inventoryItemId)
    await admin.from('inventory_items').delete().eq('id', created.inventoryItemId)
    await admin.from('audit_logs').delete().eq('entity_id', created.inventoryItemId)
  }
  if (created.locationAId) await admin.from('inventory_locations').delete().eq('id', created.locationAId)
  if (created.locationBId) await admin.from('inventory_locations').delete().eq('id', created.locationBId)
  if (created.membershipId) {
    await admin.from('membership_benefits').delete().eq('membership_id', created.membershipId)
    await admin.from('loyalty_transactions').delete().eq('membership_id', created.membershipId)
    await admin.from('memberships').delete().eq('id', created.membershipId)
    await admin.from('audit_logs').delete().eq('entity_id', created.membershipId)
  }
  if (created.orderId) {
    await admin.from('order_items').delete().eq('order_id', created.orderId)
    await admin.from('orders').delete().eq('id', created.orderId)
    await admin.from('audit_logs').delete().eq('entity_id', created.orderId)
  }
  if (created.wineId) await admin.from('wines').delete().eq('id', created.wineId)
  if (created.planId) await admin.from('membership_plans').delete().eq('id', created.planId)
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

  if (!adminSession.session || !adminSession.roles.some((role) => ['super_admin', 'admin'].includes(role))) {
    throw new Error('admin_session_missing')
  }
  if (!customerSession.session) throw new Error('customer_session_missing')

  const adminToken = adminSession.session.access_token
  const customerToken = customerSession.session.access_token

  result.health = statusOnly(await hit('/api/health'))

  const protectedPaths = [
    '/api/admin/memberships',
    '/api/admin/inventory',
    '/api/admin/shipments',
    '/api/admin/distributors',
    '/api/admin/distributor-orders',
  ]
  for (const path of protectedPaths) {
    result.unauthenticated[`GET ${path}`] = statusOnly(await hit(path))
    result.customerAccess[`GET ${path}`] = statusOnly(await hit(path, { token: customerToken }))
  }

  const readPaths = [
    '/api/admin/memberships',
    '/api/admin/inventory',
    '/api/admin/inventory/items',
    '/api/admin/inventory/locations',
    '/api/admin/inventory/movements',
    '/api/admin/shipments',
    '/api/admin/shipments/carriers',
    '/api/admin/distributors',
    '/api/admin/distributor-orders',
  ]
  for (const path of readPaths) {
    result.adminReads[`GET ${path}`] = statusOnly(await hit(path, { token: adminToken }))
  }

  await setupBaseRecords()

  const membership = await hit('/api/admin/memberships', {
    method: 'POST',
    token: adminToken,
    body: { customerId: created.customerId, planId: created.planId, idempotencyKey: `${runId}_membership` },
  })
  result.adminWrites['POST /api/admin/memberships'] = statusOnly(membership)
  created.membershipId = firstId(membership)
  if (!created.membershipId) throw new Error('membership_create_failed')
  result.temporaryCreation.push('membershipId')

  const membershipActions = [
    ['activate', {}],
    ['pause', { reason: runId }],
    ['resume', {}],
    ['renew', {}],
  ]
  for (const [action, body] of membershipActions) {
    result.adminWrites[`POST /api/admin/memberships/:id/${action}`] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/${action}`, {
      method: 'POST',
      token: adminToken,
      body,
    }))
  }

  result.adminWrites['POST /api/admin/memberships/:id/loyalty-adjustment'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/loyalty-adjustment`, {
    method: 'POST',
    token: adminToken,
    body: { points: 10, reason: runId, idempotencyKey: `${runId}_points` },
  }))

  const order = await hit('/api/admin/orders', {
    method: 'POST',
    token: adminToken,
    body: {
      customerId: created.customerId,
      source: 'QA_FASE7E',
      idempotencyKey: `${runId}_order`,
      items: [{ itemType: 'manual', nameSnapshot: `${runId} producto`, skuSnapshot: runId, quantity: 1, unitPrice: 100 }],
    },
  })
  result.adminWrites['POST /api/admin/orders'] = statusOnly(order)
  created.orderId = firstId(order)
  if (!created.orderId) throw new Error('order_create_failed')
  result.temporaryCreation.push('orderId')
  await admin.from('orders').update({ status: 'paid' }).eq('id', created.orderId)

  result.adminWrites['POST /api/admin/memberships/:id/order-loyalty'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/order-loyalty`, {
    method: 'POST',
    token: adminToken,
    body: { orderId: created.orderId, points: 5 },
  }))

  result.adminWrites['POST /api/admin/memberships/:id/cancel'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/cancel`, {
    method: 'POST',
    token: adminToken,
    body: { reason: runId },
  }))

  result.adminReads['GET /api/admin/memberships/:id/benefits'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/benefits`, { token: adminToken }))
  result.adminReads['GET /api/admin/memberships/:id/loyalty'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/loyalty`, { token: adminToken }))
  result.adminReads['GET /api/admin/memberships/:id/history'] = statusOnly(await hit(`/api/admin/memberships/${created.membershipId}/history`, { token: adminToken }))

  const locationA = await hit('/api/admin/inventory/locations', {
    method: 'POST',
    token: adminToken,
    body: { name: `${runId} Cava`, code: `${runId}_A`, type: 'warehouse' },
  })
  const locationB = await hit('/api/admin/inventory/locations', {
    method: 'POST',
    token: adminToken,
    body: { name: `${runId} Tienda`, code: `${runId}_B`, type: 'store' },
  })
  result.adminWrites['POST /api/admin/inventory/locations A'] = statusOnly(locationA)
  result.adminWrites['POST /api/admin/inventory/locations B'] = statusOnly(locationB)
  created.locationAId = firstId(locationA)
  created.locationBId = firstId(locationB)
  if (!created.locationAId || !created.locationBId) throw new Error('location_create_failed')
  result.temporaryCreation.push('locationAId', 'locationBId')

  const item = await hit('/api/admin/inventory/items', {
    method: 'POST',
    token: adminToken,
    body: {
      wineId: created.wineId,
      locationId: created.locationAId,
      sku: runId,
      productName: `${runId} Vino`,
      minimumQuantity: 2,
      unitCost: 50,
    },
  })
  result.adminWrites['POST /api/admin/inventory/items'] = statusOnly(item)
  created.inventoryItemId = firstId(item)
  if (!created.inventoryItemId) throw new Error('inventory_item_create_failed')
  result.temporaryCreation.push('inventoryItemId')

  const inventoryActions = [
    ['receive', { inventoryItemId: created.inventoryItemId, quantity: 10, reason: runId, idempotencyKey: `${runId}_receive` }],
    ['reserve', { inventoryItemId: created.inventoryItemId, quantity: 3, idempotencyKey: `${runId}_reserve` }],
    ['release', { inventoryItemId: created.inventoryItemId, quantity: 1, reason: runId, idempotencyKey: `${runId}_release` }],
    ['adjust', { inventoryItemId: created.inventoryItemId, quantityDelta: 1, reason: runId, idempotencyKey: `${runId}_adjust` }],
    ['transfer', { inventoryItemId: created.inventoryItemId, toLocationId: created.locationBId, quantity: 2, reason: runId, idempotencyKey: `${runId}_transfer` }],
    ['fulfill', { inventoryItemId: created.inventoryItemId, quantity: 1, reason: runId, idempotencyKey: `${runId}_fulfill` }],
  ]
  for (const [action, body] of inventoryActions) {
    const response = await hit(`/api/admin/inventory/${action}`, { method: 'POST', token: adminToken, body })
    result.adminWrites[`POST /api/admin/inventory/${action}`] = statusOnly(response)
    if (action === 'transfer') created.transferItemId = firstId(response)
  }
  const stockGuard = await hit('/api/admin/inventory/reserve', {
    method: 'POST',
    token: adminToken,
    body: { inventoryItemId: created.inventoryItemId, quantity: 999999, idempotencyKey: `${runId}_stock_guard` },
  })
  result.adminWrites['POST /api/admin/inventory/reserve overstock'] = statusOnly(stockGuard)
  result.validations.stockGuard = stockGuard.status === 409

  const shipment = await hit('/api/admin/shipments', {
    method: 'POST',
    token: adminToken,
    body: { orderId: created.orderId, carrier: `${runId} Mensajería`, destination: 'Aguascalientes', idempotencyKey: `${runId}_shipment` },
  })
  result.adminWrites['POST /api/admin/shipments'] = statusOnly(shipment)
  created.shipmentId = firstId(shipment)
  if (!created.shipmentId) throw new Error('shipment_create_failed')
  result.temporaryCreation.push('shipmentId')
  for (const status of ['preparing', 'ready', 'shipped', 'in_transit']) {
    result.adminWrites[`POST /api/admin/shipments/:id/status ${status}`] = statusOnly(await hit(`/api/admin/shipments/${created.shipmentId}/status`, {
      method: 'POST',
      token: adminToken,
      body: { status, notes: runId },
    }))
  }
  result.adminWrites['POST /api/admin/shipments/:id/incident'] = statusOnly(await hit(`/api/admin/shipments/${created.shipmentId}/incident`, {
    method: 'POST',
    token: adminToken,
    body: { notes: runId },
  }))
  result.adminWrites['POST /api/admin/shipments/:id/deliver'] = statusOnly(await hit(`/api/admin/shipments/${created.shipmentId}/deliver`, {
    method: 'POST',
    token: adminToken,
    body: { notes: runId },
  }))
  result.adminReads['GET /api/admin/shipments/:id/history'] = statusOnly(await hit(`/api/admin/shipments/${created.shipmentId}/history`, { token: adminToken }))

  const distributor = await hit('/api/admin/distributors', {
    method: 'POST',
    token: adminToken,
    body: { name: `${runId} Distribuidor`, email: created.customerEmail, zone: 'Bajío', operationalStatus: 'active' },
  })
  result.adminWrites['POST /api/admin/distributors'] = statusOnly(distributor)
  created.distributorId = firstId(distributor)
  if (!created.distributorId) throw new Error('distributor_create_failed')
  result.temporaryCreation.push('distributorId')
  const contact = await hit(`/api/admin/distributors/${created.distributorId}/contacts`, {
    method: 'POST',
    token: adminToken,
    body: { name: `${runId} Contacto`, email: created.customerEmail, isPrimary: true },
  })
  result.adminWrites['POST /api/admin/distributors/:id/contacts'] = statusOnly(contact)
  created.distributorContactId = firstId(contact)
  result.temporaryCreation.push('distributorContactId')

  const distributorOrder = await hit('/api/admin/distributor-orders', {
    method: 'POST',
    token: adminToken,
    body: {
      distributorId: created.distributorId,
      idempotencyKey: `${runId}_distributor_order`,
      items: [{ wineId: created.wineId, skuSnapshot: runId, nameSnapshot: `${runId} Vino`, quantity: 4, unitPrice: 100 }],
    },
  })
  result.adminWrites['POST /api/admin/distributor-orders'] = statusOnly(distributorOrder)
  created.distributorOrderId = firstId(distributorOrder)
  if (!created.distributorOrderId) throw new Error('distributor_order_create_failed')
  result.temporaryCreation.push('distributorOrderId')
  for (const action of ['approve', 'prepare', 'ship', 'deliver']) {
    result.adminWrites[`POST /api/admin/distributor-orders/:id/${action}`] = statusOnly(await hit(`/api/admin/distributor-orders/${created.distributorOrderId}/${action}`, {
      method: 'POST',
      token: adminToken,
      body: {},
    }))
  }
  result.adminReads['GET /api/admin/distributors/:id/contacts'] = statusOnly(await hit(`/api/admin/distributors/${created.distributorId}/contacts`, { token: adminToken }))
  result.adminReads['GET /api/admin/distributor-orders/:id/items'] = statusOnly(await hit(`/api/admin/distributor-orders/${created.distributorOrderId}/items`, { token: adminToken }))

  const exports = await Promise.all([
    hit('/api/admin/memberships/export', { token: adminToken, csv: true }),
    hit('/api/admin/inventory/export', { token: adminToken, csv: true }),
    hit('/api/admin/shipments/export', { token: adminToken, csv: true }),
    hit('/api/admin/distributors/export', { token: adminToken, csv: true }),
    hit('/api/admin/distributor-orders/export', { token: adminToken, csv: true }),
  ])
  exports.forEach((entry, index) => {
    result.adminReads[`GET export ${index + 1}`] = statusOnly(entry)
  })
  const exportedText = exports.map((entry) => entry.text).join('\n')
  result.validations.exportSafe =
    exports.every((entry) => entry.status === 200) &&
    !exportedText.includes(created.membershipId) &&
    !exportedText.includes(created.inventoryItemId) &&
    !exportedText.includes(created.shipmentId) &&
    !exportedText.includes(created.distributorId) &&
    !exportedText.includes(created.distributorOrderId)

  result.validations.wineClub = [
    result.adminWrites['POST /api/admin/memberships'],
    result.adminWrites['POST /api/admin/memberships/:id/activate'],
    result.adminWrites['POST /api/admin/memberships/:id/pause'],
    result.adminWrites['POST /api/admin/memberships/:id/resume'],
    result.adminWrites['POST /api/admin/memberships/:id/renew'],
    result.adminWrites['POST /api/admin/memberships/:id/loyalty-adjustment'],
    result.adminWrites['POST /api/admin/memberships/:id/order-loyalty'],
    result.adminWrites['POST /api/admin/memberships/:id/cancel'],
  ].every((status) => [200, 201].includes(status))
  result.validations.inventory = inventoryActions.every(([action]) => [200, 201].includes(result.adminWrites[`POST /api/admin/inventory/${action}`]))
  result.validations.logistics = [
    result.adminWrites['POST /api/admin/shipments'],
    result.adminWrites['POST /api/admin/shipments/:id/status preparing'],
    result.adminWrites['POST /api/admin/shipments/:id/status ready'],
    result.adminWrites['POST /api/admin/shipments/:id/status shipped'],
    result.adminWrites['POST /api/admin/shipments/:id/status in_transit'],
    result.adminWrites['POST /api/admin/shipments/:id/incident'],
    result.adminWrites['POST /api/admin/shipments/:id/deliver'],
  ].every((status) => [200, 201].includes(status))
  result.validations.distributors = [
    result.adminWrites['POST /api/admin/distributors'],
    result.adminWrites['POST /api/admin/distributor-orders'],
    result.adminWrites['POST /api/admin/distributor-orders/:id/approve'],
    result.adminWrites['POST /api/admin/distributor-orders/:id/prepare'],
    result.adminWrites['POST /api/admin/distributor-orders/:id/ship'],
    result.adminWrites['POST /api/admin/distributor-orders/:id/deliver'],
  ].every((status) => [200, 201].includes(status))

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    ...Object.values(result.unauthenticated).map((status) => status === 401),
    ...Object.values(result.customerAccess).map((status) => status === 403),
    ...Object.values(result.adminReads).map((status) => status === 200),
    ...Object.values(result.adminWrites).map((status) => [200, 201, 409].includes(status)),
    result.validations.wineClub,
    result.validations.inventory,
    result.validations.logistics,
    result.validations.distributors,
    result.validations.exportSafe,
    result.validations.stockGuard,
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
