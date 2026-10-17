import { supabase } from '../config/supabase.js'

const LIST_FIELDS = 'id, code, title, subtitle, tier_label, main_image_url'
const ADMIN_LIST_FIELDS = `${LIST_FIELDS}, platform, status, last_checked_at, updated_at`

//Daftar kolom yang boleh diisi dari request admin, supaya field lain diabaikan
const ALLOWED_FIELDS = [
  'title', 'subtitle', 'tier_label', 'platform',
  'main_image_url', 'gallery',
  'team_strength', 'epic', 'big_time', 'showtime', 'coins', 'gp', 'division',
  'note', 'detail', 'linked_to', 'login_method', 'last_checked_at',
  'status', 'featured',
]

//Ini function untuk ngefilter request body supaya cuma field yang ada di ALLOWED_FIELDS yang diambil
function pickFields(body) {
  const result = {}

  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      result[key] = body[key]
    }
  }

  return result
}

//Ini query supabase untuk dapetin list akun yang statusnya published, dengan pagination
export async function getPublishedAccounts({ page, limit }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('accounts')
    .select(LIST_FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data, count }
}

//Ini query untuk nyari akun secara detail berdasarkan code, tapi hanya yang statusnya published
export async function getPublishedAccountByCode(code) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('code', code)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return data
}


//PEMBATAS UNTUK FUNCTION ADMIN =========================================================================================================
//Admin: list semua akun (termasuk draft dan archived), bisa difilter lewat status
export async function getAllAccounts({ page, limit, status }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('accounts')
    .select(ADMIN_LIST_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) throw error
  return { data, count }
}

//Admin: tambah akun baru
export async function createAccount(body) {
  const { data, error } = await supabase
    .from('accounts')
    .insert(pickFields(body))
    .select()
    .single()

  if (error) throw error
  return data
}

//Admin: ubah sebagian field akun berdasarkan id
export async function updateAccount(id, body) {
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...pickFields(body), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

//Admin: hapus akun. Default hanya diarsipkan, permanen kalau permanent = true
export async function deleteAccount(id, { permanent = false } = {}) {
  const query = permanent
    ? supabase.from('accounts').delete().eq('id', id)
    : supabase.from('accounts').update({ status: 'archived' }).eq('id', id)

  const { error } = await query
  if (error) throw error
}