import { config } from 'dotenv'
import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl || !accessToken) {
  console.error('[apply-migrations] Missing local Supabase management configuration.')
  process.exit(1)
}

const migrationsDir = resolve(process.cwd(), 'migrations')
const start = process.argv[2] ?? '002'
const end = process.argv[3] ?? '017'
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .filter((file) => file.slice(0, 3) >= start && file.slice(0, 3) <= end)
  .sort()

const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

for (const file of files) {
  const query = readFileSync(resolve(migrationsDir, file), 'utf8')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(
      JSON.stringify({
        ok: false,
        migration: file,
        http_status: response.status,
        error: text.slice(0, 1000),
      }),
    )
    process.exit(1)
  }

  console.log(JSON.stringify({ ok: true, migration: file }))
}
