import { supabase } from '../config/supabase.js'

const LIST_FIELDS = 'id, title, slug, cover_image_url, category_id, author_id, status, published_at, created_at, content_categories(name), profiles(full_name)'
const DETAIL_FIELDS = 'id, title, slug, body, cover_image_url, gallery, category_id, author_id, status, published_at, created_at, updated_at, content_categories(name), profiles(full_name)'

const CONTENT_FIELDS = [
  'title', 'body', 'cover_image_url', 'gallery',
  'category_id', 'status', 'published_at',
]

const CATEGORY_FIELDS = ['name']

const CONTENT_KEYS = [
  'id', 'title', 'slug', 'body', 'cover_image_url', 'gallery',
  'category_id', 'author_id', 'status', 'published_at', 'created_at', 'updated_at',
]

//Ambil hanya field yang diizinkan. String kosong menjadi null
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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'berita'
}

//Cek bentrok slug, lalu tambah -2, -3, dan seterusnya
async function makeUniqueSlug(table, title) {
  const base = slugify(title)
  let slug = base
  let number = 2

  while (true) {
    //SQL: select id from {table} where slug = {slug}
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) return slug

    slug = `${base}-${number}`
    number += 1
  }
}

//Ratakan relasi kategori dan penulis supaya responsnya satu objek
function mapContent(row) {
  if (!row) return null

  const result = {}
  for (const key of CONTENT_KEYS) {
    if (row[key] !== undefined) result[key] = row[key]
  }

  result.category = row.content_categories ? row.content_categories.name : null
  result.author = row.profiles ? row.profiles.full_name : null
  return result
}

function mapContents(rows) {
  const result = []
  for (const row of rows) result.push(mapContent(row))
  return result
}

//SQL: select ... from contents where status = 'published' and published_at <= now() order by published_at desc
export async function getPublishedContents({ page, limit, q }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('contents')
    .select(LIST_FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, to)

  if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`)

  const { data, count, error } = await query
  if (error) throw error
  return { data: mapContents(data), count }
}

//SQL: select ... from contents where slug = {slug} and status = 'published' and published_at <= now()
export async function getPublishedContentBySlug(slug) {
  const { data, error } = await supabase
    .from('contents')
    .select(DETAIL_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()

  if (error) throw error
  return mapContent(data)
}

//SQL: select id, name, slug from content_categories order by name
export async function getCategories() {
  const { data, error } = await supabase
    .from('content_categories')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

//SQL: select ... from contents order by created_at desc
export async function getAllContents({ page, limit, status }) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('contents')
    .select(LIST_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) throw error
  return { data: mapContents(data), count }
}

//SQL: select ... from contents where id = {id}
export async function getContentById(id) {
  const { data, error } = await supabase
    .from('contents')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return mapContent(data)
}

//SQL: insert into contents (...) values (...)
export async function createContent(body, authorId) {
  const fields = pickFields(body, CONTENT_FIELDS)
  fields.slug = await makeUniqueSlug('contents', body.title)
  fields.author_id = authorId

  if (fields.status === 'published' && !fields.published_at) {
    fields.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('contents')
    .insert(fields)
    .select(DETAIL_FIELDS)
    .single()

  if (error) throw error
  return mapContent(data)
}

//SQL: update contents set ... where id = {id}
export async function updateContent(id, body) {
  const fields = pickFields(body, CONTENT_FIELDS)
  fields.updated_at = new Date().toISOString()

  //Tanggal terbit diisi sekali, saat pertama kali status menjadi published
  if (fields.status === 'published' && !fields.published_at) {
    const current = await getContentById(id)
    if (!current) return null
    if (current.published_at) delete fields.published_at
    else fields.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('contents')
    .update(fields)
    .eq('id', id)
    .select(DETAIL_FIELDS)
    .maybeSingle()

  if (error) throw error
  return mapContent(data)
}

//SQL: update contents set status = 'archived' where id = {id}
//atau delete from contents where id = {id} kalau permanent
export async function deleteContent(id, { permanent = false } = {}) {
  const query = permanent
    ? supabase.from('contents').delete().eq('id', id)
    : supabase.from('contents').update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  return data
}

//SQL: insert into content_categories (name, slug) values (...)
export async function createCategory(body) {
  const fields = pickFields(body, CATEGORY_FIELDS)
  fields.slug = await makeUniqueSlug('content_categories', body.name)

  const { data, error } = await supabase
    .from('content_categories')
    .insert(fields)
    .select('id, name, slug')
    .single()

  if (error) throw error
  return data
}

//SQL: update content_categories set name = {name} where id = {id}
export async function updateCategory(id, body) {
  const fields = pickFields(body, CATEGORY_FIELDS)
  fields.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('content_categories')
    .update(fields)
    .eq('id', id)
    .select('id, name, slug')
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: delete from content_categories where id = {id}
export async function deleteCategory(id) {
  const { data, error } = await supabase
    .from('content_categories')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}
