import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import { getAdminSettings, patchAdminSettings } from './settings.controller'

const router = Router()
const settingsRoles = ['super_admin', 'admin', 'operations', 'marketing']

router.use(rateLimit(120, 60_000))
router.get('/settings', authenticate, authorize(settingsRoles), requireControlPermission('settings.manage'), getAdminSettings)
router.patch('/settings', authenticate, authorize(settingsRoles), requireControlPermission('settings.manage'), patchAdminSettings)

export { router as adminSettingsRouter }
