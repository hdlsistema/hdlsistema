import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { rateLimit } from '../../middleware/rateLimit'
import { deleteBlock, getCalendar, getPackages, getStays, getUnits, patchUnit, postBlock, postCheckIn, postCheckOut, postReservation, postReschedule, postUnit } from './lodging.controller'

const router = Router()
const roles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const protectedLodging = [authenticate, authorize(roles)]
const viewLodging = [...protectedLodging, requireControlPermission('availability.view')]
const manageLodging = [...protectedLodging, requireControlPermission('availability.manage')]

router.use(rateLimit(240, 60_000))
router.get('/lodging/units', ...viewLodging, getUnits)
router.get('/lodging/packages', ...viewLodging, getPackages)
router.post('/lodging/units', ...manageLodging, postUnit)
router.patch('/lodging/units/:id', ...manageLodging, patchUnit)
router.get('/lodging/calendar', ...viewLodging, getCalendar)
router.get('/lodging/stays', ...viewLodging, getStays)
router.post('/lodging/reservations', ...manageLodging, postReservation)
router.post('/lodging/stays/:reservationId/reschedule', ...manageLodging, postReschedule)
router.post('/lodging/blockouts', ...manageLodging, postBlock)
router.delete('/lodging/blockouts/:id', ...manageLodging, deleteBlock)
router.post('/lodging/stays/:reservationId/check-in', ...manageLodging, postCheckIn)
router.post('/lodging/stays/:reservationId/check-out', ...manageLodging, postCheckOut)

export { router as adminLodgingRouter }
