/**
 * Defensa contra clickjacking.
 *
 * GitHub Pages no permite enviar la cabecera X-Frame-Options ni la directiva
 * CSP frame-ancestors, así que se hace por código: si la página se carga
 * dentro de un <iframe> de otro sitio, se oculta y se intenta salir del marco.
 * (La protección completa se obtiene poniendo Cloudflare delante del dominio;
 * ver docs/SEGURIDAD_Y_CUMPLIMIENTO.md.)
 */
export function protegerContraEnmarcado() {
  try {
    if (window.top === window.self) return
  } catch {
    // Acceder a window.top falló: estamos en un marco de otro origen.
  }
  document.documentElement.style.display = 'none'
  try {
    window.top.location = window.self.location
  } catch {
    // Sin permiso para navegar el marco superior: la página queda oculta.
  }
}