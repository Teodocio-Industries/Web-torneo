import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import { useAuth } from '../../context/AuthContext'
import './Jugadores.css'

export default function Jugadores() {
  const { profile, myPlayers } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [players, setPlayers] = useState([])

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
    async function loadPlayers() {
      const { data } = await supabase
        .from('players')
        .select('*, teams(name,flag_url)')
        .eq('tournament_id', selectedId)
        .order('full_name')
      setPlayers(data || [])
    }
    loadPlayers()

    const canalJugadores = supabase
      .channel(`jugadores-${selectedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${selectedId}` },
        loadPlayers,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalJugadores)
    }
  }, [selectedId])

  const miFicha = myPlayers.find((mp) => mp.tournament_id === selectedId)

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
              <div><label className="mini">Asistencias</label><div className="mi-ficha__stat">{miFicha.assists}</div></div>
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

      <div className="card" style={{ padding: 0 }}>
        {players.length === 0 ? (
          <div className="empty">Este torneo aún no tiene jugadores cargados.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Jugador</th><th>Equipo</th><th>Dorsal</th><th>Pos.</th><th>Pts</th><th>Ast</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td><Link className="enlace-jugador" to={`/jugadores/${p.id}`}>{p.full_name}</Link></td>
                  <td className="team-cell">{p.teams && <TeamBadge team={p.teams} size="sm" />}{p.teams?.name || '—'}</td>
                  <td>{p.dorsal ?? '—'}</td>
                  <td>{p.position ?? '—'}</td>
                  <td>{p.goals}</td>
                  <td>{p.assists}</td>
                  <td>{p.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
