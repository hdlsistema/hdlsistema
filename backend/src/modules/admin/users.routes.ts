import { Router } from 'express'
import {
  assignUserRole,
  createUser,
  disableUser,
  enableUser,
  getControlPermissionCatalog,
  getCurrentControlAccess,
  getUserById,
  getUserPermissions,
  listUsers,
  removeUserRole,
  rotateUserPassword,
  updateUser,
  updateUserPermissions,
} from './users.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { rateLimit } from '../../middleware/rateLimit'

const router = Router()
const adminOnly = [authenticate, authorize(['super_admin', 'admin'])]

router.use(rateLimit(120, 60_000))
router.get('/permissions/me', authenticate, authorize(['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']), getCurrentControlAccess)
router.get('/permissions/catalog', ...adminOnly, getControlPermissionCatalog)
router.get('/users', ...adminOnly, listUsers)
router.get('/users/:id', ...adminOnly, getUserById)
router.post('/users', ...adminOnly, createUser)
router.patch('/users/:id', ...adminOnly, updateUser)
router.get('/users/:id/permissions', ...adminOnly, getUserPermissions)
router.put('/users/:id/permissions', ...adminOnly, updateUserPermissions)
router.post('/users/:id/password', ...adminOnly, rotateUserPassword)
router.post('/users/:id/roles', ...adminOnly, assignUserRole)
router.delete('/users/:id/roles/:roleCode', ...adminOnly, removeUserRole)
router.post('/users/:id/disable', ...adminOnly, disableUser)
router.post('/users/:id/enable', ...adminOnly, enableUser)

export { router as adminUsersRouter }
