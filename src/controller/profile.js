import * as profileService from '../services/profile.js'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const WHATSAPP_REGEX = /^628[0-9]{8,12}$/

//Mengubah error database menjadi response yang rapi
function sendError(res, err) {
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'USERNAME_TAKEN', message: 'Username sudah dipakai' } })
  }

  console.error(err)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
}

//Nomor dirapikan ke format 628xxx. Kosong berarti tidak diisi (null)
function cleanWhatsapp(value) {
  if (value === null || value === '') return { value: null }

  let number = String(value).replace(/[\s\-().+]/g, '')
  if (number.startsWith('0')) number = `62${number.slice(1)}`

  if (!WHATSAPP_REGEX.test(number)) {
    return { error: 'Format nomor WhatsApp tidak valid, mis. 081234567890' }
  }
  return { value: number }
}

//GET /profile
export async function getMyProfile(req, res) {
  try {
    const profile = await profileService.getProfile(req.user.sub)
    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profil tidak ditemukan' } })
    }

    res.json(profile)
  } catch (err) {
    sendError(res, err)
  }
}

//PATCH /profile  body: { full_name?, username?, whatsapp? }
//Hanya field ini yang bisa diubah dari sini. Email dan password lewat Supabase Auth
export async function updateMyProfile(req, res) {
  const id = req.user.sub
  const fields = {}

  if (req.body.full_name !== undefined) {
    const fullName = String(req.body.full_name ?? '').trim()
    if (!fullName || fullName.length > 60) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Nama lengkap wajib diisi, maksimal 60 karakter' } })
    }
    fields.full_name = fullName
  }

  if (req.body.username !== undefined) {
    const username = String(req.body.username ?? '').trim()
    if (!USERNAME_REGEX.test(username)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Username 3-20 karakter, hanya huruf, angka, dan _' } })
    }
    fields.username = username
  }

  if (req.body.whatsapp !== undefined) {
    const result = cleanWhatsapp(req.body.whatsapp)
    if (result.error) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: result.error } })
    }
    fields.whatsapp = result.value
  }

  if (Object.keys(fields).length === 0) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Tidak ada data yang diubah' } })
  }

  try {
    if (fields.username && await profileService.isUsernameTakenByOther(fields.username, id)) {
      return res.status(409).json({ error: { code: 'USERNAME_TAKEN', message: 'Username sudah dipakai' } })
    }

    const profile = await profileService.updateProfile(id, fields)
    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profil tidak ditemukan' } })
    }

    await profileService.syncAuthMetadata(id, {
      full_name: profile.full_name,
      username: profile.username,
      whatsapp: profile.whatsapp,
    })

    res.json(profile)
  } catch (err) {
    sendError(res, err)
  }
}
