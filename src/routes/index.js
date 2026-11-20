import { Router } from 'express'
import accountRoutes from './account.routes.js'
import adminAccountRoutes from './admin.account.routes.js'
import contentRoutes from './content.routes.js'
import contentCategoryRoutes from './content-category.routes.js'
import adminContentRoutes from './admin.content.routes.js'
import adminContentCategoryRoutes from './admin.content-category.routes.js'
import scheduleRoutes from './schedule.routes.js'
import adminScheduleRoutes from './admin.schedule.routes.js'
import forumRoutes from './forum.routes.js'
import adminForumRoutes from './admin.forum.routes.js'
import adminModerationRoutes from './admin.moderation.routes.js'
import profileRoutes from './profile.routes.js'
import adminTrashRoutes from './admin.trash.routes.js'
import settingRoutes from './setting.routes.js'
import adminSettingRoutes from './admin.setting.routes.js'

const router = Router()

router.use('/accounts', accountRoutes)
router.use('/admin/accounts', adminAccountRoutes)
router.use('/contents', contentRoutes)
router.use('/content-categories', contentCategoryRoutes)
router.use('/admin/contents', adminContentRoutes)
router.use('/admin/content-categories', adminContentCategoryRoutes)
router.use('/schedules', scheduleRoutes)
router.use('/admin/schedules', adminScheduleRoutes)
router.use('/forum', forumRoutes)
router.use('/admin/forum', adminForumRoutes)
router.use('/admin/moderation-logs', adminModerationRoutes)
router.use('/profile', profileRoutes)
router.use('/admin/trash', adminTrashRoutes)
router.use('/settings', settingRoutes)
router.use('/admin/settings', adminSettingRoutes)

export default router