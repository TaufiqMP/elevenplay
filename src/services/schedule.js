import { supabase } from '../config/supabase.js'

const FIELDS = 'id, title, type, recurrence, day_of_week, event_date, start_time, end_time, location, link_url, is_featured, status, created_at, updated_at'

const ALLOWED_FIELDS = [
  'title', 'type', 'recurrence', 'day_of_week', 'event_date',
  'start_time', 'end_time', 'location', 'link_url', 'is_featured', 'status',
]

//Ambil hanya field yang diizinkan, string kosong menjadi null
function pickFields(body) {
  const result = {}

  for (const key of ALLOWED_FIELDS) {
    if (body[key] === undefined) continue
    result[key] = body[key] === '' ? null : body[key]
  }

  return result
}

//Tanggal hari ini di zona WIB, format YYYY-MM-DD
function todayInJakarta() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

//Hanya boleh ada satu kartu besar. Jadwal lain dilepas dari status kartu besar
async function clearOtherFeatured(exceptId) {
  //SQL: update schedules set is_featured = false where is_featured = true and id <> {exceptId}
  let query = supabase
    .from('schedules')
    .update({ is_featured: false })
    .eq('is_featured', true)

  if (exceptId) query = query.neq('id', exceptId)

  const { error } = await query
  if (error) throw error
}

//SQL: select ... from schedules
//where status = 'published' and (recurrence = 'weekly' or event_date >= hari ini)
//order by is_featured desc, created_at desc limit {limit} offset {offset}
export async function getPublishedSchedules({ page, limit }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('schedules')
    .select(FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .or(`recurrence.eq.weekly,event_date.gte.${todayInJakarta()}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data, count }
}

//SQL: select ... from schedules order by created_at desc
export async function getAllSchedules({ page, limit, status }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('schedules')
    .select(FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) throw error
  return { data, count }
}

//SQL: select ... from schedules where id = {id}
export async function getScheduleById(id) {
  const { data, error } = await supabase
    .from('schedules')
    .select(FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: insert into schedules (...) values (...)
export async function createSchedule(body) {
  const fields = pickFields(body)

  const { data, error } = await supabase
    .from('schedules')
    .insert(fields)
    .select(FIELDS)
    .single()

  if (error) throw error
  if (data.is_featured) await clearOtherFeatured(data.id)
  return data
}

//SQL: update schedules set ... where id = {id}
export async function updateSchedule(id, body) {
  const fields = pickFields(body)
  fields.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('schedules')
    .update(fields)
    .eq('id', id)
    .select(FIELDS)
    .maybeSingle()

  if (error) throw error
  if (data && fields.is_featured === true) await clearOtherFeatured(data.id)
  return data
}

//SQL: update schedules set status = 'archived', is_featured = false where id = {id}
//atau delete from schedules where id = {id} kalau permanent
export async function deleteSchedule(id, { permanent = false } = {}) {
  //Hapus permanen hanya untuk jadwal yang sudah di Sampah (status archived)
  const query = permanent
    ? supabase.from('schedules').delete().eq('id', id).eq('status', 'archived')
    : supabase.from('schedules').update({
      status: 'archived',
      is_featured: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  return data
}
