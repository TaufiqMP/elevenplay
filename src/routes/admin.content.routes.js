import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.content.js'

const router = Router()

router.get('/', requireAdmin, controller.listContents)
router.post('/', requireAdmin, controller.createContent)
router.get('/:id', requireAdmin, controller.getContent)
router.patch('/:id', requireAdmin, controller.updateContent)
router.delete('/:id', requireAdmin, controller.deleteContent)

export default router
