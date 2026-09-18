import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import TeamBadge from '../../components/TeamBadge/TeamBadge'

const EMPTY = {
  full_name: '', team_id: '', profile_id: '', dorsal: '', position: '',
  goals: 0, assists: 0, three_points_attempted: 0, three_points_made: 0,
  free_throws_attempted: 0, free_throws_made: 0, yellow_cards: 0, red_cards: 0,
  games_suspended: 0, has_sanction: 'false', sanction_reason: '',
}

export default function AdminJugadores({ selectedId, teams, players, reloadData }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [jugadorProfiles, setJugadorProfiles] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('role', 'jugador')
      .then(({ data }) => setJugadorProfiles(data || []))
  }, [])

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY)
  }

  function startEdit(player) {
    setEditingId(player.id)
    setForm({
      full_name: player.full_name || '', team_id: player.team_id || '', profile_id: player.profile_id || '',
      dorsal: player.dorsal ?? '', position: player.position || '', goals: player.goals ?? 0,
      assists: player.assists ?? 0, three_points_attempted: player.three_points_attempted ?? 0,
      three_points_made: player.three_points_made ?? 0, free_throws_attempted: player.free_throws_attempted ?? 0,
      free_throws_made: player.free_throws_made ?? 0, yellow_cards: player.yellow_cards ?? 0,
      red_cards: player.red_cards ?? 0, games_suspended: player.games_suspended ?? 0,
      has_sanction: String(Boolean(player.has_sanction)), sanction_reason: player.sanction_reason || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.full_name.trim()) return toast('Ponle un nombre al jugador', 'err')
    const triplesIntentados = Math.max(0, +form.three_points_attempted)
    const triplesConvertidos = Math.min(triplesIntentados, Math.max(0, +form.three_points_made))
    const libresIntentados = Math.max(0, +form.free_throws_attempted)
    const libresConvertidos = Math.min(libresIntentados, Math.max(0, +form.free_throws_made))
    const payload = {
      team_id: form.team_id || null, profile_id: form.profile_id || null, full_name: form.full_name.trim(),
      dorsal: form.dorsal === '' ? null : +form.dorsal, position: form.position.trim() || null,
      goals: +form.goals, assists: +form.assists, three_points_attempted: triplesIntentados,
      three_points_made: triplesConvertidos, free_throws_attempted: libresIntentados,
      free_throws_made: libresConvertidos, yellow_cards: +form.yellow_cards, red_cards: +form.red_cards,
      games_suspended: +form.games_suspended, has_sanction: form.has_sanction === 'true',
      sanction_reason: form.sanction_reason.trim() || null,
    }
    try {
      const request = editingId
        ? supabase.from('players').update(payload).eq('id', editingId)
        : supabase.from('players').insert({ tournament_id: selectedId, ...payload })
      const { error } = await request
      if (error) throw error
      await reloadData()
      toast(editingId ? 'Jugador y estadísticas actualizados' : 'Jugador guardado', 'ok')
      cancelEdit()
    } catch (error) {
      toast('Error: ' + error.message, 'err')
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('¿Eliminar este jugador del roster? Esta acción no se puede deshacer.', { title: 'Eliminar jugador' })
    if (!ok) return
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) return toast('Error: ' + error.message, 'err')
    if (editingId === id) cancelEdit()
    await reloadData()
    toast('Jugador eliminado', 'ok')
  }

  return (
    <>
      <div className="card">
        <h3>{editingId ? 'Editar jugador y estadísticas' : 'Añadir jugador / estadísticas'}</h3>
        <div className="form-grid">
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div className="field"><label>Equipo</label><select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}><option value="">Sin equipo</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
          <div className="field"><label>Dorsal</label><input type="number" value={form.dorsal} onChange={(e) => set('dorsal', e.target.value)} /></div>
          <div className="field"><label>Posición</label><input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Base" /></div>
          <div className="field"><label>Puntos</label><input type="number" min="0" value={form.goals} onChange={(e) => set('goals', e.target.value)} /></div>
          <div className="field"><label>Asistencias</label><input type="number" min="0" value={form.assists} onChange={(e) => set('assists', e.target.value)} /></div>
          <div className="field"><label>Triples lanzados</label><input type="number" min="0" value={form.three_points_attempted} onChange={(e) => set('three_points_attempted', e.target.value)} /></div>
          <div className="field"><label>Triples convertidos</label><input type="number" min="0" value={form.three_points_made} onChange={(e) => set('three_points_made', e.target.value)} /></div>
          <div className="field"><label>Tiros libres lanzados</label><input type="number" min="0" value={form.free_throws_attempted} onChange={(e) => set('free_throws_attempted', e.target.value)} /></div>
          <div className="field"><label>Tiros libres convertidos</label><input type="number" min="0" value={form.free_throws_made} onChange={(e) => set('free_throws_made', e.target.value)} /></div>
          <div className="field"><label>Partidos suspendido</label><input type="number" min="0" value={form.games_suspended} onChange={(e) => set('games_suspended', e.target.value)} /><small className="mini">Se restan de los partidos finalizados de su equipo.</small></div>
          <div className="field"><label>Faltas técnicas</label><input type="number" min="0" value={form.yellow_cards} onChange={(e) => set('yellow_cards', e.target.value)} /></div>
          <div className="field"><label>Expulsiones</label><input type="number" min="0" value={form.red_cards} onChange={(e) => set('red_cards', e.target.value)} /></div>
          <div className="field"><label>¿Sanción / falta?</label><select value={form.has_sanction} onChange={(e) => set('has_sanction', e.target.value)}><option value="false">No</option><option value="true">Sí</option></select></div>
          <div className="field"><label>Motivo de la sanción</label><input value={form.sanction_reason} onChange={(e) => set('sanction_reason', e.target.value)} placeholder="Opcional" /></div>
          <div className="field"><label>Vincular a cuenta de jugador</label><select value={form.profile_id} onChange={(e) => set('profile_id', e.target.value)}><option value="">— roster sin cuenta —</option>{jugadorProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} ({profile.email})</option>)}</select></div>
        </div>
        <div className="row-actions"><button className="btn" onClick={handleSave}>{editingId ? 'Guardar cambios' : 'Guardar jugador'}</button>{editingId && <button className="btn ghost" onClick={cancelEdit}>Cancelar edición</button>}</div>
      </div>

      <div className="card">
        <h3>Roster de este torneo</h3>
        <table>
          <thead><tr><th>Jugador</th><th>Equipo</th><th>3PT</th><th>TL</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{players.map((player) => <tr key={player.id}><td><Link className="link-jugador" to={`/jugador/${player.id}`}>{player.full_name}</Link></td><td>{player.teams?.name || '—'}</td><td>{player.three_points_made ?? 0}/{player.three_points_attempted ?? 0}</td><td>{player.free_throws_made ?? 0}/{player.free_throws_attempted ?? 0}</td><td>{player.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td><td className="row-actions"><button className="pill-btn edit" onClick={() => startEdit(player)}>✎ Editar</button><button className="pill-btn danger" onClick={() => handleDelete(player.id)}>Eliminar</button></td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}
