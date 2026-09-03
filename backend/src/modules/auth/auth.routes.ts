import { Router } from 'express'
import { authenticate, authenticateSessionOnly } from '../../middleware/authenticate'
import { rateLimit } from '../../middleware/rateLimit'
import { changeInitialPassword, ensureCustomerWelcome, getAccountDeletionAccess, getMe, getProfile, getRoles, registerCustomer, storeAppleSignInToken } from './auth.controller'

const router = Router()

router.use(rateLimit(60, 60_000))
router.post('/register', rateLimit(8, 15 * 60_000), registerCustomer)
router.get('/me', authenticate, getMe)
router.get('/roles', authenticate, getRoles)
router.get('/profile', authenticate, getProfile)
router.get('/account-deletion-access', authenticateSessionOnly, getAccountDeletionAccess)
router.post('/apple-token', authenticate, storeAppleSignInToken)
router.post('/welcome', authenticate, ensureCustomerWelcome)
router.post('/initial-password', rateLimit(8, 15 * 60_000), authenticate, changeInitialPassword)

export { router as authRouter }
