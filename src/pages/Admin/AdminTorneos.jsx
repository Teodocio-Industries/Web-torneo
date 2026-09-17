import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { uploadFile } from '../../lib/storage'

export default function AdminTorneos({ tournaments, selectedId, setSelectedId, reloadTournaments }) {
  const { profile } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete(t) {
    const ok = await confirm(`¿Eliminar el torneo "${t.name}"? Se borrarán también sus equipos, jugadores, bracket y tabla. Esta acción no se puede deshacer.`, { title: 'Eliminar torneo' })
    if (!ok) return
    setBusy(true)
    try {
      // Se borra primero todo lo que depende del torneo, por si la base
      // de datos no tiene borrado en cascada configurado.
      await supabase.from('bracket_matches').delete().eq('tournament_id', t.id)
      await supabase.from('standings').delete().eq('tournament_id', t.id)
      await supabase.from('players').delete().eq('tournament_id', t.id)
      await supabase.from('teams').delete().eq('tournament_id', t.id)
      const { error } = await supabase.from('tournaments').delete().eq('id', t.id)
      if (error) throw error
      if (selectedId === t.id) setSelectedId(null)
      await reloadTournaments(true)
      toast('Torneo eliminado', 'ok')
    } catch (e) {
      toast('Error al eliminar: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return toast('Ponle un nombre al torneo', 'err')
    setBusy(true)
    try {
      let image_url = null
      if (file) image_url = await uploadFile(file, 'tournaments')
      const { data, error } = await supabase
        .from('tournaments')
        .insert({ name: name.trim(), description: description.trim() || null, image_url, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      await reloadTournaments(true)
      setSelectedId(data.id)
      setName(''); setDescription(''); setFile(null)
      toast('Torneo creado', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <h3>Crear torneo</h3>
        <div className="form-grid">
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Liga de Otoño" />
          </div>
          <div className="field">
            <label>Descripción</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="field">
            <label>Imagen del torneo</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          </div>
        </div>
        <button className="btn" onClick={handleCreate} disabled={busy}>{busy ? 'Creando…' : 'Crear torneo'}</button>
      </div>

      <div className="card">
        <h3>Torneos existentes</h3>
        <div className="tourn-grid">
          {tournaments.map((t) => (
            <div key={t.id} className={`card ${t.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(t.id)}>
              <button
                type="button"
                className="card__delete"
                title="Eliminar torneo"
                disabled={busy}
                onClick={(e) => { e.stopPropagation(); handleDelete(t) }}
              >✕</button>
              {t.image_url && <img className="admin-thumb" src={t.image_url} alt="" />}
              <strong>{t.name}</strong>
              <div className="mini">{t.is_active ? 'Activo' : 'Inactivo'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}