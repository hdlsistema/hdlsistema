import { Router } from 'express'
import {
  assignUserRole,
  createUser,
  disableUser,
  enableUser,
  getUserById,
  listUsers,
  removeUserRole,
  updateUser,
} from './users.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'

const router = Router()
const adminOnly = [authenticate, authorize(['super_admin', 'admin'])]

router.use(rateLimit(120, 60_000))
router.get('/users', ...adminOnly, listUsers)
router.get('/users/:id', ...adminOnly, getUserById)
router.post('/users', ...adminOnly, createUser)
router.patch('/users/:id', ...adminOnly, updateUser)
router.post('/users/:id/roles', ...adminOnly, assignUserRole)
router.delete('/users/:id/roles/:roleCode', ...adminOnly, removeUserRole)
router.post('/users/:id/disable', ...adminOnly, disableUser)
router.post('/users/:id/enable', ...adminOnly, enableUser)

export { router as adminUsersRouter }
