import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import { useAuth } from '../../context/AuthContext'
import './Jugadores.css'

export default function Jugadores() {
  const { profile, myPlayers } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  // null = mostrar la grilla de equipos (como en Torneos); con un id, se ve el roster de ese equipo.
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      setTournaments(data || [])
      if (data && data.length) setSelectedId(data[0].id)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setSelectedTeamId(null)
    loadPlayers()
    loadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*, teams(name,flag_url)')
      .eq('tournament_id', selectedId)
      .order('full_name')
    setPlayers(data || [])
  }

  async function loadTeams() {
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', selectedId).order('name')
    setTeams(data || [])
  }

  useRealtimeRefresh(['players'], loadPlayers, [selectedId])
  useRealtimeRefresh(['teams'], loadTeams, [selectedId])

  const miFicha = myPlayers.find((mp) => mp.tournament_id === selectedId)
  const equipoSeleccionado = teams.find((t) => t.id === selectedTeamId)
  const jugadoresDelEquipo = players.filter((p) => p.team_id === selectedTeamId)
  const sinEquipo = players.filter((p) => !p.team_id)

  return (
    <main className="page jugadores-page">
      <section className="jugadores-encabezado">
        <p className="eyebrow">Caribe Sports Events</p>
        <h1>Jugadores</h1>
      </section>

      <div className="field" style={{ maxWidth: 320, marginBottom: 20 }}>
        <label>Torneo</label>
        <select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {profile?.role === 'jugador' && (
        miFicha ? (
          <div className="card mi-ficha">
            <div className="mi-ficha__head">
              <TeamBadge team={miFicha.teams} size="lg" />
              <div>
                <h2>{miFicha.full_name}</h2>
                <p className="mini">{miFicha.teams?.name || 'Sin equipo asignado'} {miFicha.dorsal ? `· #${miFicha.dorsal}` : ''} {miFicha.position ? `· ${miFicha.position}` : ''}</p>
              </div>
            </div>
            <div className="form-grid">
              <div><label className="mini">Puntos</label><div className="mi-ficha__stat">{miFicha.goals}</div></div>
              <div><label className="mini">Rebotes</label><div className="mi-ficha__stat">{miFicha.rebounds ?? 0}</div></div>
              <div><label className="mini">Asistencias</label><div className="mi-ficha__stat">{miFicha.assists}</div></div>
              <div><label className="mini">Robos</label><div className="mi-ficha__stat">{miFicha.steals ?? 0}</div></div>
              <div><label className="mini">Tapones</label><div className="mi-ficha__stat">{miFicha.blocks ?? 0}</div></div>
              <div><label className="mini">Pérdidas</label><div className="mi-ficha__stat">{miFicha.turnovers ?? 0}</div></div>
              <div><label className="mini">Faltas personales</label><div className="mi-ficha__stat">{miFicha.personal_fouls ?? 0}</div></div>
              <div><label className="mini">Faltas técnicas</label><div className="mi-ficha__stat">{miFicha.yellow_cards}</div></div>
              <div><label className="mini">Expulsiones</label><div className="mi-ficha__stat">{miFicha.red_cards}</div></div>
            </div>
            {miFicha.has_sanction ? (
              <div className="error-msg">⚠️ Tienes una sanción activa: {miFicha.sanction_reason || 'sin detalle especificado por el administrador'}.</div>
            ) : (
              <span className="badge ok">Sin faltas ni sanciones</span>
            )}
          </div>
        ) : (
          <div className="card empty">Aún no tienes una ficha de jugador en este torneo.</div>
        )
      )}

      {players.length === 0 ? (
        <div className="card empty">Este torneo aún no tiene jugadores cargados.</div>
      ) : !selectedTeamId ? (
        // ---------- Vista 1: grilla de equipos (igual patrón que Torneos) ----------
        <div className="lista-torneos">
          {teams.map((team) => {
            const cantidad = players.filter((p) => p.team_id === team.id).length
            return (
              <button key={team.id} className="tarjeta-torneo" onClick={() => setSelectedTeamId(team.id)}>
                <div className="tarjeta-equipo__head">
                  <TeamBadge team={team} size="lg" />
                </div>
                <h3>{team.name}</h3>
                <p>{cantidad} jugador{cantidad === 1 ? '' : 'es'}</p>
              </button>
            )
          })}
          {sinEquipo.length > 0 && (
            <button className="tarjeta-torneo" onClick={() => setSelectedTeamId('sin-equipo')}>
              <h3>Sin equipo</h3>
              <p>{sinEquipo.length} jugador{sinEquipo.length === 1 ? '' : 'es'}</p>
            </button>
          )}
        </div>
      ) : (
        // ---------- Vista 2: roster del equipo elegido, con todas las estadísticas ----------
        <div className="card" style={{ padding: 0 }}>
          <div className="roster-head">
            <button className="btn ghost small" onClick={() => setSelectedTeamId(null)}>← Volver a equipos</button>
            <h3>{selectedTeamId === 'sin-equipo' ? 'Sin equipo' : equipoSeleccionado?.name}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Jugador</th><th>Dorsal</th><th>Pos.</th>
                  <th>Pts</th><th>Reb</th><th>Ast</th><th>Rob</th><th>Tap</th><th>Pér</th>
                  <th>3PT</th><th>TL</th><th>FP</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(selectedTeamId === 'sin-equipo' ? sinEquipo : jugadoresDelEquipo).map((p) => (
                  <tr key={p.id}>
                    <td><Link className="link-jugador" to={`/jugador/${p.id}`}>{p.full_name}</Link></td>
                    <td>{p.dorsal ?? '—'}</td>
                    <td>{p.position ?? '—'}</td>
                    <td>{p.goals}</td>
                    <td>{p.rebounds ?? 0}</td>
                    <td>{p.assists}</td>
                    <td>{p.steals ?? 0}</td>
                    <td>{p.blocks ?? 0}</td>
                    <td>{p.turnovers ?? 0}</td>
                    <td>{p.three_points_made ?? 0}/{p.three_points_attempted ?? 0}</td>
                    <td>{p.free_throws_made ?? 0}/{p.free_throws_attempted ?? 0}</td>
                    <td>{p.personal_fouls ?? 0}</td>
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