import { supabase } from '../config/supabase.js'

//SQL: select id, full_name, username, whatsapp, created_at from profiles where id = {id}
export async function getProfile(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, whatsapp, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

//SQL: select id from profiles where username = {username} and id <> {id}
//Dipakai untuk memastikan username belum dipakai orang lain
export async function isUsernameTakenByOther(username, id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', id)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

//SQL: update profiles set full_name = ..., username = ..., whatsapp = ... where id = {id}
export async function updateProfile(id, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', id)
    .select('id, full_name, username, whatsapp, created_at')
    .maybeSingle()

  if (error) throw error
  return data
}

//Salin data ke metadata akun supaya navbar (yang membaca metadata) ikut berubah.
//Metadata lama tetap dipertahankan, hanya field ini yang diganti
export async function syncAuthMetadata(id, fields) {
  const { data, error } = await supabase.auth.admin.getUserById(id)
  if (error) throw error

  const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: { ...data.user.user_metadata, ...fields },
  })
  if (updateError) throw updateError
}
