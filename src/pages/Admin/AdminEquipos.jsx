import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { uploadFile } from '../../lib/storage'
import { buildBracketRows, isValidBracketSize } from '../../lib/bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'

export default function AdminEquipos({ selectedId, teams, matches, reloadData }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [checked, setChecked] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = {}
    teams.forEach((t) => { next[t.id] = true })
    setChecked(next)
  }, [teams])

  if (!selectedId) return <div className="empty">Selecciona o crea un torneo primero en la pestaña Torneos.</div>

  async function handleAdd() {
    if (!name.trim()) return toast('Ponle un nombre al equipo', 'err')
    setBusy(true)
    try {
      let flag_url = url.trim() || null
      if (file) flag_url = await uploadFile(file, 'teams')
      const { error } = await supabase.from('teams').insert({
        tournament_id: selectedId, name: name.trim(), group_name: group.trim() || null, flag_url,
      })
      if (error) throw error
      await reloadData()
      setName(''); setGroup(''); setFile(null); setUrl('')
      toast('Equipo añadido', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
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

  async function handleDeleteTeam(team) {
    const confirmed = window.confirm(
      `¿Eliminar el equipo “${team.name}”?\n\nTambién se eliminarán sus jugadores, su fila en la tabla y los cruces del bracket en los que participe. Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setBusy(true)
    try {
      const matchFilter = `team1_id.eq.${team.id},team2_id.eq.${team.id},winner_id.eq.${team.id}`
      const operations = [
        supabase.from('standings').delete().eq('team_id', team.id),
        supabase.from('players').delete().eq('team_id', team.id),
        supabase.from('bracket_matches').delete().or(matchFilter),
        supabase.from('teams').delete().eq('id', team.id),
      ]
      for (const operation of operations) {
        const { error } = await operation
        if (error) throw error
      }
      await reloadData()
      toast('Equipo y sus datos relacionados eliminados', 'ok')
    } catch (error) {
      toast('No se pudo eliminar: ' + error.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleClearBracket() {
    if (!matches.length) return toast('No hay bracket para eliminar', 'err')
    if (!window.confirm('¿Eliminar todo el bracket? Los marcadores y ganadores registrados se perderán.')) return
    setBusy(true)
    try {
      const { error } = await supabase.from('bracket_matches').delete().eq('tournament_id', selectedId)
      if (error) throw error
      await reloadData()
      toast('Bracket eliminado', 'ok')
    } catch (error) {
      toast('No se pudo eliminar: ' + error.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <h3>Añadir equipo</h3>
        <div className="form-grid">
          <div className="field"><label>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tigres" /></div>
          <div className="field"><label>Grupo (opcional)</label><input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Grupo A" /></div>
          <div className="field"><label>Logo (archivo)</label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></div>
          <div className="field"><label>o URL de imagen</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
        </div>
        <button className="btn" onClick={handleAdd} disabled={busy}>{busy ? 'Guardando…' : 'Añadir equipo'}</button>
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
        <div className="action-row">
          <button className="btn ghost" onClick={handleGenerate} disabled={busy}>Generar / regenerar bracket</button>
          <button className="pill-btn danger" onClick={handleClearBracket} disabled={busy || !matches.length}>Eliminar bracket</button>
        </div>
        <table style={{ marginTop: 16 }}>
          <thead><tr><th></th><th>Equipo</th><th>Grupo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td><TeamBadge team={t} size="sm" /></td>
                <td>{t.name}</td>
                <td>{t.group_name || '—'}</td>
                <td><span className={`badge status-${t.status}`}>{t.status}</span></td>
                <td><button className="pill-btn danger" onClick={() => handleDeleteTeam(t)} disabled={busy}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
