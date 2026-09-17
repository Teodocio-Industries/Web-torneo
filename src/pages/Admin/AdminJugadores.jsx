import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import TeamBadge from '../../components/TeamBadge/TeamBadge'

const EMPTY = {
  full_name: '', team_id: '', profile_id: '', dorsal: '', position: '',
  goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, has_sanction: 'false', sanction_reason: '',
}

export default function AdminJugadores({ selectedId, teams, players, reloadData }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [jugadorProfiles, setJugadorProfiles] = useState([])
  const [catalogTeams, setCatalogTeams] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('role', 'jugador').then(({ data }) => setJugadorProfiles(data || []))
  }, [])

  useEffect(() => {
    supabase.from('team_catalog').select('*, team_catalog_players(*)').order('name').then(({ data }) => setCatalogTeams(data || []))
  }, [])

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  function startEdit(p) {
    setEditingId(p.id)
    setForm({
      full_name: p.full_name, team_id: p.team_id || '', profile_id: p.profile_id || '',
      dorsal: p.dorsal ?? '', position: p.position || '',
      goals: p.goals, assists: p.assists, yellow_cards: p.yellow_cards, red_cards: p.red_cards,
      has_sanction: String(p.has_sanction), sanction_reason: p.sanction_reason || '',
    })
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY) }

  async function handleSave() {
    if (!form.full_name.trim()) return toast('Ponle un nombre al jugador', 'err')
    const payload = {
      team_id: form.team_id || null,
      profile_id: form.profile_id || null,
      full_name: form.full_name.trim(),
      dorsal: form.dorsal === '' ? null : +form.dorsal,
      position: form.position.trim() || null,
      goals: +form.goals, assists: +form.assists, yellow_cards: +form.yellow_cards, red_cards: +form.red_cards,
      has_sanction: form.has_sanction === 'true',
      sanction_reason: form.sanction_reason.trim() || null,
    }
    try {
      if (editingId) {
        const { error } = await supabase.from('players').update(payload).eq('id', editingId)
        if (error) throw error
        toast('Jugador actualizado', 'ok')
      } else {
        const { error } = await supabase.from('players').insert({ tournament_id: selectedId, ...payload })
        if (error) throw error
        toast('Jugador guardado', 'ok')
      }
      await reloadData()
      cancelEdit()
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  async function handleDelete(id) {
    const ok = await confirm('¿Eliminar este jugador del roster?', { title: 'Eliminar jugador' })
    if (!ok) return
    await supabase.from('players').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    await reloadData()
  }

  // Agrupa el roster del torneo por equipo, para que se vea seccionado.
  const byTeam = new Map()
  players.forEach((p) => {
    const key = p.team_id || 'sin-equipo'
    if (!byTeam.has(key)) byTeam.set(key, { team: p.teams || null, list: [] })
    byTeam.get(key).list.push(p)
  })

  return (
    <>
      <div className="card">
        <h3>Biblioteca de jugadores por equipo guardado</h3>
        <p className="mini">
          Estos jugadores viven en la biblioteca de equipos y pueden reutilizarse en cualquier torneo.
          Haz clic en un jugador para ver su ficha con estadísticas y gráfica. Para editarlos o agregar
          nuevos, ve a la pestaña <strong>Equipos</strong>.
        </p>
        <div className="catalog-grid">
          {catalogTeams.map((ct) => (
            <div className="catalog-card" key={ct.id}>
              <div className="catalog-card__head">
                <TeamBadge team={ct} size="md" />
                <strong>{ct.name}</strong>
              </div>
              <div className="catalog-players-list">
                {(ct.team_catalog_players || []).map((p) => (
                  <div className="catalog-player-row" key={p.id}>
                    <Link className="link-jugador" to={`/jugador-biblioteca/${p.id}`}>
                      {p.full_name}{p.dorsal ? ` · #${p.dorsal}` : ''}
                    </Link>
                  </div>
                ))}
                {(ct.team_catalog_players || []).length === 0 && <p className="mini">Sin jugadores guardados.</p>}
              </div>
            </div>
          ))}
          {catalogTeams.length === 0 && <p className="empty">Aún no hay equipos guardados en la biblioteca.</p>}
        </div>
      </div>

      <div className="card">
        <h3>{editingId ? 'Editar jugador' : 'Añadir jugador / estadísticas'}</h3>
        <p className="mini">Esto edita al jugador solo dentro de este torneo (su ficha en la biblioteca no cambia).</p>
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
        <div className="row-actions">
          <button className="btn" onClick={handleSave}>{editingId ? 'Guardar cambios' : 'Guardar jugador'}</button>
          {editingId && <button className="btn ghost" onClick={cancelEdit}>Cancelar edición</button>}
        </div>
      </div>

      <div className="card">
        <h3>Roster de este torneo, seccionado por equipo</h3>
        {[...byTeam.entries()].map(([key, group]) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: '10px 0' }}>
              {group.team && <TeamBadge team={group.team} size="sm" />}
              {group.team?.name || 'Sin equipo asignado'}
            </h4>
            <table>
              <thead><tr><th>Nombre</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {group.list.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="link-jugador" to={`/jugador/${p.id}`}>{p.full_name}</Link></td>
                    <td>{p.has_sanction ? <span className="badge san">Sancionado</span> : <span className="badge ok">Habilitado</span>}</td>
                    <td className="row-actions">
                      <button className="pill-btn" onClick={() => startEdit(p)}>Editar</button>
                      <button className="pill-btn danger" onClick={() => handleDelete(p.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {players.length === 0 && <div className="empty">Este torneo aún no tiene jugadores cargados.</div>}
      </div>
    </>
  )
}