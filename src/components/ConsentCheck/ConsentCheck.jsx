import { useId } from 'react'
import { Link } from 'react-router-dom'
import { RUTAS_LEGALES } from '../../config/negocio'

/**
 * Casilla de consentimiento accesible (etiqueta asociada, operable con teclado).
 * `children` es el texto de la declaración; los enlaces legales los pone quien la usa.
 */
export default function ConsentCheck({ checked, onChange, children, required = true }) {
  const id = useId()
  return (
    <div className="consent-check">
      <input id={id} type="checkbox" checked={checked} required={required} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{children}</label>
    </div>
  )
}

export function EnlaceLegal({ a, children }) {
  return (
    <Link to={RUTAS_LEGALES[a]} target="_blank" rel="noopener">
      {children}
    </Link>
  )
}