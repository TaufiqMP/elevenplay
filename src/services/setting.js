import { supabase } from '../config/supabase.js'

//Hanya key ini yang boleh dibaca dan diubah. Tambah key baru cukup di sini
export const ALLOWED_KEYS = ['tiktok_username', 'whatsapp_number', 'instagram_username']

//Baris key/value menjadi satu objek, lalu tambahkan link TikTok yang dibuat dari username
function toSettings(rows) {
  const result = {}

  for (const key of ALLOWED_KEYS) result[key] = null
  for (const row of rows) {
    if (ALLOWED_KEYS.includes(row.key)) result[row.key] = row.value
  }

  const username = result.tiktok_username
  result.tiktok_url = username ? `https://www.tiktok.com/@${username}` : null
  result.tiktok_live_url = username ? `https://www.tiktok.com/@${username}/live` : null

  //Nomor disimpan format 628xxx, link wa.me dipakai tombol Hubungi
  const whatsapp = result.whatsapp_number
  result.whatsapp_url = whatsapp ? `https://wa.me/${whatsapp}` : null

  const instagram = result.instagram_username
  result.instagram_url = instagram ? `https://www.instagram.com/${instagram}` : null

  return result
}

//SQL: select key, value from settings where key in (...)
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ALLOWED_KEYS)

  if (error) throw error
  return toSettings(data)
}

//SQL: insert into settings (key, value, updated_at) values (...)
//on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
export async function updateSettings(body) {
  const rows = []
  const now = new Date().toISOString()

  for (const key of ALLOWED_KEYS) {
    if (body[key] === undefined) continue
    rows.push({ key, value: body[key] === '' ? null : body[key], updated_at: now })
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) throw error
  }

  return getSettings()
}
