import { Router } from 'express'
import { requireMember } from '../middlewares/auth.js'
import { getMyProfile, updateMyProfile } from '../controller/profile.js'

const router = Router()

//Profil sendiri (harus login)
router.get('/', requireMember, getMyProfile)
router.patch('/', requireMember, updateMyProfile)

export default router
