import * as contentService from '../services/content.js'

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  if (['23502', '23503', '23514', '22P02'].includes(err.code)) {
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

//GET /contents
export async function listContents(req, res) {
  try {
    const { page, limit } = readPage(req)
    const q = String(req.query.q || '').trim().slice(0, 100)

    const { data, count } = await contentService.getPublishedContents({ page, limit, q })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /contents/:slug
export async function getContent(req, res) {
  try {
    const content = await contentService.getPublishedContentBySlug(req.params.slug)

    if (!content) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Berita tidak ditemukan' } })
    }

    res.json(content)
  } catch (err) {
    sendError(res, err)
  }
}

//GET /content-categories
export async function listCategories(req, res) {
  try {
    const data = await contentService.getCategories()
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}
