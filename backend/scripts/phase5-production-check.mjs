import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = 'https://hdlsistema-production.up.railway.app'
const adminEmail = 'pgaribay@alqia.tech'
const customerEmail = 'cliente.prueba@alqia.tech'
const adminEntities = [
  'wines',
  'experiences',
  'events',
  'promotions',
  'membership-plans',
  'campaigns',
]
const publicEntities = [
  'wines',
  'experiences',
  'events',
  'promotions',
  'membership-plans',
]

function maskEmail(email) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain}`
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

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.log(JSON.stringify({ ok: false, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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
  if (!user) return { email: maskEmail(email), exists: false }

  const roles = await getRoles(user.id)
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
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

  return {
    email: maskEmail(email),
    exists: true,
    roles,
    session: sessionData.session,
  }
}

async function hit(path, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.status
}

try {
  const adminSession = await sessionFor(adminEmail)
  const customerSession = await sessionFor(customerEmail)
  const adminStatuses = {}
  const customerStatuses = {}
  const publicStatuses = {}

  if (adminSession.session) {
    for (const entity of adminEntities) {
      adminStatuses[`/api/admin/${entity}`] = await hit(
        `/api/admin/${entity}`,
        adminSession.session.access_token,
      )
    }
  }

  if (customerSession.session) {
    customerStatuses['/api/admin/wines'] = await hit(
      '/api/admin/wines',
      customerSession.session.access_token,
    )
  }

  for (const entity of publicEntities) {
    publicStatuses[`/api/public/${entity}`] = await hit(`/api/public/${entity}`)
  }

  const noSession = await hit('/api/admin/wines')
  const invalidPreview = await hit('/api/preview/token-invalido-fase5')
  await anon.auth.signOut()

  console.log(
    JSON.stringify({
      ok: true,
      admin: {
        email: adminSession.email,
        exists: adminSession.exists,
        roles: adminSession.roles,
        adminStatuses,
      },
      customer: {
        email: customerSession.email,
        exists: customerSession.exists,
        roles: customerSession.roles,
        customerStatuses,
      },
      publicStatuses,
      noSession,
      invalidPreview,
      secretsPrinted: false,
      tokensPrinted: false,
    }),
  )
} catch (error) {
  console.log(
    JSON.stringify({
      ok: false,
      status: error instanceof Error ? error.message : 'unknown_error',
      secretsPrinted: false,
      tokensPrinted: false,
    }),
  )
  process.exit(1)
}
