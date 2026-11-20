import { Router } from 'express'
import { requireMember } from '../middlewares/auth.js'
import * as controller from '../controller/forum.js'

const router = Router()

//Publik
router.get('/categories', controller.listCategories)
router.get('/threads', controller.listThreads)
router.get('/threads/:slug', controller.getThread)
router.get('/threads/:slug/comments', controller.listComments)

//Member (harus login)
router.get('/me/threads', requireMember, controller.listMyThreads)
router.get('/me/threads/:id', requireMember, controller.getMyThread)
router.post('/threads', requireMember, controller.createThread)
router.patch('/threads/:id', requireMember, controller.updateThread)
router.delete('/threads/:id', requireMember, controller.archiveThread)
router.post('/threads/:id/comments', requireMember, controller.createComment)
router.delete('/comments/:id', requireMember, controller.deleteComment)
router.get('/threads/:id/like', requireMember, controller.getLikeStatus)
router.put('/threads/:id/like', requireMember, controller.addLike)
router.delete('/threads/:id/like', requireMember, controller.removeLike)

export default router
