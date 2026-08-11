import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { sendSommelierMessageController } from './sommelier.controller'

const router = Router()
const customerRoles = ['customer', 'super_admin', 'admin']

router.use(rateLimit(30, 60_000))
router.post('/sommelier/message', authenticate, authorize(customerRoles), sendSommelierMessageController)

export { router as customerSommelierRouter }
