import { Router } from 'express'
import { getVersion } from './version.controller'

const router = Router()

router.get('/', getVersion)

export { router as versionRouter }
