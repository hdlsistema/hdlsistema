import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const args = process.argv.slice(2)
const fileIndex = args.indexOf('--file')
const inlineIndex = args.indexOf('--sql')
const jsonOutput = args.includes('--json')

const supabaseUrl = process.env.SUPABASE_URL
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl || !accessToken) {
  console.error('[supabase-query] Missing local Supabase management configuration.')
  process.exit(1)
}

let query = ''

if (fileIndex >= 0 && args[fileIndex + 1]) {
  query = readFileSync(resolve(args[fileIndex + 1]), 'utf8')
} else if (inlineIndex >= 0 && args[inlineIndex + 1]) {
  query = args[inlineIndex + 1]
} else {
  console.error('[supabase-query] Provide --file <path> or --sql <query>.')
  process.exit(1)
}

const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ query }),
})

const text = await response.text()
let body

try {
  body = text ? JSON.parse(text) : null
} catch {
  body = text
}

if (!response.ok) {
  console.error(
    JSON.stringify({
      ok: false,
      http_status: response.status,
      error: typeof body === 'string' ? body.slice(0, 500) : body,
    }),
  )
  process.exit(1)
}

if (jsonOutput) {
  console.log(JSON.stringify(body))
} else {
  console.log(JSON.stringify({ ok: true }))
}
