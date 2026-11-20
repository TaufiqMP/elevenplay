import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.forum.js'

const router = Router()

router.get('/threads', requireAdmin, controller.listThreads)
router.patch('/threads/:id', requireAdmin, controller.setThreadStatus)
router.delete('/comments/:id', requireAdmin, controller.hideComment)

export default router
