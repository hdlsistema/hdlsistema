import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  cancelCustomerReservationController,
  createCustomerReservationController,
  getCustomerAvailabilityController,
  getCustomerExperienceAvailabilityController,
  getCustomerMeController,
  getCustomerMembershipBenefitsController,
  getCustomerMembershipController,
  getCustomerMembershipHistoryController,
  getCustomerMembershipLoyaltyController,
  getCustomerReservationController,
  listCustomerReservationsController,
  patchCustomerMeController,
  rescheduleCustomerReservationController,
} from './customer.controller'

const router = Router()
const customerRoles = ['customer', 'super_admin', 'admin']
const protectedCustomer = [authenticate, authorize(customerRoles)]

router.use(rateLimit(180, 60_000))
router.get('/me', ...protectedCustomer, getCustomerMeController)
router.patch('/me', ...protectedCustomer, patchCustomerMeController)
router.get('/availability', ...protectedCustomer, getCustomerAvailabilityController)
router.get('/availability/:experienceId', ...protectedCustomer, getCustomerExperienceAvailabilityController)
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
