import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'

const EMPTY = {
  full_name: '', team_id: '', profile_id: '', dorsal: '', position: '',
  goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, has_sanction: 'false', sanction_reason: '',
}

export default function AdminJugadores({ selectedId, teams, players, reloadData }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [jugadorProfiles, setJugadorProfiles] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('role', 'jugador').then(({ data }) => setJugadorProfiles(data || []))
  }, [])

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleAdd() {
    if (!form.full_name.trim()) return toast('Ponle un nombre al jugador', 'err')
    try {
      const { error } = await supabase.from('players').insert({
        tournament_id: selectedId,
        team_id: form.team_id || null,
        profile_id: form.profile_id || null,
        full_name: form.full_name.trim(),
        dorsal: form.dorsal || null,
        position: form.position.trim() || null,
        goals: +form.goals, assists: +form.assists, yellow_cards: +form.yellow_cards, red_cards: +form.red_cards,
        has_sanction: form.has_sanction === 'true',
        sanction_reason: form.sanction_reason.trim() || null,
      })
      if (error) throw error
      await reloadData()
      setForm(EMPTY)
      toast('Jugador guardado', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  async function handleDelete(id) {
    await supabase.from('players').delete().eq('id', id)
    await reloadData()
  }

  return (
    <>
      <div className="card">
        <h3>Añadir jugador / estadísticas</h3>
        <div className="form-grid">
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div className="field">
            <label>Equipo</label>
            <select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
              <option value="">Sin equipo</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Dorsal</label><input type="number" value={form.dorsal} onChange={(e) => set('dorsal', e.target.value)} /></div>
          <div className="field"><label>Posición</label><input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Alero" /></div>
          <div className="field"><label>Puntos</label><input type="number" value={form.goals} onChange={(e) => set('goals', e.target.value)} /></div>
          <div className="field"><label>Asistencias</label><input type="number" value={form.assists} onChange={(e) => set('assists', e.target.value)} /></div>
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
              {jugadorProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
            </select>
          </div>
        </div>
        <button className="btn" onClick={handleAdd}>Guardar jugador</button>
      </div>

      <div className="card">
        <h3>Roster actual</h3>
        <table>
          <thead><tr><th>Nombre</th><th>Equipo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.teams?.name || '—'}</td>
                <td>{p.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td>
                <td><button className="pill-btn" onClick={() => handleDelete(p.id)}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
