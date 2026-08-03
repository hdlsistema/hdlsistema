import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getCustomerById,
  getCustomerHistory,
  getCustomerMemberships,
  getCustomerOrders,
  getCustomerReservations,
  getCustomerTags,
  getCustomers,
  getCustomersExport,
  patchCustomer,
  patchCustomerNote,
  patchCustomerTagDefinition,
  postArchiveCustomer,
  postCustomer,
  postCustomerNote,
  postCustomerTag,
  postCustomerTagDefinition,
  postRestoreCustomer,
  removeCustomerNote,
  removeCustomerTag,
  removeCustomerTagDefinition,
} from './customers.controller'

const router = Router()
const customerReadRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const protectedCustomers = [authenticate, authorize(customerReadRoles)]

router.use(rateLimit(240, 60_000))

router.get('/customers/export', ...protectedCustomers, getCustomersExport)
router.get('/customers', ...protectedCustomers, getCustomers)
router.post('/customers', ...protectedCustomers, postCustomer)
router.get('/customers/:id', ...protectedCustomers, getCustomerById)
router.patch('/customers/:id', ...protectedCustomers, patchCustomer)
router.post('/customers/:id/archive', ...protectedCustomers, postArchiveCustomer)
router.post('/customers/:id/restore', ...protectedCustomers, postRestoreCustomer)
router.get('/customers/:id/reservations', ...protectedCustomers, getCustomerReservations)
router.get('/customers/:id/orders', ...protectedCustomers, getCustomerOrders)
router.get('/customers/:id/memberships', ...protectedCustomers, getCustomerMemberships)
router.get('/customers/:id/history', ...protectedCustomers, getCustomerHistory)
router.post('/customers/:id/notes', ...protectedCustomers, postCustomerNote)
router.patch('/customers/:id/notes/:noteId', ...protectedCustomers, patchCustomerNote)
router.delete('/customers/:id/notes/:noteId', ...protectedCustomers, removeCustomerNote)
router.post('/customers/:id/tags', ...protectedCustomers, postCustomerTag)
router.delete('/customers/:id/tags/:tagId', ...protectedCustomers, removeCustomerTag)
router.get('/customer-tags', ...protectedCustomers, getCustomerTags)
router.post('/customer-tags', ...protectedCustomers, postCustomerTagDefinition)
router.patch('/customer-tags/:id', ...protectedCustomers, patchCustomerTagDefinition)
router.delete('/customer-tags/:id', ...protectedCustomers, removeCustomerTagDefinition)

export { router as adminCustomersRouter }
