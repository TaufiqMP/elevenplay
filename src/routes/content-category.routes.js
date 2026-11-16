import { Router } from 'express'
import { listCategories } from '../controller/content.js'

const router = Router()

router.get('/', listCategories)

export default router
