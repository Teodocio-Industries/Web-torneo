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
          <h1 className="home-hero__brand">Caribe <span>Sports</span></h1>
          <div className="home-hero__cta">
            <Link className="btn" to="/torneos">Ver torneos</Link>
            {!session && <Link className="btn ghost" to="/login">Iniciar sesión</Link>}
          </div>
        </div>
        <div className="home-hero__art">
          <img src={`${import.meta.env.BASE_URL}Favicon.jpg`} alt="Caribe Sports" />
        </div>
      </section>

      <section className="home-block">
        <p className="eyebrow">Caribe Sports</p>
        <h2>Quiénes somos</h2>
        <p className="home-block__lead">Eventos deportivos que conectan, compiten y dejan huella.</p>
        <p>Organización, estadísticas y cobertura digital para llevar cada torneo a otro nivel.</p>
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