import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { spawnSync } from 'child_process'

config({ path: resolve(process.cwd(), '../.env.local') })
config({ path: resolve(process.cwd(), '../.env') })
config({ path: resolve(process.cwd(), '.env') })

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!projectRef || !accessToken) {
  console.error('[generate-database-types] Missing local Supabase type generation configuration.')
  process.exit(1)
}

const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public,storage'],
  {
    cwd: process.cwd(),
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    encoding: 'utf8',
  },
)

if (result.status !== 0) {
  console.error('[generate-database-types] Type generation failed.')
  if (result.stderr) console.error(result.stderr.slice(0, 1000))
  process.exit(result.status ?? 1)
}

const outputPath = resolve(process.cwd(), '../src/types/database.types.ts')
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, result.stdout)
console.log(JSON.stringify({ ok: true, output: 'src/types/database.types.ts' }))
