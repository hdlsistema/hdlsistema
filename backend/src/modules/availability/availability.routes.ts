import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getAvailability,
  getAvailabilityCalendar,
  getBlockouts,
  getSlots,
  patchBlockout,
  patchSlot,
  postBlockout,
  postBlockSlot,
  postDuplicateSlots,
  postSlot,
  postUnblockSlot,
  removeBlockout,
} from './availability.controller'

const router = Router()
const availabilityRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const protectedAvailability = [authenticate, authorize(availabilityRoles)]

router.use(rateLimit(240, 60_000))
router.get('/availability', ...protectedAvailability, getAvailability)
router.get('/availability/calendar', ...protectedAvailability, getAvailabilityCalendar)
router.get('/availability/slots', ...protectedAvailability, getSlots)
router.post('/availability/slots', ...protectedAvailability, postSlot)
router.patch('/availability/slots/:id', ...protectedAvailability, patchSlot)
router.post('/availability/slots/:id/block', ...protectedAvailability, postBlockSlot)
router.post('/availability/slots/:id/unblock', ...protectedAvailability, postUnblockSlot)
router.get('/availability/blockouts', ...protectedAvailability, getBlockouts)
router.post('/availability/blockouts', ...protectedAvailability, postBlockout)
router.patch('/availability/blockouts/:id', ...protectedAvailability, patchBlockout)
router.delete('/availability/blockouts/:id', ...protectedAvailability, removeBlockout)
router.post('/availability/duplicate-slots', ...protectedAvailability, postDuplicateSlots)

export { router as adminAvailabilityRouter }
