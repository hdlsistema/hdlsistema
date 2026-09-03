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
  PUBLIC_ACCESS_BASE_URL: optionalEnv(
    'PUBLIC_ACCESS_BASE_URL',
    'https://admhaciendadeletras.com/acceso',
  ),
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
  AI_PROVIDER: optionalEnv('AI_PROVIDER', 'openai'),
  OPENAI_API_KEY: warnOptionalEnv('OPENAI_API_KEY'),
  OPENAI_MODEL: optionalEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: optionalEnv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),

  // Resend — reservado para emails transaccionales; solo lado servidor
  RESEND_API_KEY: warnOptionalEnv('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: optionalEnv('RESEND_FROM_EMAIL', ''),
  RESEND_REPLY_TO_EMAIL: optionalEnv('RESEND_REPLY_TO_EMAIL', ''),
  RESEND_WEBHOOK_SECRET: optionalEnv('RESEND_WEBHOOK_SECRET', ''),

  // Eliminación de cuenta — token firmado, plazo visible y URL pública de confirmación.
  // Si ACCOUNT_DELETION_TOKEN_SECRET no está configurado, se usa service_role como
  // secreto server-side de respaldo para entornos existentes.
  ACCOUNT_DELETION_PROCESSING_DAYS: optionalEnv('ACCOUNT_DELETION_PROCESSING_DAYS', '30'),
  ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS: optionalEnv('ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS', '24'),
  ACCOUNT_DELETION_TOKEN_SECRET: optionalEnv('ACCOUNT_DELETION_TOKEN_SECRET', ''),
  ACCOUNT_DELETION_CONFIRM_BASE_URL: optionalEnv('ACCOUNT_DELETION_CONFIRM_BASE_URL', ''),

  // Sign in with Apple — sólo backend. Necesario para intercambiar authorizationCode
  // y revocar refresh/access tokens durante la eliminación de cuenta.
  APPLE_SIGN_IN_CLIENT_ID: optionalEnv('APPLE_SIGN_IN_CLIENT_ID', ''),
  APPLE_SIGN_IN_TEAM_ID: optionalEnv('APPLE_SIGN_IN_TEAM_ID', ''),
  APPLE_SIGN_IN_KEY_ID: optionalEnv('APPLE_SIGN_IN_KEY_ID', ''),
  APPLE_SIGN_IN_PRIVATE_KEY: optionalEnv('APPLE_SIGN_IN_PRIVATE_KEY', ''),
  APPLE_SIGN_IN_REDIRECT_URI: optionalEnv('APPLE_SIGN_IN_REDIRECT_URI', ''),
  APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY: optionalEnv('APPLE_SIGN_IN_TOKEN_ENCRYPTION_KEY', ''),

  // Firebase Cloud Messaging — entrega push nativa mediante HTTP v1.
  // Las credenciales permanecen exclusivamente en Railway/backend.
  FIREBASE_PROJECT_ID: optionalEnv('FIREBASE_PROJECT_ID', ''),
  FIREBASE_CLIENT_EMAIL: optionalEnv('FIREBASE_CLIENT_EMAIL', ''),
  FIREBASE_PRIVATE_KEY: optionalEnv('FIREBASE_PRIVATE_KEY', ''),

  // Apple Push Notification service — entrega directa usando el token APNs
  // emitido por Capacitor en iOS. La llave privada vive sólo en Railway.
  APNS_TEAM_ID: optionalEnv('APNS_TEAM_ID', ''),
  APNS_KEY_ID: optionalEnv('APNS_KEY_ID', ''),
  APNS_PRIVATE_KEY: optionalEnv('APNS_PRIVATE_KEY', ''),
  APNS_BUNDLE_ID: optionalEnv('APNS_BUNDLE_ID', 'com.haciendadeletras.app'),
  APNS_ENVIRONMENT: optionalEnv('APNS_ENVIRONMENT', 'production'),

  // Stripe — pagos customer con PaymentIntent; solo lado servidor
  STRIPE_SECRET_KEY: optionalEnv('STRIPE_SECRET_KEY', ''),
  STRIPE_WEBHOOK_SECRET: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
  STRIPE_ACCOUNT_ID: optionalEnv('STRIPE_ACCOUNT_ID', ''),
  STRIPE_ENVIRONMENT: optionalEnv('STRIPE_ENVIRONMENT', 'test'),
} as const

export type Env = typeof env
