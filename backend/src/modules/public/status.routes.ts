import { Router } from 'express'
import { getPublicStatus } from './status.controller'

const router = Router()

router.get('/status', getPublicStatus)

export { router as publicRouter }
