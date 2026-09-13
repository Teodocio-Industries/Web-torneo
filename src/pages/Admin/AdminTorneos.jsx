import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast/Toast'
import { uploadFile } from '../../lib/storage'

export default function AdminTorneos({ tournaments, selectedId, setSelectedId, reloadTournaments }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

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
