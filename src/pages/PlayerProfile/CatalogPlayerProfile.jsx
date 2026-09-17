import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import PlayerCharts from '../../components/PlayerCharts/PlayerCharts'
import './PlayerProfile.css'

export default function CatalogPlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from('team_catalog_players')
      .select('*, team_catalog(id,name,flag_url)')
      .eq('id', id)
      .single()
    setPlayer(p || null)
    if (p) {
      const { data: others } = await supabase
        .from('team_catalog_players')
        .select('*')
        .eq('team_catalog_id', p.team_catalog_id)
      setAllPlayers(others || [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-screen">Cargando jugador…</div>
  if (!player) return <main className="page"><div className="empty">No se encontró este jugador en la biblioteca.</div></main>

  return (
    <main className="page player-profile">
      <Link className="link-jugador" to="/admin">← Volver al panel</Link>

      <section className="player-profile__head card">
        <TeamBadge team={player.team_catalog} size="lg" />
        <div>
          <p className="eyebrow">Biblioteca de equipos · {player.team_catalog?.name}</p>
          <h1>{player.full_name}</h1>
          <p className="mini">
            {player.team_catalog?.name || 'Sin equipo asignado'}
            {player.dorsal ? ` · #${player.dorsal}` : ''}
            {player.position ? ` · ${player.position}` : ''}
          </p>
          <span className="badge ok" style={{ marginTop: 10, display: 'inline-block' }}>Jugador guardado — reutilizable en cualquier torneo</span>
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