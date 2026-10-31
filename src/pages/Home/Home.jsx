import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import ServiciosCatalogo from '../../components/ServiciosCatalogo/ServiciosCatalogo'
import './Home.css'

export default function Home() {
  const { session } = useAuth()
  const [currentTournament, setCurrentTournament] = useState(null)
  const [liveMatch, setLiveMatch] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [previewLoaded, setPreviewLoaded] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadTournamentPreview() {
      const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id, name, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      let tournament = activeTournaments?.[0]
      if (!tournament) {
        const { data: latestTournaments } = await supabase
          .from('tournaments')
          .select('id, name, is_active, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        tournament = latestTournaments?.[0]
      }
      if (!tournament || !mounted) {
        if (mounted) setPreviewLoaded(true)
        return
      }

      const [teamsResult, matchesResult, standingsResult] = await Promise.all([
        supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('name'),
        supabase.from('bracket_matches').select('*').eq('tournament_id', tournament.id).order('round_number'),
        supabase.from('standings').select('*, teams(name,flag_url)').eq('tournament_id', tournament.id).order('pts', { ascending: false }),
      ])
      if (!mounted) return

      const tournamentMatches = matchesResult.data || []
      setCurrentTournament(tournament)
      setTeams(teamsResult.data || [])
      setMatches(tournamentMatches)
      setStandings(standingsResult.data || [])
      setPreviewLoaded(true)
      setLiveMatch(
        tournamentMatches.find((match) => match.status === 'en_juego')
        || tournamentMatches.find((match) => match.status === 'jugado')
        || tournamentMatches[0]
        || null,
      )
    }

    loadTournamentPreview()
    return () => { mounted = false }
  }, [])

  const t1 = teams.find((team) => team.id === liveMatch?.team1_id)
  const t2 = teams.find((team) => team.id === liveMatch?.team2_id)
  const miniMatches = matches.filter((match) => match.team1_id || match.team2_id).slice(0, 6)
  const miniStandings = [...standings]
    .sort((a, b) => b.pts - a.pts || ((b.gf || 0) - (b.gc || 0)) - ((a.gf || 0) - (a.gc || 0)))
    .slice(0, 5)

  function teamName(teamId) {
    return teams.find((team) => team.id === teamId)?.name || 'Por definir'
  }

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
          <img src={`${import.meta.env.BASE_URL}Favicon.jpg`} alt="Logo de Caribe Sports" />
        </div>
      </section>

      <section className="home-resumen" aria-labelledby="resumen-torneo">
          <div className="home-resumen__encabezado">
            <div>
              <p className="eyebrow">Torneo actual</p>
              <h2 id="resumen-torneo">{currentTournament?.name || 'Resumen del torneo'}</h2>
            </div>
            <Link className="btn small ghost" to="/torneos">Ver torneo completo</Link>
          </div>

          {currentTournament ? (
          <div className="home-resumen__grid">
            <article className="card home-mini-cuadro">
              <h3>Mini cuadro de cruces</h3>
              {miniMatches.length ? (
                <div className="mini-cruces">
                  {miniMatches.map((match) => (
                    <div className="mini-cruce" key={match.id}>
                      <span className="mini-cruce__ronda">{match.round_name || `Ronda ${match.round_number}`}</span>
                      <div className="mini-cruce__equipos"><span>{teamName(match.team1_id)}</span><strong>{match.team1_score ?? '—'}</strong></div>
                      <div className="mini-cruce__equipos"><span>{teamName(match.team2_id)}</span><strong>{match.team2_score ?? '—'}</strong></div>
                    </div>
                  ))}
                </div>
              ) : <p className="mini empty">Aún no hay cruces registrados.</p>}
            </article>

            <article className="card home-mini-tabla">
              <h3>Tabla de posiciones</h3>
              {miniStandings.length ? (
                <table>
                  <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>Pts</th></tr></thead>
                  <tbody>
                    {miniStandings.map((row, index) => (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td className="team-cell"><TeamBadge team={row.teams} size="sm" />{row.teams?.name || 'Equipo'}</td>
                        <td>{row.pj || 0}</td>
                        <td className="pts">{row.pts || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="mini empty">Aún no hay posiciones registradas.</p>}
            </article>
          </div>
          ) : (
            <div className="card home-resumen__vacio">
              {previewLoaded
                ? 'Aún no hay un torneo disponible para mostrar. Verifica que exista un torneo activo y que la migración pública de Supabase se haya ejecutado.'
                : 'Cargando el resumen del torneo…'}
            </div>
          )}
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
            <span className="home-live__title">{liveMatch.status === 'en_juego' ? 'EN VIVO' : 'ÚLTIMO CRUCE'}</span>
            <span className="home-live__round">{liveMatch.round_name}</span>
          </div>
          <div className="home-live__match">
            <div className="home-live__team"><TeamBadge team={t1} size="lg" /><div className="home-live__name">{t1.name}</div></div>
            <div className="home-live__score"><span>{liveMatch.team1_score ?? 0}</span><span className="home-live__sep">·</span><span>{liveMatch.team2_score ?? 0}</span></div>
            <div className="home-live__team"><TeamBadge team={t2} size="lg" /><div className="home-live__name">{t2.name}</div></div>
          </div>
          <Link className="btn small" to="/torneos">Ver cuadro completo →</Link>
        </section>
      )}

      {session && (
        <ServiciosCatalogo
          title="Servicios para tu cuenta"
          subtitle="Elige el servicio que te interese y escríbenos por WhatsApp para coordinar el precio y el pago."
        />
      )}
    </main>
  )
}
