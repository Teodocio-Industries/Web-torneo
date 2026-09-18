import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import PlayerCharts from '../../components/PlayerCharts/PlayerCharts'
import { decimal, estadisticasJugador, partidosJugadosPorEquipo, porcentaje } from '../../lib/playerStats'
import './PlayerProfile.css'

export default function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from('players')
      .select('*, teams(id,name,flag_url), tournaments(id,name)')
      .eq('id', id)
      .single()
    setPlayer(p || null)
    if (p) {
      const [{ data: others }, { data: tournamentMatches }] = await Promise.all([
        supabase.from('players').select('*').eq('tournament_id', p.tournament_id),
        supabase.from('bracket_matches').select('team1_id, team2_id, status').eq('tournament_id', p.tournament_id),
      ])
      setAllPlayers(others || [])
      setMatches(tournamentMatches || [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(['players', 'bracket_matches'], load, [load])

  if (loading) return <div className="loading-screen">Cargando jugador…</div>
  if (!player) return <main className="page"><div className="empty">No se encontró este jugador.</div></main>

  const stats = estadisticasJugador(player, partidosJugadosPorEquipo(player.team_id, matches))

  return (
    <main className="page player-profile">
      <Link className="link-jugador" to="/torneos">← Volver a torneos</Link>

      <section className="player-profile__head card">
        <TeamBadge team={player.teams} size="lg" />
        <div>
          <p className="eyebrow">{player.tournaments?.name}</p>
          <h1>{player.full_name}</h1>
          <p className="mini">
            {player.teams?.name || 'Sin equipo asignado'}
            {player.dorsal ? ` · #${player.dorsal}` : ''}
            {player.position ? ` · ${player.position}` : ''}
          </p>
          {player.has_sanction ? (
            <div className="error-msg" style={{ marginTop: 10 }}>⚠️ Sanción activa: {player.sanction_reason || 'sin detalle especificado por el administrador'}.</div>
          ) : (
            <span className="badge ok" style={{ marginTop: 10, display: 'inline-block' }}>Sin faltas ni sanciones</span>
          )}
        </div>
      </section>

      <div className="player-profile__quick">
        <div className="quick-stat"><span>{decimal(stats.puntosPorPartido)}</span><label>Puntos por partido</label></div>
        <div className="quick-stat"><span>{decimal(stats.asistenciasPorPartido)}</span><label>Asistencias por partido</label></div>
        <div className="quick-stat"><span>{porcentaje(stats.porcentajeTriples)}</span><label>% triples</label></div>
        <div className="quick-stat"><span>{porcentaje(stats.porcentajeLibres)}</span><label>% tiros libres</label></div>
        <div className="quick-stat"><span>{player.yellow_cards}</span><label>Faltas técnicas</label></div>
        <div className="quick-stat"><span>{player.red_cards}</span><label>Expulsiones</label></div>
      </div>

      <section className="card shooting-summary">
        <div>
          <h2>Estadísticas de tiro</h2>
          <p className="mini">Promedios calculados con {stats.partidosJugados} partido{stats.partidosJugados === 1 ? '' : 's'} jugado{stats.partidosJugados === 1 ? '' : 's'}.</p>
        </div>
        <div className="shooting-summary__table">
          <div className="shooting-summary__head"><span>Tipo de tiro</span><span>Convertidos</span><span>Intentados</span><span>% acierto</span><span>Convertidos / PJ</span><span>Intentados / PJ</span></div>
          <div className="shooting-summary__row"><strong>Triples</strong><span>{stats.triplesConvertidos}</span><span>{stats.triplesLanzados}</span><span>{porcentaje(stats.porcentajeTriples)}</span><span>{decimal(stats.triplesConvertidosPorPartido)}</span><span>{decimal(stats.triplesLanzadosPorPartido)}</span></div>
          <div className="shooting-summary__row"><strong>Tiros libres</strong><span>{stats.libresConvertidos}</span><span>{stats.libresLanzados}</span><span>{porcentaje(stats.porcentajeLibres)}</span><span>{decimal(stats.libresConvertidosPorPartido)}</span><span>{decimal(stats.libresLanzadosPorPartido)}</span></div>
        </div>
      </section>

      <PlayerCharts player={player} allPlayers={allPlayers} />
    </main>
  )
}
