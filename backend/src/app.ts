import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { apiRouter } from './routes/index'
import { requestId } from './middleware/requestId'
import { errorHandler, type AppError } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const nativeMobileOrigins = new Set([
  'capacitor://localhost',
  'https://localhost',
])

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.includes(origin)) return true
  if (nativeMobileOrigins.has(origin)) return true
  if (env.NODE_ENV !== 'production' && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true
  return false
}

export function createApp() {
  const app = express()

  // Confiar en proxy de Railway
  app.set('trust proxy', 1)

  // Request ID — primer middleware para que esté disponible en todo el pipeline
  app.use(requestId)

  // Cabeceras de seguridad HTTP
  app.use(helmet())

  // CORS — solo orígenes explícitamente autorizados
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (isAllowedOrigin(origin)) return callback(null, true)
        // No registrar el valor del origen para evitar log injection
        console.warn('[cors] Rechazo de origen no autorizado')
        const err = Object.assign(new Error('Origen no autorizado'), {
          statusCode: 403,
          isOperational: true,
        }) as AppError
        callback(err)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      credentials: true,
    }),
  )

  app.use('/api/webhooks/resend', express.raw({ type: 'application/json', limit: '1mb' }))
  app.use('/api/webhooks/payments/stripe', express.raw({ type: 'application/json', limit: '1mb' }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Rutas API
  app.use('/api', apiRouter)

  // 404 y manejo de errores — deben ir al final
  app.use(notFound)
  app.use(errorHandler)

  return app
}
