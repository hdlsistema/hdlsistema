import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewCustomers = [...protectedCustomers, requireControlPermission('customers.view')]
const manageCustomers = [...protectedCustomers, requireControlPermission('customers.manage')]

router.use(rateLimit(240, 60_000))

router.get('/customers/export', ...viewCustomers, getCustomersExport)
router.get('/customers', ...viewCustomers, getCustomers)
router.post('/customers', ...manageCustomers, postCustomer)
router.get('/customers/:id', ...viewCustomers, getCustomerById)
router.patch('/customers/:id', ...manageCustomers, patchCustomer)
router.post('/customers/:id/archive', ...manageCustomers, postArchiveCustomer)
router.post('/customers/:id/restore', ...manageCustomers, postRestoreCustomer)
router.get('/customers/:id/reservations', ...viewCustomers, getCustomerReservations)
router.get('/customers/:id/orders', ...viewCustomers, getCustomerOrders)
router.get('/customers/:id/memberships', ...viewCustomers, getCustomerMemberships)
router.get('/customers/:id/history', ...viewCustomers, getCustomerHistory)
router.post('/customers/:id/notes', ...manageCustomers, postCustomerNote)
router.patch('/customers/:id/notes/:noteId', ...manageCustomers, patchCustomerNote)
router.delete('/customers/:id/notes/:noteId', ...manageCustomers, removeCustomerNote)
router.post('/customers/:id/tags', ...manageCustomers, postCustomerTag)
router.delete('/customers/:id/tags/:tagId', ...manageCustomers, removeCustomerTag)
router.get('/customer-tags', ...viewCustomers, getCustomerTags)
router.post('/customer-tags', ...manageCustomers, postCustomerTagDefinition)
router.patch('/customer-tags/:id', ...manageCustomers, patchCustomerTagDefinition)
router.delete('/customer-tags/:id', ...manageCustomers, removeCustomerTagDefinition)

export { router as adminCustomersRouter }
