import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const email = (process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase()
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email) {
  console.error('[assign-super-admin] Provide an email argument or SUPER_ADMIN_EMAIL.')
  process.exit(1)
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[assign-super-admin] Missing backend Supabase configuration.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (error) {
  console.error('[assign-super-admin] Could not list users.')
  process.exit(1)
}

const user = data.users.find((item) => item.email?.toLowerCase() === email)
if (!user) {
  console.error('[assign-super-admin] User not found. Create the auth user first.')
  process.exit(1)
}

const { data: role } = await supabase
  .from('roles')
  .select('id')
  .eq('code', 'super_admin')
  .maybeSingle()

if (!role?.id) {
  console.error('[assign-super-admin] super_admin role not found.')
  process.exit(1)
}

const { error: upsertError } = await supabase
  .from('user_roles')
  .upsert({ user_id: user.id, role_id: role.id }, { onConflict: 'user_id,role_id' })

if (upsertError) {
  console.error('[assign-super-admin] Could not assign role.')
  process.exit(1)
}

await supabase.from('audit_logs').insert({
  action: 'super_admin_assigned',
  entity_type: 'auth.users',
  entity_id: user.id,
  after_data: { role: 'super_admin' },
})

console.log(JSON.stringify({ ok: true, assigned: true }))
