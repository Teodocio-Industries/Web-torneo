import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import './Home.css'

export default function Home() {
  const { session } = useAuth()
  const [liveMatch, setLiveMatch] = useState(null)
  const [teams, setTeams] = useState([])

  useEffect(() => {
    let mounted = true
    async function loadLive() {
      const { data: m } = await supabase
        .from('bracket_matches')
        .select('*')
        .eq('status', 'en_juego')
        .order('round_number', { ascending: false })
        .limit(1)
      if (!mounted) return
      if (m && m.length) {
        const match = m[0]
        const { data: t } = await supabase.from('teams').select('*').eq('tournament_id', match.tournament_id)
        if (mounted) {
          setLiveMatch(match)
          setTeams(t || [])
        }
      } else {
        // Fallback to the most recent played match to always show something
        const { data: m2 } = await supabase
          .from('bracket_matches')
          .select('*')
          .order('round_number', { ascending: false })
          .limit(1)
        if (mounted && m2 && m2.length) {
          const match = m2[0]
          const { data: t } = await supabase.from('teams').select('*').eq('tournament_id', match.tournament_id)
          if (mounted) {
            setLiveMatch(match)
            setTeams(t || [])
          }
        }
      }
    }
    loadLive()
    return () => { mounted = false }
  }, [])

  const t1 = teams.find((t) => t.id === liveMatch?.team1_id)
  const t2 = teams.find((t) => t.id === liveMatch?.team2_id)

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
        <div className="home-hero__art" aria-hidden="true">
          <svg viewBox="0 0 200 200" width="200" height="200">
            <defs>
              <radialGradient id="ballGrad" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ff8a4d" />
                <stop offset="100%" stopColor="#ff6b21" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="86" fill="url(#ballGrad)" />
            <path d="M100 14 C 60 50 60 150 100 186" stroke="#0c1018" strokeWidth="3" fill="none" />
            <path d="M100 14 C 140 50 140 150 100 186" stroke="#0c1018" strokeWidth="3" fill="none" />
            <path d="M14 100 H 186" stroke="#0c1018" strokeWidth="3" fill="none" />
            <path d="M40 40 C 70 65 130 65 160 40" stroke="#0c1018" strokeWidth="3" fill="none" />
            <path d="M40 160 C 70 135 130 135 160 160" stroke="#0c1018" strokeWidth="3" fill="none" />
          </svg>
        </div>
      </section>

      {liveMatch && t1 && t2 && (
        <section className="home-live">
          <div className="home-live__head">
            <span className="home-live__dot" />
            <span className="home-live__title">
              {liveMatch.status === 'en_juego' ? 'EN VIVO' : 'ÚLTIMO CRUCE'}
            </span>
            <span className="home-live__round">{liveMatch.round_name}</span>
          </div>
          <div className="home-live__match">
            <div className="home-live__team">
              <TeamBadge team={t1} size="lg" />
              <div className="home-live__name">{t1.name}</div>
            </div>
            <div className="home-live__score">
              <span>{liveMatch.team1_score ?? 0}</span>
              <span className="home-live__sep">·</span>
              <span>{liveMatch.team2_score ?? 0}</span>
            </div>
            <div className="home-live__team">
              <TeamBadge team={t2} size="lg" />
              <div className="home-live__name">{t2.name}</div>
            </div>
          </div>
          <Link className="btn small" to="/torneos">Ver cuadro completo →</Link>
        </section>
      )}

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
