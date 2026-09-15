import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import Bracket from '../../components/Bracket/Bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import TournamentStats from '../../components/TournamentStats/TournamentStats'
import { useAuth } from '../../context/AuthContext'
import './Torneos.css'

export default function Torneos() {
  const { myPlayers } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('bracket')
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTournaments = useCallback(async () => {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
    setTournaments(data || [])
    setSelectedId((prev) => prev || (data && data[0] ? data[0].id : null))
    setLoading(false)
  }, [])

  const loadDetail = useCallback(async (tid) => {
    if (!tid) return
    const [teamsRes, matchesRes, standingsRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('tournament_id', tid).order('name'),
      supabase.from('bracket_matches').select('*').eq('tournament_id', tid).order('round_number'),
      supabase.from('standings').select('*, teams(name,flag_url)').eq('tournament_id', tid).order('group_name').order('pts', { ascending: false }),
      supabase.from('players').select('*, teams(name,flag_url)').eq('tournament_id', tid).order('full_name'),
    ])
    setTeams(teamsRes.data || [])
    setMatches(matchesRes.data || [])
    setStandings(standingsRes.data || [])
    setPlayers(playersRes.data || [])
  }, [])

  useEffect(() => { loadTournaments() }, [loadTournaments])
  useEffect(() => { loadDetail(selectedId) }, [selectedId, loadDetail])

  // Tiempo real: cualquier cambio hecho por el admin se refleja para todos al instante.
  useRealtimeRefresh(
    ['teams', 'bracket_matches', 'standings', 'players'],
    () => loadDetail(selectedId),
    [selectedId, loadDetail]
  )
  useRealtimeRefresh(['tournaments'], loadTournaments, [loadTournaments])

  const selected = tournaments.find((t) => t.id === selectedId)
  const myTeamId = myPlayers.find((mp) => mp.tournament_id === selectedId)?.team_id || null
  const groups = [...new Set(standings.map((s) => s.group_name))]

  if (loading) return <div className="loading-screen">Cargando torneos…</div>

  return (
    <main className="torneos-page">
      <div className="page">
        <section className="torneos-encabezado">
          <p className="eyebrow">Caribe Sports Events</p>
          <h1>Torneos</h1>
          <p className="mini">Elige un torneo para ver su cuadro de cruces, tabla y estadísticas en vivo.</p>
        </section>

        {tournaments.length === 0 ? (
          <div className="empty">Todavía no hay torneos creados.</div>
        ) : (
          <>
            <div className="lista-torneos">
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  className={`tarjeta-torneo ${t.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  {t.image_url && <img src={t.image_url} alt="" className="tarjeta-torneo__img" />}
                  <span className="tarjeta-torneo__estado">{t.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                  <h3>{t.name}</h3>
                  {t.description && <p>{t.description}</p>}
                </button>
              ))}
            </div>

            <div className="torneo-tabs">
              <button className={tab === 'bracket' ? 'is-active' : ''} onClick={() => setTab('bracket')}>Cuadro de cruces</button>
              <button className={tab === 'tabla' ? 'is-active' : ''} onClick={() => setTab('tabla')}>Tabla de posiciones</button>
              <button className={tab === 'estadisticas' ? 'is-active' : ''} onClick={() => setTab('estadisticas')}>Estadísticas</button>
            </div>
          </>
        )}
      </div>

      {tournaments.length > 0 && tab === 'bracket' && (
        <Bracket matches={matches} teams={teams} tournamentName={selected?.name} myTeamId={myTeamId} />
      )}

      {tournaments.length > 0 && tab === 'tabla' && (
        <div className="page">
          <div className="card">
            {standings.length === 0 ? (
              <div className="empty">Este torneo aún no tiene tabla de posiciones.</div>
            ) : (
              groups.map((g) => (
                <div key={g}>
                  <h3 className="grupo-titulo">{g}</h3>
                  <table>
                    <thead>
                      <tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
                    </thead>
                    <tbody>
                      {standings.filter((s) => s.group_name === g).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc)).map((s) => (
                        <tr key={s.id}>
                          <td className="team-cell"><TeamBadge team={s.teams} size="sm" />{s.teams?.name}</td>
                          <td>{s.pj}</td><td>{s.pg}</td><td>{s.pe}</td><td>{s.pp}</td>
                          <td>{s.gf}</td><td>{s.gc}</td><td>{s.gf - s.gc}</td>
                          <td className="pts">{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tournaments.length > 0 && tab === 'estadisticas' && (
        <div className="page">
          <TournamentStats players={players} teams={teams} />
          <div className="card">
            <h3>Todos los jugadores</h3>
            <p className="mini">Haz clic en un jugador para ver su página individual con estadísticas y gráficos.</p>
            <table>
              <thead><tr><th>Jugador</th><th>Equipo</th><th>Pts</th><th>Ast</th><th>Estado</th></tr></thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="link-jugador" to={`/jugador/${p.id}`}>{p.full_name}</Link></td>
                    <td className="team-cell">{p.teams && <TeamBadge team={p.teams} size="sm" />}{p.teams?.name || '—'}</td>
                    <td>{p.goals}</td>
                    <td>{p.assists}</td>
                    <td>{p.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}