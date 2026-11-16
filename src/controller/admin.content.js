import * as contentService from '../services/content.js'

const STATUSES = ['draft', 'published', 'archived']

//Mengubah error database menjadi response yang rapi
function sendError(res, err, action) {
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Data sudah ada' } })
  }
  if (err.code === '23503' && action === 'delete') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Kategori masih dipakai berita' } })
  }
  if (err.code === '23503') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Kategori atau profil admin tidak ditemukan' } })
  }
  if (['23502', '23514', '22P02'].includes(err.code)) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid' } })
  }

  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

function readPage(req) {
  const page = Math.max(parseInt(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48)
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

function fail(res, message) {
  res.status(422).json({ error: { code: 'VALIDATION_ERROR', message } })
}

function prepareContent(body, { creating }) {
  if (creating || body.title !== undefined) {
    body.title = String(body.title || '').trim()
    if (!body.title) return 'title wajib diisi'
  }

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return 'status harus draft, published, atau archived'
  }

  if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
    if (!/^[1-9]\d*$/.test(String(body.category_id))) return 'category_id tidak valid'
    body.category_id = Number(body.category_id)
  }

  if (body.published_at !== undefined && body.published_at !== null && body.published_at !== '') {
    const time = new Date(body.published_at)
    if (Number.isNaN(time.getTime())) return 'published_at tidak valid'
    body.published_at = time.toISOString()
  }

  if (body.gallery !== undefined && body.gallery !== null) {
    if (!Array.isArray(body.gallery)) return 'gallery harus berupa array URL'
    for (const item of body.gallery) {
      if (typeof item !== 'string' || !item.trim()) return 'gallery harus berupa array URL'
    }
  }

  return ''
}

//GET /admin/contents
export async function listContents(req, res) {
  try {
    const { page, limit } = readPage(req)
    const status = req.query.status

    if (status && !STATUSES.includes(status)) {
      return fail(res, 'status harus draft, published, atau archived')
    }

    const { data, count } = await contentService.getAllContents({ page, limit, status })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /admin/contents/:id
export async function getContent(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const content = await contentService.getContentById(id)
    if (!content) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Berita tidak ditemukan' } })
    }

    res.json(content)
  } catch (err) {
    sendError(res, err)
  }
}

//POST /admin/contents
export async function createContent(req, res) {
  const message = prepareContent(req.body, { creating: true })
  if (message) return fail(res, message)

  //Id penulis ada di claim token, bukan di body
  const authorId = req.user?.sub
  if (!authorId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token tidak valid' } })
  }

  try {
    const content = await contentService.createContent(req.body, authorId)
    res.status(201).json(content)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /admin/contents/:id
export async function updateContent(req, res) {
  const message = prepareContent(req.body, { creating: false })
  if (message) return fail(res, message)

  try {
    const id = readId(req, res)
    if (!id) return

    const content = await contentService.updateContent(id, req.body)
    if (!content) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Berita tidak ditemukan' } })
    }

    res.json(content)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/contents/:id
export async function deleteContent(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const deleted = await contentService.deleteContent(id, { permanent: req.query.permanent === 'true' })
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Berita tidak ditemukan' } })
    }

    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}

//POST /admin/content-categories
export async function createCategory(req, res) {
  req.body.name = String(req.body.name || '').trim()
  if (!req.body.name) return fail(res, 'name wajib diisi')

  try {
    const category = await contentService.createCategory(req.body)
    res.status(201).json(category)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /admin/content-categories/:id
export async function updateCategory(req, res) {
  req.body.name = String(req.body.name || '').trim()
  if (!req.body.name) return fail(res, 'name wajib diisi')

  try {
    const id = readId(req, res)
    if (!id) return

    const category = await contentService.updateCategory(id, req.body)
    if (!category) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' } })
    }

    res.json(category)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/content-categories/:id
export async function deleteCategory(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const deleted = await contentService.deleteCategory(id)
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' } })
    }

    res.status(204).end()
  } catch (err) {
    sendError(res, err, 'delete')
  }
}
