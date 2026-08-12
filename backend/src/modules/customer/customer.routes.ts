import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  addCustomerCartItemController,
  cancelCustomerReservationController,
  clearCustomerCartController,
  createCustomerAddressController,
  createCustomerPaymentSessionController,
  createCustomerOrderController,
  createCustomerReservationController,
  disableCustomerDeviceController,
  deleteCustomerAddressController,
  getCustomerCartController,
  getCustomerAvailabilityController,
  getCustomerExperienceAvailabilityController,
  getCustomerMeController,
  getCustomerMembershipBenefitsController,
  getCustomerMembershipController,
  getCustomerMembershipHistoryController,
  getCustomerMembershipLoyaltyController,
  getCustomerOrderController,
  getCustomerPaymentStatusController,
  getCustomerReservationController,
  listCustomerAccessPassesController,
  listCustomerAddressesController,
  listCustomerOrdersController,
  listCustomerReservationsController,
  patchCustomerMeController,
  registerCustomerDeviceController,
  removeCustomerCartItemController,
  retryCustomerPaymentController,
  rescheduleCustomerReservationController,
  updateCustomerAddressController,
  updateCustomerCartItemController,
} from './customer.controller'

const router = Router()
const customerRoles = ['customer', 'super_admin', 'admin']
const protectedCustomer = [authenticate, authorize(customerRoles)]

router.use(rateLimit(180, 60_000))
router.get('/me', ...protectedCustomer, getCustomerMeController)
router.patch('/me', ...protectedCustomer, patchCustomerMeController)
router.post('/devices', ...protectedCustomer, registerCustomerDeviceController)
router.post('/devices/disable', ...protectedCustomer, disableCustomerDeviceController)
router.get('/availability', ...protectedCustomer, getCustomerAvailabilityController)
router.get('/availability/:experienceId', ...protectedCustomer, getCustomerExperienceAvailabilityController)
router.get('/cart', ...protectedCustomer, getCustomerCartController)
router.post('/cart/items', ...protectedCustomer, addCustomerCartItemController)
router.patch('/cart/items/:id', ...protectedCustomer, updateCustomerCartItemController)
router.delete('/cart/items/:id', ...protectedCustomer, removeCustomerCartItemController)
router.delete('/cart', ...protectedCustomer, clearCustomerCartController)
router.get('/addresses', ...protectedCustomer, listCustomerAddressesController)
router.post('/addresses', ...protectedCustomer, createCustomerAddressController)
router.patch('/addresses/:id', ...protectedCustomer, updateCustomerAddressController)
router.delete('/addresses/:id', ...protectedCustomer, deleteCustomerAddressController)
router.post('/orders', ...protectedCustomer, createCustomerOrderController)
router.get('/orders', ...protectedCustomer, listCustomerOrdersController)
router.post('/orders/:id/payment-session', ...protectedCustomer, createCustomerPaymentSessionController)
router.get('/orders/:id/payment-status', ...protectedCustomer, getCustomerPaymentStatusController)
router.post('/orders/:id/retry-payment', ...protectedCustomer, retryCustomerPaymentController)
router.get('/orders/:id', ...protectedCustomer, getCustomerOrderController)
router.get('/access-passes', ...protectedCustomer, listCustomerAccessPassesController)
router.get('/reservations', ...protectedCustomer, listCustomerReservationsController)
router.post('/reservations', ...protectedCustomer, createCustomerReservationController)
router.get('/reservations/:id', ...protectedCustomer, getCustomerReservationController)
router.post('/reservations/:id/cancel', ...protectedCustomer, cancelCustomerReservationController)
router.post('/reservations/:id/reschedule', ...protectedCustomer, rescheduleCustomerReservationController)
router.get('/membership', ...protectedCustomer, getCustomerMembershipController)
router.get('/membership/benefits', ...protectedCustomer, getCustomerMembershipBenefitsController)
router.get('/membership/loyalty', ...protectedCustomer, getCustomerMembershipLoyaltyController)
router.get('/membership/history', ...protectedCustomer, getCustomerMembershipHistoryController)

export { router as customerRouter }
