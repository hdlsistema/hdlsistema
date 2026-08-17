import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { executiveAssistantMessageController, executiveAssistantRealtimeController, executiveAssistantStatusController } from './executiveAssistant.controller'

const router = Router()
const executiveAccess = [rateLimit(24, 60_000), authenticate, authorize(['super_admin', 'admin'])]
router.get('/executive-assistant/status', ...executiveAccess, executiveAssistantStatusController)
router.post('/executive-assistant/message', ...executiveAccess, executiveAssistantMessageController)
router.post('/executive-assistant/realtime-session', ...executiveAccess, executiveAssistantRealtimeController)

export { router as adminExecutiveAssistantRouter }
