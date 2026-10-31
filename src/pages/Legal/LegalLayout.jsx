import { Link } from 'react-router-dom'
import { CAMPOS_ETIQUETAS, FECHA_VIGENCIA, NEGOCIO, COMPLETAR, RUTAS_LEGALES, VERSION_POLITICAS, camposFaltantes } from '../../config/negocio'
import { useTitulo } from '../../lib/useTitulo'
import './Legal.css'

/** Muestra un dato del negocio; si todavía no se ha completado, lo resalta en amarillo. */
export function Neg({ campo }) {
  const valor = NEGOCIO[campo]
  const pendiente = !valor || String(valor).toUpperCase().includes(COMPLETAR)
  return pendiente ? <span className="dato-pendiente">[{CAMPOS_ETIQUETAS[campo] || campo}: COMPLETAR]</span> : <>{valor}</>
}

export default function LegalLayout({ titulo, resumen, children }) {
  useTitulo(titulo)
  const faltan = camposFaltantes()
  return (
    <main className="legal">
      <p className="eyebrow">Información legal</p>
      <h1>{titulo}</h1>
      <p className="legal__meta">Versión {VERSION_POLITICAS} · Vigente desde el {FECHA_VIGENCIA}</p>

      {faltan.length > 0 && (
        <div className="legal__aviso" role="note">
          <p>
            <strong>Documento en preparación.</strong> Aún faltan datos del titular del sitio:{' '}
            {faltan.map((k) => CAMPOS_ETIQUETAS[k]).join(', ')}. Se muestran resaltados en amarillo mientras se completan.
          </p>
        </div>
      )}

      {resumen && <div className="legal__resumen"><p><strong>En resumen:</strong> {resumen}</p></div>}

      {children}

      <nav className="legal__otras" aria-label="Otros documentos legales">
        <Link to={RUTAS_LEGALES.terminos}>Términos y condiciones</Link>
        <Link to={RUTAS_LEGALES.privacidad}>Política de privacidad</Link>
        <Link to={RUTAS_LEGALES.cookies}>Política de cookies</Link>
        <Link to={RUTAS_LEGALES.reembolsos}>Reembolsos y retracto</Link>
      </nav>
    </main>
  )
}