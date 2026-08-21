import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
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
const viewReservations = [...protectedReservations, requireControlPermission('reservations.view')]
const manageReservations = [...protectedReservations, requireControlPermission('reservations.manage')]

router.use(rateLimit(240, 60_000))
router.get('/reservations/export', ...viewReservations, exportReservationsAdmin)
router.get('/reservations', ...viewReservations, listReservationsAdmin)
router.get('/reservations/:id', ...viewReservations, getReservationAdmin)
router.post('/reservations', ...manageReservations, createReservationAdmin)
router.patch('/reservations/:id', ...manageReservations, patchReservationAdmin)
router.post('/reservations/:id/confirm', ...manageReservations, confirmReservationAdmin)
router.post('/reservations/:id/cancel', ...manageReservations, cancelReservationAdmin)
router.post('/reservations/:id/reschedule', ...manageReservations, rescheduleReservationAdmin)
router.post('/reservations/:id/change-party-size', ...manageReservations, changePartySizeAdmin)
router.post('/reservations/:id/notes', ...manageReservations, addReservationNoteAdmin)
router.get('/reservations/:id/history', ...viewReservations, reservationHistoryAdmin)

export { router as adminReservationsRouter }
