import { Router } from 'express'
import { listAccounts, getAccount } from '../controller/account.js'

const router = Router()

router.get('/', listAccounts)
router.get('/:code', getAccount)

export default router