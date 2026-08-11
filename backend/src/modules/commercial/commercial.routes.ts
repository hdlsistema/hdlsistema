import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  createCabinReservationCustomer,
  createQuoteRequestCustomer,
  createRestaurantReservationCustomer,
  getQuoteRequestAdmin,
  listPublicCommercial,
  listQuoteRequestsAdmin,
  patchQuoteRequestAdmin,
} from './commercial.controller'

const publicRouter = Router()
const customerRouter = Router()
const adminRouter = Router()

const customerRoles = ['customer', 'super_admin', 'admin']
const quoteReadRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const quoteWriteRoles = ['super_admin', 'admin', 'operations', 'marketing']

publicRouter.use(rateLimit(240, 60_000))
customerRouter.use(rateLimit(120, 60_000))
adminRouter.use(rateLimit(240, 60_000))

publicRouter.get('/commercial/services', listPublicCommercial)

customerRouter.post('/cabin-reservations', authenticate, authorize(customerRoles), createCabinReservationCustomer)
customerRouter.post('/restaurant-reservations', authenticate, authorize(customerRoles), createRestaurantReservationCustomer)
customerRouter.post('/quote-requests', authenticate, authorize(customerRoles), createQuoteRequestCustomer)

adminRouter.get('/quote-requests', authenticate, authorize(quoteReadRoles), listQuoteRequestsAdmin)
adminRouter.get('/quote-requests/:id', authenticate, authorize(quoteReadRoles), getQuoteRequestAdmin)
adminRouter.patch('/quote-requests/:id', authenticate, authorize(quoteWriteRoles), patchQuoteRequestAdmin)

export {
  adminRouter as adminCommercialRouter,
  customerRouter as customerCommercialRouter,
  publicRouter as publicCommercialRouter,
}
