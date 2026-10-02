/**
 * Regla de visibilidad de los rangos (Content Package / Player Spotlight / Player Performance):
 *
 *  - Si la cuenta tiene al menos un rango asignado (pendiente o pagado), solo ve esos rangos.
 *  - Si no tiene ninguno, ve el catálogo completo.
 *  - Un rango "cancelado" cuenta como no asignado.
 *
 * Lógica pura (sin React ni Supabase) para poder probarla de forma aislada.
 */
export function asignacionesVigentes(asignaciones = []) {
  return asignaciones.filter((a) => a && a.status !== 'cancelado')
}

export function resolverRangos(tiers = [], asignaciones = []) {
  const vigentes = asignacionesVigentes(asignaciones)
  const porTier = new Map(vigentes.map((a) => [a.tier_id, a]))
  const activos = tiers.filter((t) => t.active !== false)
  const propios = activos.filter((t) => porTier.has(t.id))
  const tieneRango = propios.length > 0
  const visibles = tieneRango ? propios : activos
  return {
    tieneRango,
    visibles: visibles.map((tier) => ({ tier, asignacion: porTier.get(tier.id) || null })),
  }
}

export function soloDigitos(texto) {
  return String(texto ?? '').replace(/[^\d]/g, '')
}

/** Enlace de WhatsApp con mensaje precargado, o null si no hay número válido configurado. */
export function enlaceWhatsApp(numero, nombrePersona, nombreRango) {
  const digitos = soloDigitos(numero)
  if (digitos.length < 8) return null
  const mensaje = `Hola, soy ${nombrePersona || 'un usuario'}, vengo a que me den más información sobre este rango de *${nombreRango}*.`
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`
}

export function formatoCOP(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0)
}