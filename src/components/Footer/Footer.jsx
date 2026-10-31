import { Link } from 'react-router-dom'
import { NEGOCIO, COMPLETAR, RUTAS_LEGALES } from '../../config/negocio'
import './Footer.css'

function Dato({ etiqueta, valor }) {
  const pendiente = !valor || String(valor).toUpperCase().includes(COMPLETAR)
  return (
    <div>
      <dt>{etiqueta}</dt>
      <dd className={pendiente ? 'dato-pendiente' : undefined}>{pendiente ? '[COMPLETAR]' : valor}</dd>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="pie">
      <div className="pie__inner">
        <div className="pie__datos">
          <p className="pie__marca">{NEGOCIO.nombreComercial}</p>
          <dl>
            <Dato etiqueta="Titular" valor={NEGOCIO.razonSocial} />
            <Dato etiqueta="NIT" valor={NEGOCIO.nit} />
            <Dato etiqueta="Dirección" valor={NEGOCIO.direccion} />
            <Dato etiqueta="Correo" valor={NEGOCIO.email} />
            <Dato etiqueta="Teléfono" valor={NEGOCIO.telefono} />
          </dl>
        </div>
        <nav className="pie__enlaces" aria-label="Información legal">
          <Link to={RUTAS_LEGALES.terminos}>Términos y condiciones</Link>
          <Link to={RUTAS_LEGALES.privacidad}>Política de privacidad</Link>
          <Link to={RUTAS_LEGALES.cookies}>Política de cookies</Link>
          <Link to={RUTAS_LEGALES.reembolsos}>Reembolsos y retracto</Link>
        </nav>
      </div>
      <p className="pie__copy">© {new Date().getFullYear()} {NEGOCIO.nombreComercial}. Todos los derechos reservados.</p>
    </footer>
  )
}