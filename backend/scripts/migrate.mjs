/**
 * Script de migración para Supabase — Phase 1
 * Aplica: migrations/001_system_health.sql
 *
 * Uso: node scripts/migrate.js
 * Requiere: backend/.env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[migrate] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
const sqlFile = resolve(__dirname, '../migrations/001_system_health.sql')
const sql = readFileSync(sqlFile, 'utf-8')

console.log(`[migrate] Proyecto: ${projectRef}`)
console.log('[migrate] Ejecutando: 001_system_health.sql')
console.log('[migrate] Intentando Management API (requiere SUPABASE_ACCESS_TOKEN)...')

const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!accessToken) {
  console.error('')
  console.error('[migrate] BLOQUEADO: La Management API de Supabase requiere un token')
  console.error('          personal distinto del service_role_key.')
  console.error('')
  console.error('          Para obtenerlo:')
  console.error('          → Supabase Dashboard → Account → Access Tokens → Generate new token')
  console.error('')
  console.error('          Luego ejecuta:')
  console.error('          SUPABASE_ACCESS_TOKEN=tu_token node scripts/migrate.mjs')
  console.error('')
  console.error('          ALTERNATIVA: pega el contenido de migrations/001_system_health.sql')
  console.error('          directamente en Supabase → SQL Editor → Run')
  process.exit(1)
}

const response = await fetch(managementUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ query: sql }),
})

if (!response.ok) {
  const body = await response.text()
  console.error(`[migrate] Error HTTP ${response.status}:`, body)
  process.exit(1)
}

const result = await response.json()
console.log('[migrate] Migración aplicada correctamente:', result)
