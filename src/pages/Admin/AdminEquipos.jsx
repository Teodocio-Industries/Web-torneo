import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { uploadFile } from '../../lib/storage'
import { buildBracketRows, isValidBracketSize } from '../../lib/bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'

const EMPTY = { name: '', group: '', url: '' }

export default function AdminEquipos({ selectedId, teams, reloadData }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [checked, setChecked] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = {}
    teams.forEach((t) => { next[t.id] = true })
    setChecked(next)
  }, [teams])

  if (!selectedId) return <div className="empty">Selecciona o crea un torneo primero en la pestaña Torneos.</div>

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  function startEdit(team) {
    setEditingId(team.id)
    setForm({ name: team.name, group: team.group_name || '', url: team.flag_url || '' })
    setFile(null)
  }
  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY)
    setFile(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast('Ponle un nombre al equipo', 'err')
    setBusy(true)
    try {
      let flag_url = form.url.trim() || null
      if (file) flag_url = await uploadFile(file, 'teams')
      const payload = { name: form.name.trim(), group_name: form.group.trim() || null }
      if (flag_url) payload.flag_url = flag_url

      if (editingId) {
        const { error } = await supabase.from('teams').update(payload).eq('id', editingId)
        if (error) throw error
        toast('Equipo actualizado', 'ok')
      } else {
        const { error } = await supabase.from('teams').insert({ tournament_id: selectedId, flag_url: null, ...payload })
        if (error) throw error
        toast('Equipo añadido', 'ok')
      }
      await reloadData()
      cancelEdit()
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este equipo? También se quitará de la tabla y del roster.')) return
    await supabase.from('teams').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    await reloadData()
  }

  async function handleGenerate() {
    const ids = Object.keys(checked).filter((id) => checked[id])
    if (!isValidBracketSize(ids.length)) return toast('El número de equipos seleccionados debe ser potencia de 2 (2, 4, 8, 16, 32…)', 'err')
    if (!window.confirm(`Se regenerará el bracket completo con ${ids.length} equipos. ¿Continuar?`)) return
    try {
      await supabase.from('bracket_matches').delete().eq('tournament_id', selectedId)
      const rows = buildBracketRows(selectedId, ids)
      const { error } = await supabase.from('bracket_matches').insert(rows)
      if (error) throw error
      await reloadData()
      toast('Bracket generado', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  return (
    <>
      <div className="card">
        <h3>{editingId ? 'Editar equipo' : 'Añadir equipo'}</h3>
        <div className="form-grid">
          <div className="field"><label>Nombre</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Tigres" /></div>
          <div className="field"><label>Grupo (opcional)</label><input value={form.group} onChange={(e) => set('group', e.target.value)} placeholder="Grupo A" /></div>
          <div className="field"><label>Logo (archivo)</label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></div>
          <div className="field"><label>o URL de imagen</label><input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." /></div>
        </div>
        <div className="row-actions">
          <button className="btn" onClick={handleSave} disabled={busy}>{busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Añadir equipo'}</button>
          {editingId && <button className="btn ghost" onClick={cancelEdit}>Cancelar edición</button>}
        </div>
      </div>

      <div className="card">
        <h3>Equipos del torneo ({teams.length}) — generar bracket</h3>
        <p className="mini">Selecciona los equipos en el orden en que quieres que aparezcan. El número debe ser potencia de 2 (2, 4, 8, 16, 32…).</p>
        <div className="check-grid">
          {teams.map((t) => (
            <label key={t.id}>
              <input type="checkbox" checked={!!checked[t.id]} onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))} />
              {t.name}
            </label>
          ))}
        </div>
        <button className="btn ghost" onClick={handleGenerate}>Generar / regenerar bracket</button>
        <table style={{ marginTop: 16 }}>
          <thead><tr><th></th><th>Equipo</th><th>Grupo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td><TeamBadge team={t} size="sm" /></td>
                <td>{t.name}</td>
                <td>{t.group_name || '—'}</td>
                <td><span className={`badge status-${t.status}`}>{t.status}</span></td>
                <td className="row-actions">
                  <button className="pill-btn" onClick={() => startEdit(t)}>Editar</button>
                  <button className="pill-btn" onClick={() => handleDelete(t.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}