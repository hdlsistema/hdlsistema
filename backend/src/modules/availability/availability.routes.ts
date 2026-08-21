import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewAvailability = [...protectedAvailability, requireControlPermission('availability.view')]
const manageAvailability = [...protectedAvailability, requireControlPermission('availability.manage')]

router.use(rateLimit(240, 60_000))
router.get('/availability', ...viewAvailability, getAvailability)
router.get('/availability/calendar', ...viewAvailability, getAvailabilityCalendar)
router.get('/availability/slots', ...viewAvailability, getSlots)
router.post('/availability/slots', ...manageAvailability, postSlot)
router.patch('/availability/slots/:id', ...manageAvailability, patchSlot)
router.post('/availability/slots/:id/block', ...manageAvailability, postBlockSlot)
router.post('/availability/slots/:id/unblock', ...manageAvailability, postUnblockSlot)
router.get('/availability/blockouts', ...viewAvailability, getBlockouts)
router.post('/availability/blockouts', ...manageAvailability, postBlockout)
router.patch('/availability/blockouts/:id', ...manageAvailability, patchBlockout)
router.delete('/availability/blockouts/:id', ...manageAvailability, removeBlockout)
router.post('/availability/duplicate-slots', ...manageAvailability, postDuplicateSlots)

export { router as adminAvailabilityRouter }
