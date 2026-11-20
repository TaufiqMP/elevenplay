import * as forumService from '../services/forum.js'

const THREAD_STATUSES = ['draft', 'published']
const MY_THREAD_STATUSES = ['draft', 'published', 'hidden', 'archived']

const DEFAULTS = {
  body: '',
  tags: [],
  images: [],
  status: 'draft',
}

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  if (['23502', '23503', '23514', '22P02'].includes(err.code)) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid' } })
  }

  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

function notFound(res, message) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message } })
}

function fail(res, message) {
  res.status(422).json({ error: { code: 'VALIDATION_ERROR', message } })
}

function readPage(req, defaultLimit = 12) {
  const page = Math.max(parseInt(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit) || defaultLimit, 1), 48)
  return { page, limit }
}

//Id harus angka bulat positif. Selain itu dianggap tidak ketemu
function readId(req, res) {
  if (!/^[1-9]\d*$/.test(String(req.params.id))) {
    notFound(res, 'Data tidak ditemukan')
    return null
  }
  return Number(req.params.id)
}

//Rapikan body: judul di-trim, tag huruf kecil tanpa duplikat, kategori diubah ke angka
//Array yang salah tipe dibiarkan supaya validasi yang menolaknya
function normalize(body) {
  const result = { ...body }

  if (result.title !== undefined) result.title = String(result.title ?? '').trim()
  if (result.body !== undefined) result.body = String(result.body ?? '')

  if (result.category_id !== undefined && result.category_id !== null && result.category_id !== '') {
    result.category_id = Number(result.category_id)
  }

  if (Array.isArray(result.tags)) {
    const tags = []
    for (const tag of result.tags) {
      const clean = String(tag).trim().toLowerCase()
      if (clean && !tags.includes(clean)) tags.push(clean)
    }
    result.tags = tags
  }

  return result
}

//Cek data lengkap (hasil gabungan data lama + perubahan). Pesan kosong berarti valid
function validate(data) {
  if (!data.title) return 'title wajib diisi'
  if (data.title.length > 150) return 'title maksimal 150 karakter'

  if (!THREAD_STATUSES.includes(data.status)) return 'status harus draft atau published'
  if (data.status === 'published' && !String(data.body ?? '').trim()) {
    return 'isi thread wajib diisi sebelum dipublikasikan'
  }
  if (String(data.body ?? '').length > 20000) return 'isi thread maksimal 20.000 karakter'

  if (data.category_id !== null && data.category_id !== undefined && !/^[1-9]\d*$/.test(String(data.category_id))) {
    return 'category_id tidak valid'
  }

  if (!Array.isArray(data.tags) || data.tags.length > 5) return 'tags harus berupa array, maksimal 5 tag'
  for (const tag of data.tags) {
    if (tag.length > 24) return 'setiap tag maksimal 24 karakter'
  }

  if (!Array.isArray(data.images) || data.images.length > 4) return 'images harus berupa array, maksimal 4 gambar'
  for (const url of data.images) {
    if (!/^https?:\/\/\S+$/.test(String(url))) return 'setiap gambar harus berupa URL http:// atau https://'
  }

  return ''
}

