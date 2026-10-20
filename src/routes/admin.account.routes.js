import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import * as controller from '../controller/admin.account.js'

const router = Router()

//Semua route di file ini wajib login sebagai admin
router.use(requireAdmin)

router.get('/', controller.listAccounts)
router.get('/:id', controller.getAccount)
router.post('/', controller.createAccount)
router.patch('/:id', controller.updateAccount)
router.delete('/:id', controller.deleteAccount)

export default router