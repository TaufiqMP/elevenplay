import { Router } from 'express'
import accountRoutes from './account.routes.js'
import adminAccountRoutes from './admin.account.routes.js'

const router = Router()

router.use('/accounts', accountRoutes)
router.use('/admin/accounts', adminAccountRoutes)

export default router