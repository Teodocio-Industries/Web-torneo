import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverRangos, enlaceWhatsApp, soloDigitos } from '../src/lib/tiers.js'
import { registrarFallo, segundosRestantes, reiniciar, MAX_LIBRES, VENTANA_MS, BLOQUEO_BASE_MS, BLOQUEO_MAX_MS } from '../src/lib/loginGuard.js'
import { validarImagen, esUrlImagenSegura } from '../src/lib/validacionImagen.js'
import { camposFaltantes } from '../src/config/negocio.js'

const tiers = [
  { id: 'a', key: 'content_package', active: true },
  { id: 'b', key: 'player_spotlight', active: true },
  { id: 'c', key: 'player_performance', active: true },
  { id: 'd', key: 'oculto', active: false },
]

test('sin rango: ve los tres rangos activos', () => {
  const r = resolverRangos(tiers, [])
  assert.equal(r.tieneRango, false)
  assert.deepEqual(r.visibles.map((v) => v.tier.id), ['a', 'b', 'c'])
})
test('con un rango: solo ve el suyo', () => {
  const r = resolverRangos(tiers, [{ tier_id: 'b', status: 'pendiente', price: 100 }])
  assert.equal(r.tieneRango, true)
  assert.deepEqual(r.visibles.map((v) => v.tier.id), ['b'])
  assert.equal(r.visibles[0].asignacion.price, 100)
})
test('con dos rangos (uno pagado): ve ambos', () => {
  const r = resolverRangos(tiers, [{ tier_id: 'a', status: 'pagado' }, { tier_id: 'c', status: 'pendiente' }])
  assert.deepEqual(r.visibles.map((v) => v.tier.id), ['a', 'c'])
})
test('rango cancelado cuenta como sin rango', () => {
  const r = resolverRangos(tiers, [{ tier_id: 'a', status: 'cancelado' }])
  assert.equal(r.tieneRango, false)
  assert.equal(r.visibles.length, 3)
})
test('rango asignado a un tier inactivo no deja la vista vacía', () => {
  const r = resolverRangos(tiers, [{ tier_id: 'd', status: 'pendiente' }])
  assert.equal(r.tieneRango, false)
  assert.equal(r.visibles.length, 3)
})

test('WhatsApp: solo dígitos, mensaje codificado y null sin número', () => {
  assert.equal(soloDigitos('+57 300-123 4567'), '573001234567')
  const url = enlaceWhatsApp('+57 300 123 4567', 'Ana', 'Content Package')
  assert.ok(url.startsWith('https://wa.me/573001234567?text='))
  assert.ok(url.includes(encodeURIComponent('Content Package')))
  assert.equal(enlaceWhatsApp('', 'Ana', 'X'), null)
  assert.equal(enlaceWhatsApp('123', 'Ana', 'X'), null)
})

function memoria() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }
}
test('freno de login: se bloquea al llegar al límite y crece exponencialmente', () => {
  const al = memoria(); const t0 = 1_000_000
  for (let i = 1; i < MAX_LIBRES; i++) assert.equal(registrarFallo(t0 + i, al), 0)
  assert.equal(registrarFallo(t0 + 10, al), BLOQUEO_BASE_MS / 1000)
  assert.ok(segundosRestantes(t0 + 11, al) > 0)
  assert.equal(registrarFallo(t0 + 20, al), (BLOQUEO_BASE_MS * 2) / 1000)
})
test('freno de login: tope máximo, expira y se reinicia', () => {
  const al = memoria(); const t0 = 5_000_000
  let ultimo = 0
  for (let i = 0; i < 30; i++) ultimo = registrarFallo(t0 + i, al)
  assert.equal(ultimo, BLOQUEO_MAX_MS / 1000)
  assert.equal(segundosRestantes(t0 + BLOQUEO_MAX_MS + 1000, al), 0)
  reiniciar(al)
  assert.equal(segundosRestantes(t0 + 5, al), 0)
})
test('freno de login: la ventana vieja se descarta', () => {
  const al = memoria(); const t0 = 9_000_000
  for (let i = 0; i < MAX_LIBRES - 1; i++) registrarFallo(t0 + i, al)
  assert.equal(registrarFallo(t0 + VENTANA_MS + 10, al), 0)
})
test('freno de login: almacenamiento corrupto o ausente no rompe', () => {
  const malo = { getItem: () => '{no-json', setItem() {}, removeItem() {} }
  assert.equal(segundosRestantes(1, malo), 0)
  assert.equal(registrarFallo(1, null), 0)
})

test('validación de imágenes', () => {
  assert.match(validarImagen({ type: 'image/svg+xml', size: 10 }), /Formato/)
  assert.match(validarImagen({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/)
  assert.equal(validarImagen({ type: 'image/webp', size: 1000 }), null)
  assert.equal(esUrlImagenSegura('https://x.com/a.png'), true)
  assert.equal(esUrlImagenSegura('http://x.com/a.png'), false)
  assert.equal(esUrlImagenSegura('javascript:alert(1)'), false)
})

test('datos legales: detecta campos pendientes y acepta completos', () => {
  assert.equal(camposFaltantes({}).length, 7)
  const completo = { nombreComercial: 'x', razonSocial: 'x', nit: '1', direccion: 'x', email: 'a@b.co', telefono: '3', responsableDatos: 'x' }
  assert.deepEqual(camposFaltantes(completo), [])
  assert.deepEqual(camposFaltantes({ ...completo, nit: 'COMPLETAR' }), ['nit'])
})
