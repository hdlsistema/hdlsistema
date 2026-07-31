/**
 * Punto de entrada del servidor.
 * Valida env → crea app → inicia escucha en 0.0.0.0 para Railway.
 */

// dotenv debe cargar antes que cualquier otro import para que env.ts
// encuentre las variables. En Railway las vars ya están en process.env
// y dotenv las ignora silenciosamente.
import 'dotenv/config'
import { env } from './config/env'
import { createApp } from './app'

async function main() {
  console.log(`[server] Iniciando en modo ${env.NODE_ENV}...`)

  const app = createApp()

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[server] Escuchando en puerto ${env.PORT}`)
    console.log(`[server] Entorno: ${env.NODE_ENV}`)
    console.log(`[server] Health: http://localhost:${env.PORT}/api/health`)
  })

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} recibido — cerrando servidor...`)
    server.close(() => {
      console.log('[server] Servidor cerrado correctamente')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err: unknown) => {
  // Solo imprime el mensaje, nunca el stack completo en producción
  const message = err instanceof Error ? err.message : String(err)
  console.error('[server] Error al iniciar:', message)
  process.exit(1)
})
