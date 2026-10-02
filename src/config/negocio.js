/**
 * Datos legales del negocio.
 *
 * ⚠️ COMPLETAR ANTES DE PUBLICAR. La ley colombiana exige que quien vende por
 * internet se identifique (nombre o razón social, NIT, dirección y medios de
 * contacto: Ley 1480 de 2011, art. 50 y Circular Única de la SIC) y que la
 * política de datos indique quién es el responsable del tratamiento
 * (Ley 1581 de 2012).
 *
 * Mientras un campo diga "COMPLETAR", las páginas legales lo muestran
 * resaltado para que no pase desapercibido. `npm run check:legal` lista lo
 * que falta.
 */
export const COMPLETAR = 'COMPLETAR'

export const NEGOCIO = {
  nombreComercial: 'Caribe Sports',
  // Persona natural (nombre completo) o sociedad (razón social completa, p. ej. "Caribe Sports S.A.S.").
  razonSocial: COMPLETAR,
  // NIT (con dígito de verificación) o cédula, tal como aparece en el RUT.
  nit: COMPLETAR,
  // Dirección física de notificaciones (ciudad y departamento incluidos).
  direccion: COMPLETAR,
  // Correo donde se reciben peticiones, quejas, reclamos y solicitudes de datos personales.
  email: COMPLETAR,
  // Teléfono o WhatsApp público de atención al cliente.
  telefono: COMPLETAR,
  // Persona o área que atiende solicitudes de datos personales (puede ser el mismo titular del negocio).
  responsableDatos: COMPLETAR,
}

// Campos sin los cuales las páginas legales quedan incompletas.
export const CAMPOS_OBLIGATORIOS = Object.keys(NEGOCIO)

export const CAMPOS_ETIQUETAS = {
  nombreComercial: 'Nombre comercial',
  razonSocial: 'Nombre completo o razón social',
  nit: 'NIT o cédula',
  direccion: 'Dirección de notificaciones',
  email: 'Correo de contacto',
  telefono: 'Teléfono / WhatsApp',
  responsableDatos: 'Responsable de datos personales',
}

export function camposFaltantes(negocio = NEGOCIO) {
  return CAMPOS_OBLIGATORIOS.filter((k) => !negocio[k] || String(negocio[k]).toUpperCase().includes(COMPLETAR))
}

// Versión y fecha de las políticas. Cambia ambas cada vez que modifiques un texto legal.
export const VERSION_POLITICAS = '2026-10-01'
export const FECHA_VIGENCIA = '1 de octubre de 2026'

// Rutas de las páginas legales (HashRouter).
export const RUTAS_LEGALES = {
  privacidad: '/privacidad',
  terminos: '/terminos',
  cookies: '/cookies',
  reembolsos: '/reembolsos',
}

// Cloudflare Turnstile (anti-bots del formulario de acceso). Solo se carga si hay clave.
export const TURNSTILE_SITE_KEY = (import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY) || ''