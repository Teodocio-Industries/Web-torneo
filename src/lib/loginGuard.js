/**
 * Freno de intentos fallidos de inicio de sesión (lado cliente).
 *
 * Tras MAX_LIBRES fallos seguidos dentro de la ventana, el formulario se bloquea
 * un tiempo que se duplica con cada fallo adicional (30 s, 60 s, 2 min… hasta 15 min).
 *
 * ⚠️ Esto es una barrera de usabilidad y disuasión: quien ataca por API la ignora.
 * La defensa real contra fuerza bruta está en el servidor: límites de Supabase Auth
 * + CAPTCHA (Turnstile). Ver docs/SEGURIDAD_Y_CUMPLIMIENTO.md.
 */
export const CLAVE = 'cs_login_guard'
export const MAX_LIBRES = 4
export const VENTANA_MS = 15 * 60 * 1000
export const BLOQUEO_BASE_MS = 30 * 1000
export const BLOQUEO_MAX_MS = 15 * 60 * 1000

function almacenamientoPorDefecto() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function leer(almacen) {
  try {
    const crudo = almacen?.getItem(CLAVE)
    if (!crudo) return { fallos: 0, desde: 0, hasta: 0 }
    const e = JSON.parse(crudo)
    return {
      fallos: Number.isFinite(e.fallos) ? e.fallos : 0,
      desde: Number.isFinite(e.desde) ? e.desde : 0,
      hasta: Number.isFinite(e.hasta) ? e.hasta : 0,
    }
  } catch {
    return { fallos: 0, desde: 0, hasta: 0 }
  }
}

function guardar(almacen, estado) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    /* almacenamiento no disponible: el freno simplemente no persiste */
  }
}

/** Segundos que faltan para poder reintentar (0 si no hay bloqueo). */
export function segundosRestantes(ahora = Date.now(), almacen = almacenamientoPorDefecto()) {
  const { hasta } = leer(almacen)
  return hasta > ahora ? Math.ceil((hasta - ahora) / 1000) : 0
}

/** Registra un intento fallido y devuelve los segundos de bloqueo resultantes (0 si aún no se bloquea). */
export function registrarFallo(ahora = Date.now(), almacen = almacenamientoPorDefecto()) {
  let { fallos, desde, hasta } = leer(almacen)
  if (!desde || ahora - desde > VENTANA_MS) {
    fallos = 0
    desde = ahora
    hasta = 0
  }
  fallos += 1
  if (fallos >= MAX_LIBRES) {
    const ms = Math.min(BLOQUEO_BASE_MS * 2 ** (fallos - MAX_LIBRES), BLOQUEO_MAX_MS)
    hasta = ahora + ms
  }
  guardar(almacen, { fallos, desde, hasta })
  return hasta > ahora ? Math.ceil((hasta - ahora) / 1000) : 0
}

export function reiniciar(almacen = almacenamientoPorDefecto()) {
  try {
    almacen?.removeItem(CLAVE)
  } catch {
    /* sin almacenamiento */
  }
}