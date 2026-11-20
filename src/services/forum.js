import { supabase } from '../config/supabase.js'

//Kolom thread untuk kartu dan detail. Relasi: kategori, penulis, jumlah suka dan komentar
const THREAD_FIELDS = 'id, title, slug, body, tags, images, status, category_id, author_id, published_at, created_at, updated_at, forum_categories(name, slug), profiles!forum_threads_author_id_fkey(username, full_name), forum_likes(count)'

const COMMENT_FIELDS = 'id, thread_id, parent_id, author_id, body, status, created_at, updated_at, profiles(username, full_name)'

const THREAD_KEYS = ['title', 'body', 'category_id', 'tags', 'images', 'status']

//Ambil hanya field yang diizinkan, string kosong menjadi null
function pickFields(body, allowed) {
  const result = {}

  for (const key of allowed) {
    if (body[key] === undefined) continue
    result[key] = body[key] === '' ? null : body[key]
  }

  return result
}

//Judul menjadi slug: huruf kecil, tanda baca menjadi tanda hubung
function slugify(value) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'thread'
}

//Cek bentrok slug, lalu tambah -2, -3, dan seterusnya
async function makeUniqueSlug(title) {
  const base = slugify(title)
  let slug = base
  let number = 2

  while (true) {
    //SQL: select id from forum_threads where slug = {slug}
    const { data, error } = await supabase
      .from('forum_threads')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) return slug

    slug = `${base}-${number}`
    number += 1
  }
}

//Nama tampil: username dulu, kalau kosong pakai nama lengkap
function authorName(profile) {
  return profile?.username || profile?.full_name || null
}

