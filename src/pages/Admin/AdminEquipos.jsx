import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { uploadFile } from '../../lib/storage'
import { buildBracketRows, isValidBracketSize } from '../../lib/bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'

const EMPTY = { name: '', group: '', url: '' }

function emptyDraftPlayer() {
  return {
    key: crypto.randomUUID(),
    full_name: '', dorsal: '', position: '',
    goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
  }
}

export default function AdminEquipos({ selectedId, teams, reloadData }) {
  const toast = useToast()
  const confirm = useConfirm()

  // ------- equipos del torneo actual -------
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [checked, setChecked] = useState({})
  const [busy, setBusy] = useState(false)

  // ------- biblioteca de equipos (reutilizable entre torneos) -------
  const [catalogTeams, setCatalogTeams] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamFile, setNewTeamFile] = useState(null)
  const [newTeamUrl, setNewTeamUrl] = useState('')
  const [draftPlayers, setDraftPlayers] = useState([emptyDraftPlayer()])
  const [catalogBusy, setCatalogBusy] = useState(false)
  const [openCatalogId, setOpenCatalogId] = useState(null)
  const [newPlayerByTeam, setNewPlayerByTeam] = useState({})

  async function loadCatalog() {
    setCatalogLoading(true)
    const { data } = await supabase
      .from('team_catalog')
      .select('*, team_catalog_players(*)')
      .order('name')
    setCatalogTeams(data || [])
    setCatalogLoading(false)
  }

  useEffect(() => { loadCatalog() }, [])

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
    const ok = await confirm('¿Eliminar este equipo del torneo? También se quitará de la tabla y del roster.', { title: 'Eliminar equipo' })
    if (!ok) return
    await supabase.from('teams').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    await reloadData()
  }

  async function handleGenerate() {
    const ids = Object.keys(checked).filter((id) => checked[id])
    if (!isValidBracketSize(ids.length)) return toast('El número de equipos seleccionados debe ser potencia de 2 (2, 4, 8, 16, 32…)', 'err')
    const ok = await confirm(`Se regenerará el bracket completo con ${ids.length} equipos, dejando todos los cruces vacíos para que los ubiques arrastrando. ¿Continuar?`, { title: 'Regenerar bracket' })
    if (!ok) return
    try {
      await supabase.from('bracket_matches').delete().eq('tournament_id', selectedId)
      const rows = buildBracketRows(selectedId, ids)
      const { error } = await supabase.from('bracket_matches').insert(rows)
      if (error) throw error
      await reloadData()
      toast('Bracket generado: ve a la pestaña Bracket para ubicar los equipos', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  // ---------------- Biblioteca de equipos ----------------

  function setDraftPlayer(key, field, value) {
    setDraftPlayers((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }
  function addDraftPlayer() { setDraftPlayers((rows) => [...rows, emptyDraftPlayer()]) }
  function removeDraftPlayer(key) {
    setDraftPlayers((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows))
  }

  async function handleCreateCatalogTeam() {
    if (!newTeamName.trim()) return toast('Ponle un nombre al equipo', 'err')
    const validPlayers = draftPlayers.filter((p) => p.full_name.trim())
    if (validPlayers.length === 0) {
      return toast('Todo equipo guardado debe tener al menos un jugador con sus estadísticas', 'err')
    }
    setCatalogBusy(true)
    try {
      let flag_url = newTeamUrl.trim() || null
      if (newTeamFile) flag_url = await uploadFile(newTeamFile, 'teams')

      const { data: team, error } = await supabase
        .from('team_catalog')
        .insert({ name: newTeamName.trim(), flag_url })
        .select()
        .single()
      if (error) throw error

      const playerRows = validPlayers.map((p) => ({
        team_catalog_id: team.id,
        full_name: p.full_name.trim(),
        dorsal: p.dorsal === '' ? null : +p.dorsal,
        position: p.position.trim() || null,
        goals: +p.goals || 0,
        assists: +p.assists || 0,
        yellow_cards: +p.yellow_cards || 0,
        red_cards: +p.red_cards || 0,
      }))
      const { error: pErr } = await supabase.from('team_catalog_players').insert(playerRows)
      if (pErr) throw pErr

      toast('Equipo guardado en la biblioteca con sus jugadores', 'ok')
      setNewTeamName(''); setNewTeamFile(null); setNewTeamUrl('')
      setDraftPlayers([emptyDraftPlayer()])
      await loadCatalog()
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setCatalogBusy(false)
    }
  }

  async function handleDeleteCatalogTeam(id) {
    const ok = await confirm('¿Eliminar este equipo de la biblioteca? No afecta a los torneos donde ya se usó.', { title: 'Eliminar equipo guardado' })
    if (!ok) return
    await supabase.from('team_catalog').delete().eq('id', id)
    await loadCatalog()
  }

  async function handleAddCatalogPlayer(teamCatalogId) {
    const draft = newPlayerByTeam[teamCatalogId]
    if (!draft || !draft.full_name?.trim()) return toast('Ponle un nombre al jugador', 'err')
    const { error } = await supabase.from('team_catalog_players').insert({
      team_catalog_id: teamCatalogId,
      full_name: draft.full_name.trim(),
      dorsal: draft.dorsal ? +draft.dorsal : null,
      position: draft.position?.trim() || null,
      goals: +draft.goals || 0,
      assists: +draft.assists || 0,
      yellow_cards: +draft.yellow_cards || 0,
      red_cards: +draft.red_cards || 0,
    })
    if (error) return toast('Error: ' + error.message, 'err')
    setNewPlayerByTeam((s) => ({ ...s, [teamCatalogId]: null }))
    await loadCatalog()
  }

  async function handleDeleteCatalogPlayer(id) {
    const ok = await confirm('¿Eliminar este jugador de la biblioteca?', { title: 'Eliminar jugador guardado' })
    if (!ok) return
    await supabase.from('team_catalog_players').delete().eq('id', id)
    await loadCatalog()
  }

  // Trae un equipo guardado (y sus jugadores) al torneo seleccionado.
  async function handleUseInTournament(catalogTeam) {
    setCatalogBusy(true)
    try {
      const { data: newTeam, error } = await supabase
        .from('teams')
        .insert({
          tournament_id: selectedId,
          catalog_id: catalogTeam.id,
          name: catalogTeam.name,
          flag_url: catalogTeam.flag_url,
        })
        .select()
        .single()
      if (error) throw error

      const players = catalogTeam.team_catalog_players || []
      if (players.length) {
        const rows = players.map((p) => ({
          tournament_id: selectedId,
          team_id: newTeam.id,
          catalog_player_id: p.id,
          full_name: p.full_name,
          dorsal: p.dorsal,
          position: p.position,
          goals: p.goals,
          assists: p.assists,
          yellow_cards: p.yellow_cards,
          red_cards: p.red_cards,
        }))
        const { error: pErr } = await supabase.from('players').insert(rows)
        if (pErr) throw pErr
      }
      await reloadData()
      toast(`${catalogTeam.name} y su plantilla se agregaron al torneo`, 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setCatalogBusy(false)
    }
  }

  const usedCatalogIds = new Set(teams.filter((t) => t.catalog_id).map((t) => t.catalog_id))

  return (
    <>
      <div className="card">
        <h3>Biblioteca de equipos (reutilizable entre torneos)</h3>
        <p className="mini">
          Crea aquí equipos con su plantilla de jugadores y estadísticas. Quedan guardados para siempre
          y puedes reutilizarlos en cualquier torneo con un clic, sin volver a cargarlos.
        </p>

        <div className="card" style={{ background: 'var(--panel-2)' }}>
          <h3 style={{ fontSize: 15 }}>Nuevo equipo guardado</h3>
          <div className="form-grid">
            <div className="field"><label>Nombre</label><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ej. Tigres" /></div>
            <div className="field"><label>Logo (archivo)</label><input type="file" accept="image/*" onChange={(e) => setNewTeamFile(e.target.files[0])} /></div>
            <div className="field"><label>o URL de imagen</label><input value={newTeamUrl} onChange={(e) => setNewTeamUrl(e.target.value)} placeholder="https://..." /></div>
          </div>

          <p className="mini" style={{ marginTop: 10 }}>Jugadores y estadísticas (obligatorio al menos 1):</p>
          {draftPlayers.map((p) => (
            <div className="player-draft-row" key={p.key}>
              <input placeholder="Nombre del jugador" value={p.full_name} onChange={(e) => setDraftPlayer(p.key, 'full_name', e.target.value)} />
              <input placeholder="Dorsal" type="number" value={p.dorsal} onChange={(e) => setDraftPlayer(p.key, 'dorsal', e.target.value)} />
              <input placeholder="Posición" value={p.position} onChange={(e) => setDraftPlayer(p.key, 'position', e.target.value)} />
              <input placeholder="Pts" type="number" value={p.goals} onChange={(e) => setDraftPlayer(p.key, 'goals', e.target.value)} />
              <input placeholder="Ast" type="number" value={p.assists} onChange={(e) => setDraftPlayer(p.key, 'assists', e.target.value)} />
              <input placeholder="FT" type="number" value={p.yellow_cards} onChange={(e) => setDraftPlayer(p.key, 'yellow_cards', e.target.value)} />
              <input placeholder="Exp" type="number" value={p.red_cards} onChange={(e) => setDraftPlayer(p.key, 'red_cards', e.target.value)} />
              <button type="button" className="pill-btn danger" onClick={() => removeDraftPlayer(p.key)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={addDraftPlayer}>+ Añadir otro jugador</button>

          {draftPlayers.some((p) => p.full_name.trim()) && (
            <div style={{ marginTop: 14 }}>
              <p className="mini">Vista previa (puntos por jugador):</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={draftPlayers.filter((p) => p.full_name.trim()).map((p) => ({ name: p.full_name, Puntos: +p.goals || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c3440" />
                  <XAxis dataKey="name" tick={{ fill: '#a8adb3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a8adb3', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
                  <Bar dataKey="Puntos" fill="#ff6b21" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <button className="btn" style={{ marginTop: 12 }} onClick={handleCreateCatalogTeam} disabled={catalogBusy}>
            {catalogBusy ? 'Guardando…' : 'Guardar equipo en la biblioteca'}
          </button>
        </div>

        {catalogLoading ? (
          <p className="mini" style={{ marginTop: 14 }}>Cargando biblioteca…</p>
        ) : (
          <div className="catalog-grid" style={{ marginTop: 14 }}>
            {catalogTeams.map((ct) => {
              const isOpen = openCatalogId === ct.id
              const alreadyUsed = usedCatalogIds.has(ct.id)
              const draft = newPlayerByTeam[ct.id] || { full_name: '', dorsal: '', position: '', goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 }
              return (
                <div className="catalog-card" key={ct.id}>
                  <div className="catalog-card__head">
                    <TeamBadge team={ct} size="md" />
                    <strong>{ct.name}</strong>
                    <button className="pill-btn danger" onClick={() => handleDeleteCatalogTeam(ct.id)}>Eliminar</button>
                  </div>
                  <p className="mini">{(ct.team_catalog_players || []).length} jugador(es) guardado(s)</p>

                  <button className="pill-btn" style={{ marginBottom: 8 }} onClick={() => setOpenCatalogId(isOpen ? null : ct.id)}>
                    {isOpen ? 'Ocultar jugadores' : 'Ver jugadores'}
                  </button>

                  {isOpen && (
                    <>
                      <div className="catalog-players-list">
                        {(ct.team_catalog_players || []).map((p) => (
                          <div className="catalog-player-row" key={p.id}>
                            <Link className="link-jugador" to={`/jugador-biblioteca/${p.id}`}>
                              {p.full_name}{p.dorsal ? ` · #${p.dorsal}` : ''}
                            </Link>
                            <button className="pill-btn danger" onClick={() => handleDeleteCatalogPlayer(p.id)}>✕</button>
                          </div>
                        ))}
                        {(ct.team_catalog_players || []).length === 0 && <p className="mini">Sin jugadores.</p>}
                      </div>
                      <div className="player-draft-row">
                        <input placeholder="Nombre" value={draft.full_name} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, full_name: e.target.value } }))} />
                        <input placeholder="Dorsal" type="number" value={draft.dorsal} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, dorsal: e.target.value } }))} />
                        <input placeholder="Posición" value={draft.position} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, position: e.target.value } }))} />
                        <input placeholder="Pts" type="number" value={draft.goals} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, goals: e.target.value } }))} />
                        <input placeholder="Ast" type="number" value={draft.assists} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, assists: e.target.value } }))} />
                        <input placeholder="FT" type="number" value={draft.yellow_cards} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, yellow_cards: e.target.value } }))} />
                        <input placeholder="Exp" type="number" value={draft.red_cards} onChange={(e) => setNewPlayerByTeam((s) => ({ ...s, [ct.id]: { ...draft, red_cards: e.target.value } }))} />
                        <button type="button" className="pill-btn" onClick={() => handleAddCatalogPlayer(ct.id)}>+</button>
                      </div>
                    </>
                  )}

                  <button
                    className="btn small"
                    style={{ marginTop: 10, width: '100%' }}
                    disabled={catalogBusy || alreadyUsed}
                    onClick={() => handleUseInTournament(ct)}
                  >
                    {alreadyUsed ? 'Ya está en este torneo' : 'Agregar a este torneo'}
                  </button>
                </div>
              )
            })}
            {catalogTeams.length === 0 && <p className="empty">Aún no hay equipos guardados. Crea el primero arriba.</p>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>{editingId ? 'Editar equipo del torneo' : 'Añadir equipo manualmente a este torneo'}</h3>
        <p className="mini">Úsalo si quieres un equipo exclusivo de este torneo (no se guarda en la biblioteca).</p>
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
        <p className="mini">Selecciona los equipos que participarán. El número debe ser potencia de 2 (2, 4, 8, 16, 32…). El bracket se genera con los cruces vacíos: los ubicas arrastrando en la pestaña Bracket.</p>
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
                  <button className="pill-btn danger" onClick={() => handleDelete(t.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}