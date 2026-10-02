import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { RUTAS_LEGALES, TURNSTILE_SITE_KEY } from '../../config/negocio'
import { reiniciar, registrarFallo, segundosRestantes } from '../../lib/loginGuard'
import { useTitulo } from '../../lib/useTitulo'
import Turnstile from '../../components/Turnstile/Turnstile'
import './Login.css'

/**
 * Traduce el error de Supabase a un mensaje seguro. Nunca se distingue entre
 * "el correo no existe" y "la contraseña es incorrecta" (evita enumerar cuentas).
 */
function interpretarError(err) {
  const msg = String(err?.message || '').toLowerCase()
  const codigo = String(err?.code || '')
  if (err?.status === 429 || codigo === 'over_request_rate_limit' || msg.includes('rate limit')) {
    return { texto: 'Demasiados intentos desde tu conexión. Espera unos minutos e inténtalo de nuevo.', cuenta: false }
  }
  if (msg.includes('captcha')) {
    return { texto: 'No pudimos verificar que eres una persona. Vuelve a marcar la verificación e inténtalo de nuevo.', cuenta: false }
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || err?.name === 'AuthRetryableFetchError') {
    return { texto: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', cuenta: false }
  }
  return { texto: 'Correo o contraseña incorrectos.', cuenta: true }
}

export default function Login() {
  useTitulo('Iniciar sesión')
  const { login } = useAuth()
  const navigate = useNavigate()
  const idCorreo = useId()
  const idClave = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [trampa, setTrampa] = useState('') // campo señuelo para bots: una persona nunca lo ve ni lo llena
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [bloqueo, setBloqueo] = useState(() => segundosRestantes())
  const [captchaToken, setCaptchaToken] = useState('')
  const [reinicioCaptcha, setReinicioCaptcha] = useState(0)
  const [captchaFallo, setCaptchaFallo] = useState(false)
  const temporizador = useRef(null)

  // Cuenta regresiva del bloqueo.
  useEffect(() => {
    if (bloqueo <= 0) return undefined
    temporizador.current = setInterval(() => setBloqueo(segundosRestantes()), 1000)
    return () => clearInterval(temporizador.current)
  }, [bloqueo > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const requiereCaptcha = Boolean(TURNSTILE_SITE_KEY)
  const bloqueado = bloqueo > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy || segundosRestantes() > 0) return
    setError(null)

    if (trampa) {
      // Un bot rellenó el campo oculto: se simula un fallo sin llamar al servidor.
      setBloqueo(registrarFallo())
      setError('Correo o contraseña incorrectos.')
      return
    }
    if (requiereCaptcha && !captchaToken) {
      setError('Completa la verificación de seguridad antes de continuar.')
      return
    }

    setBusy(true)
    try {
      await login(email.trim(), password, captchaToken || undefined)
      reiniciar()
      navigate('/torneos')
    } catch (err) {
      const { texto, cuenta } = interpretarError(err)
      if (cuenta) setBloqueo(registrarFallo())
      setError(texto)
      setReinicioCaptcha((n) => n + 1) // el token de Turnstile es de un solo uso
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand__icon" aria-hidden="true">🏀</div>
          <h1>Caribe Sports</h1>
          <p className="mini">Inicia sesión para ver los torneos</p>
        </div>

        <form onSubmit={handleSubmit} noValidate={false}>
          {error && <div className="error-msg" role="alert">{error}</div>}
          {bloqueado && (
            <p className="login-bloqueo">
              Por seguridad, espera <strong>{bloqueo} s</strong> antes de volver a intentarlo.
            </p>
          )}

          <div className="field">
            <label htmlFor={idCorreo}>Correo</label>
            <input
              id={idCorreo}
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div className="field">
            <label htmlFor={idClave}>Contraseña</label>
            <input
              id={idClave}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Señuelo anti-bots: oculto para personas y para lectores de pantalla. */}
          <div className="login-trampa" aria-hidden="true">
            <label>
              No llenes este campo
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
            </label>
          </div>

          {requiereCaptcha && (
            <div className="field">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onToken={setCaptchaToken}
                onError={() => setCaptchaFallo(true)}
                reiniciar={reinicioCaptcha}
              />
              {captchaFallo && (
                <p className="mini" role="alert">
                  No se pudo cargar la verificación de seguridad. Desactiva bloqueadores de contenido para este sitio y recarga la página.
                </p>
              )}
            </div>
          )}

          <button className="btn" type="submit" disabled={busy || bloqueado}>
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-legal">
          Al iniciar sesión aceptas los <Link to={RUTAS_LEGALES.terminos}>términos y condiciones</Link> y el tratamiento de tus datos según la{' '}
          <Link to={RUTAS_LEGALES.privacidad}>política de privacidad</Link>. Guardamos en tu navegador solo lo necesario para mantener tu sesión y proteger el acceso (
          <Link to={RUTAS_LEGALES.cookies}>política de cookies</Link>).
        </p>
        <p className="login-legal">¿No tienes cuenta? Las cuentas las crea la organización del torneo.</p>
      </div>
    </main>
  )
}