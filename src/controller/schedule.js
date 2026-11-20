import * as scheduleService from '../services/schedule.js'

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

//GET /schedules
//Bawaan 3 jadwal (1 kartu besar + 2 kartu kecil di beranda), maksimal 12
export async function listSchedules(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 3, 1), 12)

    const { data, count } = await scheduleService.getPublishedSchedules({ page, limit })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}
