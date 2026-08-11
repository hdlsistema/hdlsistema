import { Router } from 'express'
import { healthRouter } from '../modules/health/health.routes'
import { versionRouter } from '../modules/version/version.routes'
import { publicRouter } from '../modules/public/status.routes'
import { authRouter } from '../modules/auth/auth.routes'
import { adminUsersRouter } from '../modules/admin/users.routes'
import { adminAvailabilityRouter } from '../modules/availability/availability.routes'
import { adminCheckinRouter } from '../modules/checkin/checkin.routes'
import { adminCommunicationsRouter, communicationsWebhookRouter } from '../modules/communications/communications.routes'
import { adminCustomersRouter } from '../modules/customers/customers.routes'
import { customerRouter } from '../modules/customer/customer.routes'
import { adminDistributorsRouter } from '../modules/distributors/distributors.routes'
import { adminDashboardRouter } from '../modules/dashboard/dashboard.routes'
import { adminActivityRouter, customerActivityRouter } from '../modules/activity/activity.routes'
import { adminInventoryRouter } from '../modules/inventory/inventory.routes'
import { adminMembershipsRouter } from '../modules/memberships/memberships.routes'
import { adminNotificationsRouter } from '../modules/notifications/notifications.routes'
import { adminOrdersRouter } from '../modules/orders/orders.routes'
import { adminPaymentsRouter, paymentWebhooksRouter } from '../modules/payments/payments.routes'
import { adminReservationsRouter } from '../modules/reservations/reservations.routes'
import { adminSettingsRouter } from '../modules/settings/settings.routes'
import { adminShipmentsRouter } from '../modules/shipments/shipments.routes'
import { customerSommelierRouter } from '../modules/sommelier/sommelier.routes'
import { publicMapRouter } from '../modules/map/map.routes'
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
router.use('/customer', customerRouter)
router.use('/customer', customerActivityRouter)
router.use('/customer', customerSommelierRouter)
router.use('/admin', adminUsersRouter)
router.use('/admin', adminDashboardRouter)
router.use('/admin', adminActivityRouter)
router.use('/admin', adminAvailabilityRouter)
router.use('/admin', adminReservationsRouter)
router.use('/admin', adminCustomersRouter)
router.use('/admin', adminOrdersRouter)
router.use('/admin', adminPaymentsRouter)
router.use('/admin', adminCheckinRouter)
router.use('/admin', adminCommunicationsRouter)
router.use('/admin', adminNotificationsRouter)
router.use('/admin', adminMembershipsRouter)
router.use('/admin', adminSettingsRouter)
router.use('/admin', adminInventoryRouter)
router.use('/admin', adminShipmentsRouter)
router.use('/admin', adminDistributorsRouter)
router.use('/webhooks', paymentWebhooksRouter)
router.use('/webhooks', communicationsWebhookRouter)
router.use('/public', publicMapRouter)
router.use('/admin', adminContentRouter)
router.use('/public', publicContentRouter)
router.use('/preview', previewContentRouter)

export { router as apiRouter }
