import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Home.css'

export default function Home() {
  const { session } = useAuth()
  return (
    <main className="home">
      <section className="home-hero">
        <div>
          <p className="eyebrow">Caribe Sports Events</p>
          <h1>La plataforma de análisis<br />profesional de baloncesto</h1>
          <p className="home-hero__desc">
            Cruces en vivo, tablas de posiciones y estadísticas de cada jugador,
            todo en un solo lugar.
          </p>
          <div className="home-hero__cta">
            <Link className="btn" to="/torneos">Ver torneos</Link>
            {!session && <Link className="btn ghost" to="/login">Iniciar sesión</Link>}
          </div>
        </div>
        <div className="home-hero__art">🏀</div>
      </section>

      <section className="home-block">
        <h2>Quiénes somos</h2>
        <p>Redefinimos la competición con análisis profesional y estadísticas en tiempo real.</p>
      </section>

      <section className="home-block home-roles">
        <h2>Un espacio para cada rol</h2>
        <div className="home-roles__grid">
          <div className="card">
            <span className="badge status-avanzo">Administrador</span>
            <p>Crea torneos, carga equipos, arma el cuadro, registra resultados y controla la tabla de posiciones.</p>
          </div>
          <div className="card">
            <span className="badge ok">Jugador</span>
            <p>Ve su ficha, sus estadísticas y si tiene alguna falta o sanción registrada por el administrador.</p>
          </div>
          <div className="card">
            <span className="badge status-en_juego">Usuario</span>
            <p>Sigue cualquier torneo, su cuadro de cruces y su tabla de posiciones en tiempo real.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
