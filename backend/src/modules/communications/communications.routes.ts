import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getCommunicationAdmin,
  getCommunicationsAdmin,
  postCommunicationRetryAdmin,
  postResendWebhook,
} from './communications.controller'

const adminRouter = Router()
const webhookRouter = Router()
const communicationRoles = ['super_admin', 'admin', 'operations', 'finance', 'marketing', 'viewer']
const protectedCommunications = [authenticate, authorize(communicationRoles)]

adminRouter.use(rateLimit(180, 60_000))
adminRouter.get('/communications', ...protectedCommunications, getCommunicationsAdmin)
adminRouter.get('/communications/:id', ...protectedCommunications, getCommunicationAdmin)
adminRouter.post('/communications/:id/retry', ...protectedCommunications, postCommunicationRetryAdmin)

webhookRouter.post('/resend', rateLimit(300, 60_000), postResendWebhook)

export {
  adminRouter as adminCommunicationsRouter,
  webhookRouter as communicationsWebhookRouter,
}
