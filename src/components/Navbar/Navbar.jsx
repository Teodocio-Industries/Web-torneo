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
        <img className="marca__logo" src="/Favicon.jpg" alt="Caribe Sports" />
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
