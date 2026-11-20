import { Router } from 'express'
import { listSchedules } from '../controller/schedule.js'

const router = Router()

router.get('/', listSchedules)

export default router
