import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'
import {
  addReservationNoteAdmin,
  cancelReservationAdmin,
  changePartySizeAdmin,
  confirmReservationAdmin,
  createReservationAdmin,
  exportReservationsAdmin,
  getReservationAdmin,
  listReservationsAdmin,
  patchReservationAdmin,
  reservationHistoryAdmin,
  rescheduleReservationAdmin,
} from './reservations.controller'

const router = Router()
const reservationRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const protectedReservations = [authenticate, authorize(reservationRoles)]

router.use(rateLimit(240, 60_000))
router.get('/reservations/export', ...protectedReservations, exportReservationsAdmin)
router.get('/reservations', ...protectedReservations, listReservationsAdmin)
router.get('/reservations/:id', ...protectedReservations, getReservationAdmin)
router.post('/reservations', ...protectedReservations, createReservationAdmin)
router.patch('/reservations/:id', ...protectedReservations, patchReservationAdmin)
router.post('/reservations/:id/confirm', ...protectedReservations, confirmReservationAdmin)
router.post('/reservations/:id/cancel', ...protectedReservations, cancelReservationAdmin)
router.post('/reservations/:id/reschedule', ...protectedReservations, rescheduleReservationAdmin)
router.post('/reservations/:id/change-party-size', ...protectedReservations, changePartySizeAdmin)
router.post('/reservations/:id/notes', ...protectedReservations, addReservationNoteAdmin)
router.get('/reservations/:id/history', ...protectedReservations, reservationHistoryAdmin)

export { router as adminReservationsRouter }
