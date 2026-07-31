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
const email = 'cliente.prueba@alqia.tech'

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(JSON.stringify({ ok: false, status: 'missing_configuration' }))
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const client = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const password = `Tmp-${randomBytes(18).toString('base64url')}1a!`

const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
})
if (listError) {
  console.error(JSON.stringify({ ok: false, status: 'list_users_failed' }))
  process.exit(1)
}

let user = listData.users.find((item) => item.email?.toLowerCase() === email)

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Cliente',
      last_name: 'Prueba',
      display_name: 'Cliente Prueba',
    },
  })
  if (error || !data.user) {
    console.error(JSON.stringify({ ok: false, status: 'create_customer_failed' }))
    process.exit(1)
  }
  user = data.user
} else {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    console.error(JSON.stringify({ ok: false, status: 'update_customer_failed' }))
    process.exit(1)
  }
  user = data.user
}

await new Promise((resolveTimer) => setTimeout(resolveTimer, 800))

const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
  email,
  password,
})
if (signInError || !signInData.session) {
  console.error(JSON.stringify({ ok: false, status: 'customer_login_failed' }))
  process.exit(1)
}

const [{ data: profile }, { data: customer }, { data: roles }] = await Promise.all([
  admin.from('profiles').select('id').eq('id', user.id).maybeSingle(),
  admin.from('customers').select('id').eq('user_id', user.id).maybeSingle(),
  admin.from('user_roles').select('roles(code)').eq('user_id', user.id),
])

const roleCodes = (roles ?? [])
  .map((row) => {
    const value = row.roles
    if (Array.isArray(value)) return value[0]?.code
    return value?.code
  })
  .filter(Boolean)

await client.auth.signOut()

console.log(
  JSON.stringify({
    ok: true,
    customerUserExists: true,
    login: true,
    profile: Boolean(profile),
    customer: Boolean(customer),
    roles: roleCodes,
    passwordPrinted: false,
    tokensPrinted: false,
  }),
)
