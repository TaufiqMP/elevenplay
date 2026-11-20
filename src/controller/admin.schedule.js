import * as scheduleService from '../services/schedule.js'

const STATUSES = ['draft', 'published', 'archived']
const TYPES = ['live_tiktok', 'room_match']
const RECURRENCES = ['weekly', 'once']

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Data sudah ada' } })
  }
  if (['23502', '23503', '23514', '22P02', '22007', '22008'].includes(err.code)) {
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
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jadwal tidak ditemukan' } })
    return null
  }
  return Number(req.params.id)
}

function fail(res, message) {
  res.status(422).json({ error: { code: 'VALIDATION_ERROR', message } })
}

function isEmpty(value) {
  return value === undefined || value === null || value === ''
}

//Jam format HH:MM atau HH:MM:SS
function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(value))
}

//Tanggal format YYYY-MM-DD yang benar-benar ada
function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const time = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(time.getTime()) && time.toISOString().startsWith(value)
}

//Cek seluruh data jadwal (hasil gabungan data lama + body). Pesan kosong berarti valid
function validate(data) {
  const title = String(data.title || '').trim()
  if (!title) return 'title wajib diisi'
  if (title.length > 120) return 'title maksimal 120 karakter'

  if (!TYPES.includes(data.type)) return 'type harus live_tiktok atau room_match'
  if (!RECURRENCES.includes(data.recurrence)) return 'recurrence harus weekly atau once'
  if (!STATUSES.includes(data.status)) return 'status harus draft, published, atau archived'

  if (data.recurrence === 'weekly') {
    if (!/^[0-6]$/.test(String(data.day_of_week))) return 'day_of_week harus 0 (Minggu) sampai 6 (Sabtu)'
  } else if (!isDate(data.event_date)) {
    return 'event_date wajib diisi dengan format YYYY-MM-DD'
  }

  if (!isTime(data.start_time)) return 'start_time wajib diisi dengan format HH:MM'
  if (!isEmpty(data.end_time) && !isTime(data.end_time)) return 'end_time harus format HH:MM'

  if (!isEmpty(data.location) && String(data.location).length > 120) return 'location maksimal 120 karakter'
  if (!isEmpty(data.link_url) && !/^https?:\/\/\S+$/.test(String(data.link_url))) {
    return 'link_url harus diawali http:// atau https://'
  }

  if (typeof data.is_featured !== 'boolean') return 'is_featured harus true atau false'

  return ''
}

//Rapikan body sebelum disimpan: trim teks, dan kosongkan kolom yang tidak dipakai pengulangan
function cleanBody(body, data) {
  if (body.title !== undefined) body.title = String(body.title).trim()
  if (body.day_of_week !== undefined && !isEmpty(body.day_of_week)) body.day_of_week = Number(body.day_of_week)

  //Mingguan memakai hari, sekali jalan memakai tanggal
  if (data.recurrence === 'weekly') body.event_date = null
  else body.day_of_week = null

  //Jadwal arsip tidak boleh jadi kartu besar
  if (data.status === 'archived') body.is_featured = false

  return body
}

//Nilai bawaan untuk jadwal baru
const DEFAULTS = {
  type: 'live_tiktok',
  recurrence: 'weekly',
  status: 'draft',
  is_featured: false,
}

//GET /admin/schedules
export async function listSchedules(req, res) {
  try {
    const { page, limit } = readPage(req)
    const status = req.query.status

    if (status && !STATUSES.includes(status)) {
      return fail(res, 'status harus draft, published, atau archived')
    }

    const { data, count } = await scheduleService.getAllSchedules({ page, limit, status })

    res.json({
      data,
      meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) },
    })
  } catch (err) {
    sendError(res, err)
  }
}

//GET /admin/schedules/:id
export async function getSchedule(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const schedule = await scheduleService.getScheduleById(id)
    if (!schedule) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jadwal tidak ditemukan' } })
    }

    res.json(schedule)
  } catch (err) {
    sendError(res, err)
  }
}

//POST /admin/schedules
export async function createSchedule(req, res) {
  const body = { ...DEFAULTS, ...req.body }

  const message = validate(body)
  if (message) return fail(res, message)

  try {
    const schedule = await scheduleService.createSchedule(cleanBody(body, body))
    res.status(201).json(schedule)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /admin/schedules/:id
export async function updateSchedule(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const current = await scheduleService.getScheduleById(id)
    if (!current) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jadwal tidak ditemukan' } })
    }

    //Gabungkan data lama dengan perubahan, supaya pengecekan selalu pada data lengkap
    const merged = { ...current, ...req.body }
    const message = validate(merged)
    if (message) return fail(res, message)

    const schedule = await scheduleService.updateSchedule(id, cleanBody({ ...req.body }, merged))
    res.json(schedule)
  } catch (err) {
    sendError(res, err)
  }
}

//DELETE /admin/schedules/:id
export async function deleteSchedule(req, res) {
  try {
    const id = readId(req, res)
    if (!id) return

    const deleted = await scheduleService.deleteSchedule(id, { permanent: req.query.permanent === 'true' })
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Jadwal tidak ditemukan' } })
    }

    res.status(204).end()
  } catch (err) {
    sendError(res, err)
  }
}
