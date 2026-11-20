import * as forumService from '../services/forum.js'

const THREAD_STATUSES = ['published', 'hidden']

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

function readPage(req, defaultLimit = 12) {
  const page = Math.max(parseInt(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit) || defaultLimit, 1), 48)
  return { page, limit }
}

//Id admin harus angka bulat positif. Selain itu dianggap tidak ketemu
function readId(req, res) {
  if (!/^[1-9]\d*$/.test(String(req.params.id))) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan' } })
    return null
  }
  return Number(req.params.id)
}

//GET /admin/forum/threads?status=
export async function listThreads(req, res) {
  try {
    const { page, limit } = readPage(req)
    const status = req.query.status

    const { data, count } = await forumService.getAllThreads({ page, limit, status })
    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /admin/forum/threads/:id  body: { status: 'published' | 'hidden', note? }
//Setiap perubahan dicatat di moderation_logs
export async function setThreadStatus(req, res) {
  const status = req.body.status
  if (!THREAD_STATUSES.includes(status)) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'status harus published atau hidden' } })
  }

  try {
    const id = readId(req, res)
    if (!id) return

    const thread = await forumService.setThreadStatus(id, status)
    if (!thread) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Thread tidak ditemukan' } })
    }

    await forumService.addModerationLog({
      adminId: req.user.sub,
      action: status === 'hidden' ? 'hide_thread' : 'show_thread',
      targetType: 'thread',
      targetId: id,
      note: String(req.body.note ?? '').trim().slice(0, 300) || null,
    })

    res.json(thread)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/forum/comments/:id  (menyembunyikan, bukan menghapus)
export async function hideComment(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const comment = await forumService.hideComment(id)
    if (!comment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Komentar tidak ditemukan' } })
    }

    await forumService.addModerationLog({
      adminId: req.user.sub,
      action: 'hide_comment',
      targetType: 'comment',
      targetId: id,
      note: String(req.body?.note ?? '').trim().slice(0, 300) || null,
    })

    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}

//GET /admin/moderation-logs
export async function listLogs(req, res) {
  try {
    const { page, limit } = readPage(req, 20)
    const { data, count } = await forumService.getModerationLogs({ page, limit })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}
