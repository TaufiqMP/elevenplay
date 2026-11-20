import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import { listLogs } from '../controller/admin.forum.js'

const router = Router()

router.get('/', requireAdmin, listLogs)

export default router
