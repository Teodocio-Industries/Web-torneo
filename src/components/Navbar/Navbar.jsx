import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { session, profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="barra-superior">
      <NavLink className="marca" to="/">
        <span className="marca__ball" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="12" cy="12" r="11" fill="#ff6b21" />
            <path d="M12 1 C 8 6 8 18 12 23" stroke="#0c1018" strokeWidth="1" fill="none" />
            <path d="M12 1 C 16 6 16 18 12 23" stroke="#0c1018" strokeWidth="1" fill="none" />
            <path d="M1 12 H 23" stroke="#0c1018" strokeWidth="1" fill="none" />
          </svg>
        </span>
        <span className="marca__name">Caribe Sports</span>
      </NavLink>
      <nav className="navegacion">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/torneos">Torneos</NavLink>
        {session && <NavLink to="/jugadores">Jugadores</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="sesion">
        {session ? (
          <>
            <span className="usuario-pill">
              {profile?.full_name}
              <span className={`rol rol-${profile?.role}`}>{profile?.role}</span>
            </span>
            <button className="btn small ghost" onClick={handleLogout}>Salir</button>
          </>
        ) : (
          <NavLink className="btn small" to="/login">Iniciar sesión</NavLink>
        )}
      </div>
    </header>
  )
}
