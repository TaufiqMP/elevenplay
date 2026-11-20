import { supabase } from '../config/supabase.js'

//Barang yang bisa masuk Sampah. Tiap jenis punya tabel, kolom tampil, dan status saat dipulihkan
export const TRASH_TYPES = {
  accounts: { table: 'accounts', fields: 'id, code, title, archived_at', restoreStatus: 'draft' },
  contents: { table: 'contents', fields: 'id, title, slug, archived_at', restoreStatus: 'draft' },
  schedules: { table: 'schedules', fields: 'id, title, archived_at', restoreStatus: 'draft' },
  threads: {
    table: 'forum_threads',
    fields: 'id, title, slug, archived_at, profiles!forum_threads_author_id_fkey(username, full_name)',
    restoreStatus: 'draft',
  },
  comments: {
    table: 'forum_comments',
    fields: 'id, body, thread_id, archived_at, profiles(username, full_name)',
    restoreStatus: 'published',
  },
}

//Lama barang di Sampah sebelum dihapus permanen otomatis
export const RETENTION_DAYS = 30

//Ambil nama tampil dari baris, supaya admin mengenali barangnya
function labelOf(type, row) {
  if (type === 'accounts') return `${row.code} · ${row.title}`
  if (type === 'comments') {
    const text = String(row.body ?? '').replace(/\s+/g, ' ').trim()
    return text.length > 80 ? `${text.slice(0, 80)}...` : text
  }
  return row.title
}

//Penulis dari relasi profil (thread dan komentar)
function authorOf(row) {
  return row.profiles?.username || row.profiles?.full_name || null
}

//SQL: select ... from {table} where status = 'archived' order by archived_at desc limit {limit} offset {offset}
export async function listTrash(type, { page, limit }) {
  const config = TRASH_TYPES[type]
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from(config.table)
    .select(config.fields, { count: 'exact' })
    .eq('status', 'archived')
    .order('archived_at', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (error) throw error

  const items = []
  for (const row of data) {
    items.push({
      id: row.id,
      label: labelOf(type, row),
      author: type === 'threads' || type === 'comments' ? authorOf(row) : undefined,
      archived_at: row.archived_at,
    })
  }
  return { data: items, count }
}

//SQL: update {table} set status = {restoreStatus}, archived_at = null where id = {id} and status = 'archived'
export async function restoreFromTrash(type, id) {
  const config = TRASH_TYPES[type]

  const { data, error } = await supabase
    .from(config.table)
    .update({ status: config.restoreStatus, archived_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'archived')
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: delete from {table} where id = {id} and status = 'archived'
//Hanya barang yang sudah di Sampah yang bisa dihapus permanen
export async function purgeFromTrash(type, id) {
  const config = TRASH_TYPES[type]

  const { data, error } = await supabase
    .from(config.table)
    .delete()
    .eq('id', id)
    .eq('status', 'archived')
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}

//Hapus permanen semua barang yang sudah lebih dari RETENTION_DAYS di Sampah
//SQL: delete from {table} where status = 'archived' and archived_at < now() - interval '30 days'
export async function purgeExpired() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const removed = {}

  for (const [type, config] of Object.entries(TRASH_TYPES)) {
    const { data, error } = await supabase
      .from(config.table)
      .delete()
      .eq('status', 'archived')
      .lt('archived_at', cutoff)
      .select('id')

    if (error) throw error
    removed[type] = data.length
  }

  return removed
}
