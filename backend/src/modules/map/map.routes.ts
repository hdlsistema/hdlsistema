import { Router } from 'express'
import { rateLimit } from '../../middleware/rateLimit'
import { getPublicMapPois } from './map.controller'

const router = Router()

router.use(rateLimit(240, 60_000))
router.get('/map/pois', getPublicMapPois)

export { router as publicMapRouter }
