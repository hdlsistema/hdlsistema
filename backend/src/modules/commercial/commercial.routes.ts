import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import {
  createCabinReservationCustomer,
  createQuoteRequestAdminController,
  createQuoteRequestCustomer,
  createRestaurantReservationCustomer,
  getQuoteRequestAdmin,
  listPublicCommercial,
  listCommercialCatalogAdmin,
  listQuoteRequestsAdmin,
  patchQuoteRequestAdmin,
  sendQuoteRequestEmailAdmin,
  saveCommercialCatalogAdmin,
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

adminRouter.get('/quote-requests', authenticate, authorize(quoteReadRoles), requireControlPermission('quotes.view'), listQuoteRequestsAdmin)
adminRouter.get('/commercial/catalog', authenticate, authorize(quoteReadRoles), requireControlPermission('content.services.manage'), listCommercialCatalogAdmin)
adminRouter.post('/commercial/:entity(cabins|restaurants|venues)', authenticate, authorize(quoteWriteRoles), requireControlPermission('content.services.manage'), saveCommercialCatalogAdmin)
adminRouter.patch('/commercial/:entity(cabins|restaurants|venues)/:id', authenticate, authorize(quoteWriteRoles), requireControlPermission('content.services.manage'), saveCommercialCatalogAdmin)
adminRouter.post('/quote-requests', authenticate, authorize(quoteWriteRoles), requireControlPermission('quotes.manage'), createQuoteRequestAdminController)
adminRouter.get('/quote-requests/:id', authenticate, authorize(quoteReadRoles), requireControlPermission('quotes.view'), getQuoteRequestAdmin)
adminRouter.patch('/quote-requests/:id', authenticate, authorize(quoteWriteRoles), requireControlPermission('quotes.manage'), patchQuoteRequestAdmin)
adminRouter.post('/quote-requests/:id/send-quote', authenticate, authorize(quoteWriteRoles), requireControlPermission('quotes.manage'), sendQuoteRequestEmailAdmin)

export {
  adminRouter as adminCommercialRouter,
  customerRouter as customerCommercialRouter,
  publicRouter as publicCommercialRouter,
}
