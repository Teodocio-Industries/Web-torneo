import { supabase } from './supabaseClient'
import { TIPOS_PERMITIDOS, TAMANO_MAXIMO_BYTES, validarImagen, esUrlImagenSegura } from './validacionImagen'

const BUCKET = 'mundial-media'

export { TIPOS_PERMITIDOS, TAMANO_MAXIMO_BYTES, validarImagen, esUrlImagenSegura }

export async function uploadFile(file, folder) {
  const problema = validarImagen(file)
  if (problema) throw new Error(problema)
  // Nombre aleatorio: no se conserva el nombre original (puede traer datos personales) ni se sobrescribe nada.
  const path = `${folder}/${crypto.randomUUID()}.${TIPOS_PERMITIDOS[file.type]}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}