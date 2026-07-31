import { Router } from 'express'
import { healthRouter } from '../modules/health/health.routes'
import { versionRouter } from '../modules/version/version.routes'
import { publicRouter } from '../modules/public/status.routes'

/**
 * Registro central de rutas API.
 * Todos los módulos se montan aquí bajo /api.
 */
const router = Router()

// Infraestructura base
router.use('/health', healthRouter)
router.use('/version', versionRouter)
router.use('/public', publicRouter)

// Próximas rutas — descomenta cuando estén listos los módulos:
// router.use('/auth',          authRouter)
// router.use('/reservaciones', reservacionesRouter)
// router.use('/experiencias',  experienciasRouter)
// router.use('/eventos',       eventosRouter)
// router.use('/clientes',      clientesRouter)
// router.use('/vinos',         vinosRouter)
// router.use('/sommelier',     sommelierRouter)

export { router as apiRouter }
