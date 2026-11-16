import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.content.js'

const router = Router()

router.post('/', requireAdmin, controller.createCategory)
router.patch('/:id', requireAdmin, controller.updateCategory)
router.delete('/:id', requireAdmin, controller.deleteCategory)

export default router
