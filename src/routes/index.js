import { Router } from 'express'
import accountRoutes from './account.routes.js'
import adminAccountRoutes from './admin.account.routes.js'
import contentRoutes from './content.routes.js'
import contentCategoryRoutes from './content-category.routes.js'
import adminContentRoutes from './admin.content.routes.js'
import adminContentCategoryRoutes from './admin.content-category.routes.js'

const router = Router()

router.use('/accounts', accountRoutes)
router.use('/admin/accounts', adminAccountRoutes)
router.use('/contents', contentRoutes)
router.use('/content-categories', contentCategoryRoutes)
router.use('/admin/contents', adminContentRoutes)
router.use('/admin/content-categories', adminContentCategoryRoutes)

export default router