//GET /forum/categories
export async function listCategories(req, res) {
  try {
    const data = await forumService.getCategories()
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/threads
export async function listThreads(req, res) {
  try {
    const { page, limit } = readPage(req)

    const categoryId = /^[1-9]\d*$/.test(String(req.query.category)) ? Number(req.query.category) : null
    const q = String(req.query.q || '').trim().replace(/[%_]/g, '').slice(0, 100)

    const { data, count } = await forumService.getPublishedThreads({ page, limit, categoryId, q })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/threads/:slug
export async function getThread(req, res) {
  try {
    const thread = await forumService.getPublishedThreadBySlug(req.params.slug)
    if (!thread) return notFound(res, 'Thread tidak ditemukan')

    res.json(thread)
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/threads/:slug/comments
export async function listComments(req, res) {
  try {
    const thread = await forumService.getPublishedThreadBySlug(req.params.slug)
    if (!thread) return notFound(res, 'Thread tidak ditemukan')

    const data = await forumService.getComments(thread.id)
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/me/threads?status=
export async function listMyThreads(req, res) {
  const status = req.query.status
  if (status && !MY_THREAD_STATUSES.includes(status)) {
    return fail(res, 'status harus draft, published, hidden, atau archived')
  }

  try {
    const data = await forumService.getThreadsByAuthor(req.user.sub, { status })
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/me/threads/:id
export async function getMyThread(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const thread = await forumService.getThreadById(id)
    if (!thread) return notFound(res, 'Thread tidak ditemukan')
    if (thread.author_id !== req.user.sub) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan thread milikmu' } })
    }

    res.json(thread)
  } catch (err) {
    sendError(res, err)
  }
}

//POST /forum/threads
export async function createThread(req, res) {
  const body = normalize({ ...DEFAULTS, ...req.body })

  const message = validate(body)
  if (message) return fail(res, message)

  try {
    const thread = await forumService.createThread(body, req.user.sub)
    res.status(201).json(thread)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /forum/threads/:id
export async function updateThread(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const current = await forumService.getThreadById(id)
    if (!current) return notFound(res, 'Thread tidak ditemukan')
    if (current.author_id !== req.user.sub) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan thread milikmu' } })
    }

    //Pengecekan dilakukan pada data lengkap, bukan hanya bagian yang diubah
    const changes = normalize(req.body)
    const message = validate({ ...current, ...changes })
    if (message) return fail(res, message)

    const thread = await forumService.updateThread(id, changes, current)
    res.json(thread)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /forum/threads/:id (mengarsipkan, bukan menghapus)
export async function archiveThread(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const current = await forumService.getThreadById(id)
    if (!current) return notFound(res, 'Thread tidak ditemukan')
    if (current.author_id !== req.user.sub) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan thread milikmu' } })
    }

    await forumService.archiveThread(id)
    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}

//POST /forum/threads/:id/comments
export async function createComment(req, res) {
  try {
    const threadId = readId(req, res)
    if (!threadId) return

    const body = String(req.body.body ?? '').trim()
    if (!body) return fail(res, 'body wajib diisi')
    if (body.length > 1000) return fail(res, 'komentar maksimal 1.000 karakter')

    //Komentar hanya untuk thread yang sedang tayang
    const thread = await forumService.getThreadById(threadId)
    if (!thread || thread.status !== 'published') return notFound(res, 'Thread tidak ditemukan')

    //Balasan hanya satu tingkat: parent harus komentar utama di thread yang sama
    let parentId = null
    if (req.body.parent_id !== undefined && req.body.parent_id !== null && req.body.parent_id !== '') {
      if (!/^[1-9]\d*$/.test(String(req.body.parent_id))) return fail(res, 'parent_id tidak valid')

      const parent = await forumService.getCommentById(Number(req.body.parent_id))
      if (!parent || parent.thread_id !== threadId) return fail(res, 'komentar yang dibalas tidak ditemukan')
      if (parent.parent_id) return fail(res, 'balasan hanya bisa dibalas satu tingkat')

      parentId = parent.id
    }

    const comment = await forumService.createComment({ threadId, parentId, body, authorId: req.user.sub })
    res.status(201).json(comment)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /forum/comments/:id (hanya komentar milik sendiri)
export async function deleteComment(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const deleted = await forumService.deleteOwnComment(id, req.user.sub)
    if (!deleted) return notFound(res, 'Komentar tidak ditemukan')

    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}

//GET /forum/threads/:id/like
export async function getLikeStatus(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const liked = await forumService.hasLiked(id, req.user.sub)
    res.json({ liked })
  } catch (err) {
    sendError(res, err)
  }
}

//PUT /forum/threads/:id/like
export async function addLike(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const thread = await forumService.getThreadById(id)
    if (!thread || thread.status !== 'published') return notFound(res, 'Thread tidak ditemukan')

    await forumService.addLike(id, req.user.sub)
    res.json({ liked: true })
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /forum/threads/:id/like
export async function removeLike(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    await forumService.removeLike(id, req.user.sub)
    res.json({ liked: false })
  } catch (err) {
    sendError(res, err)
  }
}
