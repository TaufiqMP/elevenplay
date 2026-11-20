import * as trashService from '../services/trash.js'

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

//Jenis barang harus salah satu dari TRASH_TYPES
function readType(req, res) {
  const type = req.params.type || req.query.type
  if (!trashService.TRASH_TYPES[type]) {
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Jenis barang tidak dikenal' } })
    return null
  }
  return type
}

//Id harus angka bulat positif
function readId(req, res) {
  if (!/^[1-9]\d*$/.test(String(req.params.id))) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan' } })
    return null
  }
  return Number(req.params.id)
}

//GET /admin/trash?type=accounts&page=1
export async function listTrash(req, res) {
  const type = readType(req, res)
  if (!type) return

  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48)

    const { data, count } = await trashService.listTrash(type, { page, limit })
    res.json({
      data,
      retention_days: trashService.RETENTION_DAYS,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//POST /admin/trash/:type/:id/restore
export async function restoreTrash(req, res) {
  const type = readType(req, res)
  if (!type) return
  const id = readId(req, res)
  if (!id) return

  try {
    const restored = await trashService.restoreFromTrash(type, id)
    if (!restored) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Barang tidak ada di Sampah' } })
    }
    res.json({ restored: true })
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/trash/:type/:id  (hapus permanen, hanya dari Sampah)
export async function purgeTrash(req, res) {
  const type = readType(req, res)
  if (!type) return
  const id = readId(req, res)
  if (!id) return

  try {
    const purged = await trashService.purgeFromTrash(type, id)
    if (!purged) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Barang tidak ada di Sampah' } })
    }
    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}
