import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import PlayerCharts from '../../components/PlayerCharts/PlayerCharts'
import './PlayerProfile.css'

export default function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from('players')
      .select('*, teams(id,name,flag_url), tournaments(id,name)')
      .eq('id', id)
      .single()
    setPlayer(p || null)
    if (p) {
      const { data: others } = await supabase.from('players').select('*').eq('tournament_id', p.tournament_id)
      setAllPlayers(others || [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(['players'], load, [load])

  if (loading) return <div className="loading-screen">Cargando jugador…</div>
  if (!player) return <main className="page"><div className="empty">No se encontró este jugador.</div></main>

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
        <div className="quick-stat"><span>{player.goals}</span><label>Puntos</label></div>
        <div className="quick-stat"><span>{player.assists}</span><label>Asistencias</label></div>
        <div className="quick-stat"><span>{player.yellow_cards}</span><label>Faltas técnicas</label></div>
        <div className="quick-stat"><span>{player.red_cards}</span><label>Expulsiones</label></div>
      </div>

      <PlayerCharts player={player} allPlayers={allPlayers} />
    </main>
  )
}