//Ratakan relasi supaya responsnya satu objek datar
function mapThread(row) {
  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    tags: row.tags ?? [],
    images: row.images ?? [],
    status: row.status,
    category_id: row.category_id,
    category: row.forum_categories?.name ?? null,
    category_slug: row.forum_categories?.slug ?? null,
    author_id: row.author_id,
    author: authorName(row.profiles),
    likes: row.forum_likes?.[0]?.count ?? 0,
    //Jumlah komentar diisi oleh withCommentCounts, supaya komentar yang disembunyikan tidak ikut
    comments: 0,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

//SQL: select thread_id from forum_comments where thread_id in (...) and status = 'published'
//Hasilnya dihitung per thread di sini, karena hitungan bawaan database tidak bisa memfilter status
async function countPublishedComments(threadIds) {
  const counts = new Map()
  if (threadIds.length === 0) return counts

  const { data, error } = await supabase
    .from('forum_comments')
    .select('thread_id')
    .in('thread_id', threadIds)
    .eq('status', 'published')

  if (error) throw error
  for (const row of data) counts.set(row.thread_id, (counts.get(row.thread_id) ?? 0) + 1)
  return counts
}

//Mengisi jumlah komentar yang tayang untuk setiap thread (null di dalam daftar dilewati)
async function withCommentCounts(threads) {
  const found = threads.filter(Boolean)
  const counts = await countPublishedComments(found.map((t) => t.id))
  for (const thread of found) thread.comments = counts.get(thread.id) ?? 0
  return threads
}

function mapThreads(rows) {
  const result = []
  for (const row of rows) result.push(mapThread(row))
  return result
}

function mapComment(row) {
  return {
    id: row.id,
    thread_id: row.thread_id,
    parent_id: row.parent_id,
    author_id: row.author_id,
    author: authorName(row.profiles),
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapComments(rows) {
  const result = []
  for (const row of rows) result.push(mapComment(row))
  return result
}

//SQL: select id, name, slug from forum_categories order by name
export async function getCategories() {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

//SQL: select ... from forum_threads where status = 'published' [and category_id = {c}] [and title ilike '%{q}%']
//order by published_at desc limit {limit} offset {offset}
export async function getPublishedThreads({ page, limit, categoryId, q }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('forum_threads')
    .select(THREAD_FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (q) query = query.ilike('title', `%${q}%`)

  const { data, count, error } = await query
  if (error) throw error
  return { data: await withCommentCounts(mapThreads(data)), count }
}

//SQL: select ... from forum_threads where slug = {slug} and status = 'published'
export async function getPublishedThreadBySlug(slug) {
  const { data, error } = await supabase
    .from('forum_threads')
    .select(THREAD_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return (await withCommentCounts([mapThread(data)]))[0]
}

//SQL: select ... from forum_threads where id = {id}
export async function getThreadById(id) {
  const { data, error } = await supabase
    .from('forum_threads')
    .select(THREAD_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (await withCommentCounts([mapThread(data)]))[0]
}

//SQL: select ... from forum_threads where author_id = {userId} [and status = {status}] order by created_at desc
export async function getThreadsByAuthor(authorId, { status }) {
  let query = supabase
    .from('forum_threads')
    .select(THREAD_FIELDS)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return withCommentCounts(mapThreads(data))
}

//SQL: insert into forum_threads (...) values (...)
export async function createThread(body, authorId) {
  const fields = pickFields(body, THREAD_KEYS)
  fields.slug = await makeUniqueSlug(body.title)
  fields.author_id = authorId

  if (fields.status === 'published') fields.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('forum_threads')
    .insert(fields)
    .select(THREAD_FIELDS)
    .single()

  if (error) throw error
  return (await withCommentCounts([mapThread(data)]))[0]
}

//SQL: update forum_threads set ... where id = {id}
//Slug tidak berubah saat judul diubah. published_at diisi sekali saat pertama kali tayang
export async function updateThread(id, body, current) {
  const fields = pickFields(body, THREAD_KEYS)
  fields.updated_at = new Date().toISOString()

  if (fields.status === 'published' && !current.published_at) {
    fields.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('forum_threads')
    .update(fields)
    .eq('id', id)
    .select(THREAD_FIELDS)
    .maybeSingle()

  if (error) throw error
  return (await withCommentCounts([mapThread(data)]))[0]
}

//SQL: update forum_threads set status = 'archived' where id = {id}
export async function archiveThread(id) {
  const { data, error } = await supabase
    .from('forum_threads')
    .update({ status: 'archived', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: select ... from forum_comments where thread_id = {threadId} and status = 'published' order by created_at asc
export async function getComments(threadId) {
  const { data, error } = await supabase
    .from('forum_comments')
    .select(COMMENT_FIELDS)
    .eq('thread_id', threadId)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  if (error) throw error
  return mapComments(data)
}

//SQL: select ... from forum_comments where id = {id}
export async function getCommentById(id) {
  const { data, error } = await supabase
    .from('forum_comments')
    .select(COMMENT_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapComment(data) : null
}

//SQL: insert into forum_comments (thread_id, parent_id, author_id, body) values (...)
export async function createComment({ threadId, parentId, body, authorId }) {
  const { data, error } = await supabase
    .from('forum_comments')
    .insert({ thread_id: threadId, parent_id: parentId ?? null, author_id: authorId, body })
    .select(COMMENT_FIELDS)
    .single()

  if (error) throw error
  return mapComment(data)
}

//Komentar sendiri diarsipkan (masuk Sampah), bukan langsung dihapus
//SQL: update forum_comments set status = 'archived', archived_at = now() where id = {id} and author_id = {authorId}
export async function deleteOwnComment(id, authorId) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('forum_comments')
    .update({ status: 'archived', archived_at: now, updated_at: now })
    .eq('id', id)
    .eq('author_id', authorId)
    .neq('status', 'archived')
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: insert into forum_likes (thread_id, user_id) values (...) on conflict do nothing
export async function addLike(threadId, userId) {
  const { error } = await supabase
    .from('forum_likes')
    .upsert({ thread_id: threadId, user_id: userId }, { onConflict: 'thread_id,user_id', ignoreDuplicates: true })

  if (error) throw error
}

//SQL: delete from forum_likes where thread_id = {threadId} and user_id = {userId}
export async function removeLike(threadId, userId) {
  const { error } = await supabase
    .from('forum_likes')
    .delete()
    .eq('thread_id', threadId)
    .eq('user_id', userId)

  if (error) throw error
}

//SQL: select 1 from forum_likes where thread_id = {threadId} and user_id = {userId}
export async function hasLiked(threadId, userId) {
  const { data, error } = await supabase
    .from('forum_likes')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

//SQL: select ... from forum_threads [where status = {status}] order by created_at desc
export async function getAllThreads({ page, limit, status }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('forum_threads')
    .select(THREAD_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) throw error
  return { data: await withCommentCounts(mapThreads(data)), count }
}

//SQL: update forum_threads set status = {status} where id = {id}
export async function setThreadStatus(id, status) {
  const { data, error } = await supabase
    .from('forum_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(THREAD_FIELDS)
    .maybeSingle()

  if (error) throw error
  return (await withCommentCounts([mapThread(data)]))[0]
}

//SQL: update forum_comments set status = 'hidden' where id = {id}
export async function hideComment(id) {
  const { data, error } = await supabase
    .from('forum_comments')
    .update({ status: 'hidden', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, thread_id')
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: insert into moderation_logs (admin_id, action, target_type, target_id, note) values (...)
export async function addModerationLog({ adminId, action, targetType, targetId, note }) {
  const { error } = await supabase
    .from('moderation_logs')
    .insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, note: note ?? null })

  if (error) throw error
}

//SQL: select ... from moderation_logs order by created_at desc limit {limit} offset {offset}
export async function getModerationLogs({ page, limit }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('moderation_logs')
    .select('id, action, target_type, target_id, note, created_at, profiles(username, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const logs = []
  for (const row of data) {
    logs.push({
      id: row.id,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      note: row.note,
      admin: authorName(row.profiles),
      created_at: row.created_at,
    })
  }
  return { data: logs, count }
}
