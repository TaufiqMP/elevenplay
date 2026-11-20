import * as settingService from '../services/setting.js'

function fail(res, message) {
  res.status(422).json({ error: { code: 'VALIDATION_ERROR', message } })
}

//Username TikTok: huruf, angka, titik, garis bawah, 2-24 karakter. Tanda @ di depan dibuang
function cleanTiktokUsername(value) {
  if (value === null || value === '') return { value: null }

  const username = String(value).trim().replace(/^@+/, '')
  if (!/^[A-Za-z0-9._]{2,24}$/.test(username)) {
    return { error: 'tiktok_username hanya boleh huruf, angka, titik, dan garis bawah (2-24 karakter)' }
  }
  return { value: username }
}

//Username Instagram: huruf, angka, titik, garis bawah, maksimal 30 karakter. Tanda @ di depan dibuang
function cleanInstagramUsername(value) {
  if (value === null || value === '') return { value: null }

  const username = String(value).trim().replace(/^@+/, '')
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return { error: 'instagram_username hanya boleh huruf, angka, titik, dan garis bawah (maks. 30 karakter)' }
  }
  return { value: username }
}

//Nomor WhatsApp dirapikan ke format 628xxx (format yang dipakai wa.me)
//Boleh diketik 0812-3456-7890, +62 812 3456 7890, atau 6281234567890
function cleanWhatsappNumber(value) {
  if (value === null || value === '') return { value: null }

  let number = String(value).replace(/[\s\-().+]/g, '')
  if (number.startsWith('0')) number = `62${number.slice(1)}`

  if (!/^628\d{7,12}$/.test(number)) {
    return { error: 'whatsapp_number harus nomor Indonesia, mis. 081234567890 atau 6281234567890' }
  }
  return { value: number }
}

//PATCH /admin/settings
export async function updateSettings(req, res) {
  const body = {}

  //Ambil hanya key yang dikenal
  for (const key of settingService.ALLOWED_KEYS) {
    if (req.body[key] !== undefined) body[key] = req.body[key]
  }

  if (Object.keys(body).length === 0) {
    return fail(res, `Isi minimal satu pengaturan: ${settingService.ALLOWED_KEYS.join(', ')}`)
  }

  if (body.tiktok_username !== undefined) {
    const result = cleanTiktokUsername(body.tiktok_username)
    if (result.error) return fail(res, result.error)
    body.tiktok_username = result.value
  }

  if (body.whatsapp_number !== undefined) {
    const result = cleanWhatsappNumber(body.whatsapp_number)
    if (result.error) return fail(res, result.error)
    body.whatsapp_number = result.value
  }

  if (body.instagram_username !== undefined) {
    const result = cleanInstagramUsername(body.instagram_username)
    if (result.error) return fail(res, result.error)
    body.instagram_username = result.value
  }

  try {
    const settings = await settingService.updateSettings(body)
    res.json(settings)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' } })
  }
}
