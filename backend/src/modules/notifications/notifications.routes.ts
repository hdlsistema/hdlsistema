import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { getNotificationsAdmin, readNotificationAdmin } from './notifications.controller'

const router = Router()
const notificationRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

router.use(rateLimit(120, 60_000))
router.get('/notifications', authenticate, authorize(notificationRoles), getNotificationsAdmin)
router.post('/notifications/:id/read', authenticate, authorize(notificationRoles), readNotificationAdmin)

export { router as adminNotificationsRouter }
