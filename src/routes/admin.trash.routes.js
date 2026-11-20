import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.trash.js'

const router = Router()

router.get('/', requireAdmin, controller.listTrash)
router.post('/:type/:id/restore', requireAdmin, controller.restoreTrash)
router.delete('/:type/:id', requireAdmin, controller.purgeTrash)

export default router
