import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { getAppActivityAdmin, getCustomerCartAdmin, getCustomerCartsAdmin, postCustomerAppActivity } from './activity.controller'

const customerRouter = Router()
const adminRouter = Router()
const activityRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

customerRouter.use(rateLimit(120, 60_000))
customerRouter.post('/activity', optionalAuthenticate, postCustomerAppActivity)

adminRouter.use(rateLimit(240, 60_000))
adminRouter.get('/activity', authenticate, authorize(activityRoles), getAppActivityAdmin)
adminRouter.get('/carts', authenticate, authorize(activityRoles), getCustomerCartsAdmin)
adminRouter.get('/carts/:id', authenticate, authorize(activityRoles), getCustomerCartAdmin)

export { adminRouter as adminActivityRouter, customerRouter as customerActivityRouter }
