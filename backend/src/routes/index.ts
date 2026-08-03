import { Router } from 'express'
import { healthRouter } from '../modules/health/health.routes'
import { versionRouter } from '../modules/version/version.routes'
import { publicRouter } from '../modules/public/status.routes'
import { authRouter } from '../modules/auth/auth.routes'
import { adminUsersRouter } from '../modules/admin/users.routes'
import { adminAvailabilityRouter } from '../modules/availability/availability.routes'
import { adminCustomersRouter } from '../modules/customers/customers.routes'
import { adminReservationsRouter } from '../modules/reservations/reservations.routes'
import {
  adminContentRouter,
  previewContentRouter,
  publicContentRouter,
} from '../modules/content/content.routes'

/**
 * Registro central de rutas API.
 * Todos los módulos se montan aquí bajo /api.
 */
const router = Router()

// Infraestructura base
router.use('/health', healthRouter)
router.use('/version', versionRouter)
router.use('/public', publicRouter)
router.use('/auth', authRouter)
router.use('/admin', adminUsersRouter)
router.use('/admin', adminAvailabilityRouter)
router.use('/admin', adminReservationsRouter)
router.use('/admin', adminCustomersRouter)
router.use('/admin', adminContentRouter)
router.use('/public', publicContentRouter)
router.use('/preview', previewContentRouter)

// Próximas rutas — descomenta cuando estén listos los módulos:
// router.use('/reservaciones', reservacionesRouter)
// router.use('/experiencias',  experienciasRouter)
// router.use('/eventos',       eventosRouter)
// router.use('/clientes',      clientesRouter)
// router.use('/vinos',         vinosRouter)
// router.use('/sommelier',     sommelierRouter)

export { router as apiRouter }
