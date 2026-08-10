import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { getDashboardAdmin } from './dashboard.controller'

const router = Router()
const dashboardRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

router.use(rateLimit(120, 60_000))
router.get('/dashboard', authenticate, authorize(dashboardRoles), getDashboardAdmin)

export { router as adminDashboardRouter }
