import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'

const EMPTY = { team_id: '', group_name: '', pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }

export default function AdminTabla({ selectedId, teams, standings, reloadData }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.team_id) return toast('Elige un equipo', 'err')
    try {
      const { error } = await supabase.from('standings').upsert({
        tournament_id: selectedId,
        team_id: form.team_id,
        group_name: form.group_name.trim() || 'General',
        pj: +form.pj, pg: +form.pg, pe: +form.pe, pp: +form.pp, gf: +form.gf, gc: +form.gc, pts: +form.pts,
      }, { onConflict: 'tournament_id,team_id' })
      if (error) throw error
      await reloadData()
      setForm(EMPTY)
      toast('Tabla actualizada', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  async function handleDelete(id) {
    await supabase.from('standings').delete().eq('id', id)
    await reloadData()
  }

  return (
    <>
      <div className="card">
        <h3>Añadir fila a la tabla</h3>
        <div className="form-grid">
          <div className="field">
            <label>Equipo</label>
            <select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
              <option value="">Selecciona…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Grupo</label><input value={form.group_name} onChange={(e) => set('group_name', e.target.value)} placeholder="Grupo A" /></div>
          {['pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'pts'].map((f) => (
            <div className="field" key={f}>
              <label>{f.toUpperCase()}</label>
              <input type="number" value={form[f]} onChange={(e) => set(f, e.target.value)} />
            </div>
          ))}
        </div>
        <button className="btn" onClick={handleSave}>Guardar fila</button>
      </div>

      <div className="card">
        <h3>Filas actuales</h3>
        <table>
          <thead><tr><th>Grupo</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th><th></th></tr></thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.id}>
                <td>{s.group_name}</td><td>{s.teams?.name}</td>
                <td>{s.pj}</td><td>{s.pg}</td><td>{s.pe}</td><td>{s.pp}</td><td>{s.gf}</td><td>{s.gc}</td><td>{s.pts}</td>
                <td><button className="pill-btn" onClick={() => handleDelete(s.id)}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
