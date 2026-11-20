import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.schedule.js'

const router = Router()

router.get('/', requireAdmin, controller.listSchedules)
router.post('/', requireAdmin, controller.createSchedule)
router.get('/:id', requireAdmin, controller.getSchedule)
router.patch('/:id', requireAdmin, controller.updateSchedule)
router.delete('/:id', requireAdmin, controller.deleteSchedule)

export default router
