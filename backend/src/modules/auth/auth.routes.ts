import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { rateLimit } from '../../middleware/rateLimit'
import { changeInitialPassword, getMe, getProfile, getRoles } from './auth.controller'

const router = Router()

router.use(rateLimit(60, 60_000))
router.get('/me', authenticate, getMe)
router.get('/roles', authenticate, getRoles)
router.get('/profile', authenticate, getProfile)
router.post('/initial-password', rateLimit(8, 15 * 60_000), authenticate, changeInitialPassword)

export { router as authRouter }
