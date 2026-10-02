// Validaciones puras de archivos de imagen (sin dependencias, probables en Node).
// Solo imágenes rasterizadas. SVG queda fuera a propósito (puede contener scripts).
export const TIPOS_PERMITIDOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024 // 5 MB

/** Devuelve un mensaje de error en español si el archivo no es válido, o null si está bien. */
export function validarImagen(file) {
  if (!file) return 'Selecciona un archivo.'
  if (!TIPOS_PERMITIDOS[file.type]) return 'Formato no permitido. Usa una imagen JPG, PNG o WebP.'
  if (file.size > TAMANO_MAXIMO_BYTES) return 'La imagen pesa más de 5 MB. Reduce su tamaño e inténtalo de nuevo.'
  return null
}

/** Una URL de imagen externa solo se acepta si es https (evita contenido mixto y esquemas raros). */
export function esUrlImagenSegura(url) {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}