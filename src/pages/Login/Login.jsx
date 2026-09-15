import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

const DEMO_ACCOUNTS = [
  { email: 'admin@mundial2026.com', pass: 'Admin2026!', role: 'admin', label: 'Administrador' },
  { email: 'jugador1@mundial2026.com', pass: 'Jugador2026!', role: 'jugador', label: 'Jugador de prueba' },
  { email: 'jugador2@mundial2026.com', pass: 'Jugador2026!', role: 'jugador', label: 'Jugador (con sanción)' },
  { email: 'usuario@mundial2026.com', pass: 'Usuario2026!', role: 'usuario', label: 'Usuario normal' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
      navigate('/torneos')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand__icon">🏀</div>
          <h1>Caribe Sports Events</h1>
          <p className="mini">Inicia sesión para ver los torneos</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label>Correo</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>

        <details className="demo-box">
          <summary>Cuentas de prueba</summary>
          <div className="demo-list">
            {DEMO_ACCOUNTS.map((a) => (
              <div className="demo-item" key={a.email}>
                <div>
                  <span className={`rol rol-${a.role}`}>{a.role}</span>
                  <div className="mini">{a.label}</div>
                  <code>{a.email} / {a.pass}</code>
                </div>
                <button type="button" onClick={() => { setEmail(a.email); setPassword(a.pass) }}>Usar</button>
              </div>
            ))}
          </div>
        </details>
      </div>
    </main>
  )
}
