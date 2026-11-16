import { Router } from 'express'
import { listContents, getContent } from '../controller/content.js'

const router = Router()

router.get('/', listContents)
router.get('/:slug', getContent)

export default router
