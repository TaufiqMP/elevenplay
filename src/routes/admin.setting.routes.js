import { Router } from 'express'
import { requireAdmin } from '../middlewares/auth.js'
import { updateSettings } from '../controller/admin.setting.js'

const router = Router()

//Sementara semua admin boleh mengubah. Nanti dipindah ke Super Admin kalau peran itu sudah ada
router.patch('/', requireAdmin, updateSettings)

export default router
