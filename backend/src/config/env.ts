/**
 * Validación y exportación de variables de entorno del servidor.
 *
 * SEGURIDAD: nunca imprimir valores de secretos en consola.
 * Solo se registra si una variable está presente o ausente.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[env] Variable requerida no configurada: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

function warnOptionalEnv(key: string, fallback = ''): string {
  const value = process.env[key]
  if (!value) {
    console.warn(
      `[env] Variable opcional no configurada: ${key} — funciones dependientes no estarán disponibles.`,
    )
  }
  return value ?? fallback
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: Number(optionalEnv('PORT', '3001')),

  // CORS
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  ALLOWED_ORIGINS: optionalEnv(
    'ALLOWED_ORIGINS',
    'http://localhost:5173,https://admhaciendadeletras.com,https://www.admhaciendadeletras.com',
  ),

  // Supabase — URL y anon key requeridas para arrancar
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY'),

  // Supabase service role — requerida para operaciones administrativas
  // NUNCA exponer al frontend.
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // OpenAI — reservado para ALQIA; solo integración del lado servidor
  OPENAI_API_KEY: warnOptionalEnv('OPENAI_API_KEY'),
  OPENAI_MODEL: optionalEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: optionalEnv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),

  // Resend — reservado para emails transaccionales; solo lado servidor
  RESEND_API_KEY: warnOptionalEnv('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: optionalEnv('RESEND_FROM_EMAIL', ''),
} as const

export type Env = typeof env
