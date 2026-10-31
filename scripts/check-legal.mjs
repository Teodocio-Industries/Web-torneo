// Lista los datos legales del negocio que aún dicen COMPLETAR.
// Uso: npm run check:legal            (solo avisa)
//      npm run check:legal -- --strict (falla si falta algo; útil antes de publicar)
import { NEGOCIO, CAMPOS_ETIQUETAS, camposFaltantes } from '../src/config/negocio.js'

const faltan = camposFaltantes(NEGOCIO)
if (faltan.length === 0) {
  console.log('✔ Datos legales completos.')
} else {
  const lista = faltan.map((k) => CAMPOS_ETIQUETAS[k]).join(', ')
  console.warn(`⚠ Faltan datos legales en src/config/negocio.js: ${lista}`)
  console.warn('::warning title=Datos legales pendientes::' + lista)
  if (process.argv.includes('--strict')) process.exit(1)
}
