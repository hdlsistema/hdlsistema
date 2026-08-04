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
const baseUrl = process.env.PHASE8C_API_BASE_URL ?? 'http://127.0.0.1:3001'
const runId = `QA_FASE8C_${Date.now()}`

const result = {
  ok: false,
  base: baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost') ? 'local' : 'production',
  customers: [],
  health: null,
  unauthenticated: {},
  customerAccess: {},
  cart: {},
  orders: {},
  validations: {
    realPublishedWine: false,
    cartPersists: false,
    backendTotals: false,
    quantityUpdated: false,
    priceManipulationRejected: false,
    orderCreated: false,
    orderPendingPayment: false,
    orderVisibleInList: false,
    orderDetailOwnOnly: false,
    noPaymentCreated: false,
    auditLog: false,
    customerCannotAdmin: false,
    unauthenticatedBlocked: false,
    cleanupClean: false,
  },
  cleanup: { attempted: false, completed: false },
  temporaryDataCreated: false,
  temporaryDataCleaned: false,
  secretsPrinted: false,
  tokensPrinted: false,
  paymentCollected: false,
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
  users: [],
  customers: [],
  carts: [],
  orderId: null,
  orderItemIds: [],
  wineId: null,
}

function maskEmail(email) {
  const [name, domain = ''] = email.split('@')
  const [domainName = '', ...rest] = domain.split('.')
  return `${name.slice(0, 2)}***@${domainName.slice(0, 1)}***.${rest.join('.') || '***'}`
}

async function sleep(ms) {
  await new Promise((resolveTimer) => setTimeout(resolveTimer, ms))
}

async function getRoles(userId) {
  const { data, error } = await admin
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', userId)
  if (error) throw new Error('roles_failed')
  return (data ?? [])
    .map((row) => {
      const value = row.roles
      if (Array.isArray(value)) return value[0]?.code
      return value?.code
    })
    .filter(Boolean)
}

