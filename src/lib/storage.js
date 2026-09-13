import { supabase } from './supabaseClient'

const BUCKET = 'mundial-media'

export async function uploadFile(file, folder) {
  const path = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]+/g, '_')}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
