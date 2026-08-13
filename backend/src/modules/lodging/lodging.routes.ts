import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import { deleteBlock, getCalendar, getPackages, getStays, getUnits, patchUnit, postBlock, postCheckIn, postCheckOut, postReservation, postReschedule, postUnit } from './lodging.controller'

const router = Router()
const roles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const protectedLodging = [authenticate, authorize(roles)]

router.use(rateLimit(240, 60_000))
router.get('/lodging/units', ...protectedLodging, getUnits)
router.get('/lodging/packages', ...protectedLodging, getPackages)
router.post('/lodging/units', ...protectedLodging, postUnit)
router.patch('/lodging/units/:id', ...protectedLodging, patchUnit)
router.get('/lodging/calendar', ...protectedLodging, getCalendar)
router.get('/lodging/stays', ...protectedLodging, getStays)
router.post('/lodging/reservations', ...protectedLodging, postReservation)
router.post('/lodging/stays/:reservationId/reschedule', ...protectedLodging, postReschedule)
router.post('/lodging/blockouts', ...protectedLodging, postBlock)
router.delete('/lodging/blockouts/:id', ...protectedLodging, deleteBlock)
router.post('/lodging/stays/:reservationId/check-in', ...protectedLodging, postCheckIn)
router.post('/lodging/stays/:reservationId/check-out', ...protectedLodging, postCheckOut)

export { router as adminLodgingRouter }