async function createCustomerSession(label) {
  const email = `${runId.toLowerCase()}_${label}@example.invalid`
  const password = `Tmp-${randomBytes(18).toString('base64url')}1a!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'QA_FASE8C',
      last_name: label,
      display_name: `${runId} ${label}`,
      source: 'QA_FASE8C',
    },
  })
  if (error || !data.user) throw new Error(`${label}_user_create_failed`)
  created.users.push(data.user.id)
  result.temporaryDataCreated = true

  await sleep(900)

  const roles = await getRoles(data.user.id)
  if (!roles.includes('customer')) throw new Error(`${label}_role_missing`)

  const { data: customer, error: customerError } = await admin
    .from('customers')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (customerError || !customer?.id) throw new Error(`${label}_customer_profile_missing`)
  created.customers.push(customer.id)

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !signInData.session) throw new Error(`${label}_login_failed`)

  result.customers.push({ label, email: maskEmail(email), roles })
  return {
    label,
    userId: data.user.id,
    customerId: customer.id,
    token: signInData.session.access_token,
  }
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

async function pickPublishedWine() {
  const { data, error } = await admin
    .from('wines')
    .select('id,name,price,stock_control_enabled,stock_quantity')
    .eq('status', 'published')
    .eq('visible_in_app', true)
    .is('deleted_at', null)
    .gte('price', 0)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error('wine_lookup_failed')

  const wine = (data ?? []).find((item) => !item.stock_control_enabled || Number(item.stock_quantity ?? 0) >= 2)
  if (!wine?.id) throw new Error('published_wine_missing')
  return wine
}

async function cleanup() {
  result.cleanup.attempted = true

  if (created.orderId) {
    await admin.from('promotion_redemptions').delete().eq('order_id', created.orderId)
    await admin.from('audit_logs').delete().eq('entity_id', created.orderId)
    await admin.from('order_items').delete().eq('order_id', created.orderId)
    await admin.from('orders').delete().eq('id', created.orderId)
  }

  for (const cartId of created.carts) {
    await admin.from('audit_logs').delete().eq('entity_id', cartId)
    await admin.from('cart_items').delete().eq('cart_id', cartId)
    await admin.from('carts').delete().eq('id', cartId)
  }

  for (const customerId of created.customers) {
    await admin.from('audit_logs').delete().eq('entity_id', customerId)
    await admin.from('customers').delete().eq('id', customerId)
  }

  for (const userId of created.users) {
    await admin.from('user_preferences').delete().eq('user_id', userId)
    await admin.from('user_roles').delete().eq('user_id', userId)
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  const [{ data: carts }, { data: orders }, { data: customers }] = await Promise.all([
    admin.from('carts').select('id').in('id', created.carts.length ? created.carts : ['00000000-0000-0000-0000-000000000000']),
    created.orderId
      ? admin.from('orders').select('id').eq('id', created.orderId)
      : Promise.resolve({ data: [] }),
    admin.from('customers').select('id').in('id', created.customers.length ? created.customers : ['00000000-0000-0000-0000-000000000000']),
  ])

  result.validations.cleanupClean =
    (carts ?? []).length === 0 &&
    (orders ?? []).length === 0 &&
    (customers ?? []).length === 0
  result.cleanup.completed = result.validations.cleanupClean
  result.temporaryDataCleaned = result.cleanup.completed
}

try {
  const health = await hit('/api/health')
  result.health = statusOnly(health)

  const [customer, otherCustomer] = await Promise.all([
    createCustomerSession('buyer'),
    createCustomerSession('other'),
  ])

  const wine = await pickPublishedWine()
  created.wineId = wine.id
  result.validations.realPublishedWine = Boolean(wine.id)

  result.unauthenticated['GET /api/customer/cart'] = statusOnly(await hit('/api/customer/cart'))
  result.unauthenticated['GET /api/customer/orders'] = statusOnly(await hit('/api/customer/orders'))
  result.customerAccess['GET /api/admin/orders'] = statusOnly(await hit('/api/admin/orders', { token: customer.token }))

  const initialCart = await hit('/api/customer/cart', { token: customer.token })
  result.cart['GET /api/customer/cart initial'] = statusOnly(initialCart)
  if (initialCart.body?.data?.id) created.carts.push(initialCart.body.data.id)

  const addItem = await hit('/api/customer/cart/items', {
    method: 'POST',
    token: customer.token,
    body: {
      itemType: 'wine',
      itemId: wine.id,
      quantity: 1,
      idempotencyKey: `${runId}_add`,
    },
  })
  result.cart['POST /api/customer/cart/items'] = statusOnly(addItem)
  const itemId = addItem.body?.data?.items?.[0]?.id
  if (addItem.body?.data?.id && !created.carts.includes(addItem.body.data.id)) created.carts.push(addItem.body.data.id)
  if (!itemId) throw new Error('cart_item_missing')

  const persistedCart = await hit('/api/customer/cart', { token: customer.token })
  result.cart['GET /api/customer/cart persisted'] = statusOnly(persistedCart)

  const manipulated = await hit('/api/customer/cart/items', {
    method: 'POST',
    token: customer.token,
    body: {
      itemType: 'wine',
      itemId: wine.id,
      quantity: 1,
      unitPrice: 1,
      customerId: customer.customerId,
    },
  })
  result.cart['POST /api/customer/cart/items manipulated'] = statusOnly(manipulated)

  const updateItem = await hit(`/api/customer/cart/items/${itemId}`, {
    method: 'PATCH',
    token: customer.token,
    body: {
      quantity: 2,
      idempotencyKey: `${runId}_update`,
    },
  })
  result.cart['PATCH /api/customer/cart/items/:id'] = statusOnly(updateItem)

  const createOrder = await hit('/api/customer/orders', {
    method: 'POST',
    token: customer.token,
    body: {
      idempotencyKey: `${runId}_order`,
    },
  })
  result.orders['POST /api/customer/orders'] = statusOnly(createOrder)
  created.orderId = createOrder.body?.data?.id ?? null
  if (!created.orderId) throw new Error('order_create_failed')

  const ownOrder = await hit(`/api/customer/orders/${created.orderId}`, { token: customer.token })
  result.orders['GET /api/customer/orders/:id own'] = statusOnly(ownOrder)
  const otherOrder = await hit(`/api/customer/orders/${created.orderId}`, { token: otherCustomer.token })
  result.orders['GET /api/customer/orders/:id other customer'] = statusOnly(otherOrder)
  const orderList = await hit('/api/customer/orders', { token: customer.token })
  result.orders['GET /api/customer/orders'] = statusOnly(orderList)

  const convertedCart = await hit('/api/customer/cart', { token: customer.token })
  result.cart['GET /api/customer/cart after order'] = statusOnly(convertedCart)
  if (convertedCart.body?.data?.id && !created.carts.includes(convertedCart.body.data.id)) created.carts.push(convertedCart.body.data.id)

  const { data: payments } = await admin
    .from('payments')
    .select('id')
    .eq('order_id', created.orderId)
  const { data: auditRows } = await admin
    .from('audit_logs')
    .select('id,action')
    .eq('entity_id', created.orderId)

  result.validations.cartPersists =
    statusOnly(initialCart) === 200 &&
    statusOnly(addItem) === 201 &&
    statusOnly(persistedCart) === 200 &&
    (persistedCart.body?.data?.items ?? []).some((item) => item.id === itemId)
  result.validations.backendTotals =
    Number(addItem.body?.data?.totals?.total ?? 0) > 0 &&
    addItem.body?.data?.totals?.currency === 'MXN' &&
    addItem.body?.data?.checkout?.paymentAvailable === false
  result.validations.quantityUpdated =
    statusOnly(updateItem) === 200 &&
    (updateItem.body?.data?.items ?? []).some((item) => item.id === itemId && item.quantity === 2)
  result.validations.priceManipulationRejected = statusOnly(manipulated) === 422
  result.validations.orderCreated = statusOnly(createOrder) === 201 && Boolean(createOrder.body?.data?.orderNumber)
  result.validations.orderPendingPayment =
    createOrder.body?.data?.status === 'pending_payment' &&
    createOrder.body?.data?.paymentStatus === 'pending_payment' &&
    createOrder.body?.data?.paymentAvailable === false
  result.validations.orderVisibleInList =
    statusOnly(orderList) === 200 &&
    (orderList.body?.data ?? []).some((order) => order.id === created.orderId)
  result.validations.orderDetailOwnOnly = statusOnly(ownOrder) === 200 && statusOnly(otherOrder) === 404
  result.validations.noPaymentCreated = (payments ?? []).length === 0
  result.validations.auditLog = (auditRows ?? []).some((row) => row.action === 'customer_order_created')
  result.validations.customerCannotAdmin = result.customerAccess['GET /api/admin/orders'] === 403
  result.validations.unauthenticatedBlocked =
    result.unauthenticated['GET /api/customer/cart'] === 401 &&
    result.unauthenticated['GET /api/customer/orders'] === 401

  await cleanup()
  await anon.auth.signOut()

  const expected = [
    result.health === 200,
    ...Object.values(result.cart).map((status) => [200, 201, 422].includes(status)),
    ...Object.values(result.orders).map((status) => [200, 201, 404].includes(status)),
    ...Object.values(result.unauthenticated).map((status) => status === 401),
    ...Object.values(result.customerAccess).map((status) => status === 403),
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
