import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { estadisticasJugador, partidosJugadosPorEquipo } from '../../lib/playerStats'

const EMPTY = {
  full_name: '', team_id: '', profile_id: '', dorsal: '', position: '',
  goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, games_suspended: 0,
  has_sanction: 'false', sanction_reason: '',
}

export default function AdminJugadores({ selectedId, teams, players, matches, reloadData }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [jugadorProfiles, setJugadorProfiles] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'jugador')
      .then(({ data }) => setJugadorProfiles(data || []))
  }, [])

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setForm(EMPTY)
    setEditingId(null)
  }

  function handleEdit(player) {
    setEditingId(player.id)
    setForm({
      full_name: player.full_name || '',
      team_id: player.team_id || '',
      profile_id: player.profile_id || '',
      dorsal: player.dorsal || '',
      position: player.position || '',
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
      yellow_cards: player.yellow_cards ?? 0,
      red_cards: player.red_cards ?? 0,
      games_suspended: player.games_suspended ?? 0,
      has_sanction: String(Boolean(player.has_sanction)),
      sanction_reason: player.sanction_reason || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.full_name.trim()) return toast('Ponle un nombre al jugador', 'err')

    const playerData = {
      team_id: form.team_id || null,
      profile_id: form.profile_id || null,
      full_name: form.full_name.trim(),
      dorsal: form.dorsal || null,
      position: form.position.trim() || null,
      goals: +form.goals,
      assists: +form.assists,
      yellow_cards: +form.yellow_cards,
      red_cards: +form.red_cards,
      games_suspended: +form.games_suspended,
      has_sanction: form.has_sanction === 'true',
      sanction_reason: form.sanction_reason.trim() || null,
    }

    try {
      const request = editingId
        ? supabase.from('players').update(playerData).eq('id', editingId)
        : supabase.from('players').insert({ tournament_id: selectedId, ...playerData })
      const { error } = await request
      if (error) throw error

      await reloadData()
      const message = editingId ? 'Estadísticas del jugador actualizadas' : 'Jugador guardado'
      resetForm()
      toast(message, 'ok')
    } catch (error) {
      toast('Error: ' + error.message, 'err')
    }
  }

  async function handleDelete(id) {
    const player = players.find((item) => item.id === id)
    if (!window.confirm(`¿Eliminar a ${player?.full_name || 'este jugador'}? Esta acción no se puede deshacer.`)) return

    try {
      const { error } = await supabase.from('players').delete().eq('id', id)
      if (error) throw error
      await reloadData()
      if (editingId === id) resetForm()
      toast('Jugador eliminado', 'ok')
    } catch (error) {
      toast('No se pudo eliminar: ' + error.message, 'err')
    }
  }

  return (
    <>
      <div className="card">
        <div className="form-title-row">
          <div>
            <h3>{editingId ? 'Editar jugador y estadísticas' : 'Añadir jugador / estadísticas'}</h3>
            {editingId && <p className="mini">Estás modificando un jugador existente.</p>}
          </div>
          {editingId && <button className="pill-btn" onClick={resetForm}>Cancelar edición</button>}
        </div>

        <div className="form-grid">
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div className="field">
            <label>Equipo</label>
            <select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
              <option value="">Sin equipo</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Dorsal</label><input type="number" value={form.dorsal} onChange={(e) => set('dorsal', e.target.value)} /></div>
          <div className="field"><label>Posición</label><input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Alero" /></div>
          <div className="field"><label>Puntos</label><input type="number" value={form.goals} onChange={(e) => set('goals', e.target.value)} /></div>
          <div className="field"><label>Asistencias</label><input type="number" value={form.assists} onChange={(e) => set('assists', e.target.value)} /></div>
          <div className="field"><label>Partidos suspendido</label><input type="number" min="0" value={form.games_suspended} onChange={(e) => set('games_suspended', e.target.value)} /><small className="mini">Se restan automáticamente de los partidos finalizados por su equipo.</small></div>
          <div className="field"><label>Faltas técnicas</label><input type="number" value={form.yellow_cards} onChange={(e) => set('yellow_cards', e.target.value)} /></div>
          <div className="field"><label>Expulsiones</label><input type="number" value={form.red_cards} onChange={(e) => set('red_cards', e.target.value)} /></div>
          <div className="field">
            <label>¿Sanción / falta?</label>
            <select value={form.has_sanction} onChange={(e) => set('has_sanction', e.target.value)}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </div>
          <div className="field"><label>Motivo de la sanción</label><input value={form.sanction_reason} onChange={(e) => set('sanction_reason', e.target.value)} placeholder="Opcional" /></div>
          <div className="field">
            <label>Vincular a cuenta de jugador (opcional)</label>
            <select value={form.profile_id} onChange={(e) => set('profile_id', e.target.value)}>
              <option value="">— roster sin cuenta —</option>
              {jugadorProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} ({profile.email})</option>)}
            </select>
          </div>
        </div>
        <button className="btn" onClick={handleSave}>{editingId ? 'Guardar cambios' : 'Guardar jugador'}</button>
      </div>

      <div className="card">
        <h3>Roster actual</h3>
        <table>
          <thead><tr><th>Nombre</th><th>Equipo</th><th>PJ equipo</th><th>PJ</th><th>Susp.</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {players.map((player) => {
              const partidosEquipo = partidosJugadosPorEquipo(player.team_id, matches)
              const stats = estadisticasJugador(player, partidosEquipo)
              return <tr key={player.id}>
                <td>{player.full_name}</td>
                <td>{player.teams?.name || '—'}</td>
                <td>{stats.partidosDelEquipo}</td>
                <td>{stats.partidosJugados}</td>
                <td>{stats.partidosSuspendido}</td>
                <td>{player.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td>
                <td className="row-actions">
                  <button className="pill-btn edit" onClick={() => handleEdit(player)} title={`Editar a ${player.full_name}`} aria-label={`Editar a ${player.full_name}`}>✎ Editar</button>
                  <button className="pill-btn danger" onClick={() => handleDelete(player.id)}>Eliminar</button>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
