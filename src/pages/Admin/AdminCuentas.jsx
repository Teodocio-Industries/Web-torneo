import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import ConsentCheck, { EnlaceLegal } from '../../components/ConsentCheck/ConsentCheck'
import { VERSION_POLITICAS } from '../../config/negocio'

const MIN_CLAVE = 10
const VACIO_EDICION = { id: '', fullName: '', email: '', password: '', role: 'jugador', teamId: '' }

export default function AdminCuentas() {
  const toast = useToast()
  const confirm = useConfirm()
  const { profile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('jugador')
  const [teams, setTeams] = useState([])
  const [activeTournament, setActiveTournament] = useState(null)
  const [teamId, setTeamId] = useState('')
  const [accounts, setAccounts] = useState([])
  const [editing, setEditing] = useState(VACIO_EDICION)
  const [autorizado, setAutorizado] = useState(false)
  const [esMenor, setEsMenor] = useState(false)
  const [representante, setRepresentante] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [busy, setBusy] = useState(false)

  const loadData = useCallback(async () => {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    const tournament = tournaments?.[0] || null
    setActiveTournament(tournament)

    const [teamsResult, accountsResult] = await Promise.all([
      tournament
        ? supabase.from('teams').select('id, name').eq('tournament_id', tournament.id).order('name')
        : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('id, full_name, email, role, team_id, created_at').order('full_name'),
    ])
    setTeams(teamsResult.data || [])
    if (accountsResult.error) toast(`No se pudieron cargar las cuentas: ${accountsResult.error.message}`, 'err')
    else setAccounts(accountsResult.data || [])
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate() {
    if (!email.trim() || !password || !fullName.trim()) return toast('Completa todos los campos', 'err')
    if (password.length < MIN_CLAVE) return toast(`La contraseña debe tener al menos ${MIN_CLAVE} caracteres`, 'err')
    if (!autorizado) return toast('Confirma que la persona autorizó el tratamiento de sus datos', 'err')
    if (esMenor && !representante.trim()) return toast('Indica el nombre del representante legal del menor', 'err')
    if (!teamId) {
      const ok = await confirm(
        'Esta cuenta no quedará vinculada a un equipo. Podrá abrir las fichas detalladas de cualquier jugador. ¿Deseas crearla sin equipo?',
        { title: 'Cuenta sin equipo vinculado', confirmLabel: 'Crear sin equipo', danger: false },
      )
      if (!ok) return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: email.trim(), password, full_name: fullName.trim(), role },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      if (teamId) {
        const { error: teamError } = await supabase.from('profiles').update({ team_id: teamId }).eq('email', email.trim())
        if (teamError) throw new Error(`La cuenta fue creada, pero no se pudo vincular al equipo: ${teamError.message}`)
      }

      const { error: errConsent } = await supabase.from('consent_records').insert({
        subject_name: fullName.trim(), subject_email: email.trim(), is_minor: esMenor,
        guardian_name: esMenor ? representante.trim() : null, kind: 'tratamiento_datos',
        policy_version: VERSION_POLITICAS, evidence_note: evidencia.trim() || null, recorded_by: profile?.id ?? null,
      })
      if (errConsent) toast('Cuenta creada, pero no se pudo guardar la constancia de autorización.', 'err')
      else toast('Cuenta creada: ' + email, 'ok')

      setFullName(''); setEmail(''); setPassword(''); setTeamId(''); setAutorizado(false)
      setEsMenor(false); setRepresentante(''); setEvidencia('')
      await loadData()
    } catch (error) {
      toast('Error: ' + error.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  function openEdit(account) {
    setEditing({ id: account.id, fullName: account.full_name || '', email: account.email || '', password: '', role: account.role || 'jugador', teamId: account.team_id || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleUpdate() {
    if (!editing.fullName.trim() || !editing.email.trim()) return toast('Nombre y correo son obligatorios', 'err')
    if (editing.password && editing.password.length < MIN_CLAVE) return toast(`La nueva contraseña debe tener al menos ${MIN_CLAVE} caracteres`, 'err')
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'update', user_id: editing.id, full_name: editing.fullName.trim(), email: editing.email.trim(),
          password: editing.password || undefined, role: editing.role, team_id: editing.teamId || null,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast('Cuenta actualizada', 'ok')
      setEditing(VACIO_EDICION)
      await loadData()
    } catch (error) {
      toast('Error al actualizar: ' + error.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(account) {
    if (account.id === profile?.id) return toast('No puedes eliminar tu propia cuenta mientras estás conectado', 'err')
    const ok = await confirm(
      `¿Eliminar definitivamente la cuenta de ${account.full_name || account.email}? Esta acción no se puede deshacer.`,
      { title: 'Eliminar cuenta', confirmLabel: 'Sí, eliminar cuenta' },
    )
    if (!ok) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', { body: { action: 'delete', user_id: account.id } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast('Cuenta eliminada', 'ok')
      if (editing.id === account.id) setEditing(VACIO_EDICION)
      await loadData()
    } catch (error) {
      toast('Error al eliminar: ' + error.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  function teamName(id) { return teams.find((team) => team.id === id)?.name || 'Sin equipo' }

  return (
    <>
      <div className="card">
        <h3>Crear cuenta de acceso</h3>
        <p className="mini">La vinculación a equipo es opcional: restringe únicamente las fichas detalladas de jugadores a ese equipo.</p>
        <div className="form-grid">
          <div className="field"><label>Nombre completo</label><input value={fullName} maxLength={120} autoComplete="off" onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="field"><label>Correo</label><input type="email" value={email} maxLength={254} autoComplete="off" onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Contraseña</label><input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} placeholder={`mín. ${MIN_CLAVE} caracteres`} /></div>
          <div className="field"><label>Rol</label><select value={role} onChange={(e) => setRole(e.target.value)}><option value="jugador">Jugador</option><option value="usuario">Usuario normal</option><option value="admin">Administrador</option></select></div>
          <div className="field"><label>Equipo vinculado (opcional)</label><select value={teamId} onChange={(e) => setTeamId(e.target.value)}><option value="">— sin equipo vinculado —</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><small className="mini">{activeTournament ? `Equipos de ${activeTournament.name}.` : 'No hay un torneo activo para vincular.'}</small></div>
        </div>
        <ConsentCheck checked={autorizado} onChange={setAutorizado} required={false}>Confirmo que la persona (o su representante legal, si es menor de 18 años) autorizó el tratamiento de sus datos según la <EnlaceLegal a="privacidad">política de privacidad</EnlaceLegal>.</ConsentCheck>
        <ConsentCheck checked={esMenor} onChange={setEsMenor} required={false}>La persona es menor de 18 años y su representante legal dio la autorización.</ConsentCheck>
        {esMenor && <div className="field"><label>Nombre del representante legal</label><input value={representante} maxLength={120} onChange={(e) => setRepresentante(e.target.value)} /></div>}
        <div className="field"><label>Dónde está la prueba (opcional)</label><input value={evidencia} maxLength={300} onChange={(e) => setEvidencia(e.target.value)} placeholder="Ej.: formulario firmado" /></div>
        <button className="btn" onClick={handleCreate} disabled={busy}>{busy ? 'Guardando…' : 'Crear cuenta'}</button>
      </div>

      {editing.id && (
        <div className="card admin-cuentas__editor">
          <h3>Editar cuenta</h3>
          <p className="mini">Deja la nueva contraseña vacía si no deseas cambiarla.</p>
          <div className="form-grid">
            <div className="field"><label>Nombre completo</label><input value={editing.fullName} onChange={(e) => setEditing((value) => ({ ...value, fullName: e.target.value }))} /></div>
            <div className="field"><label>Correo</label><input type="email" value={editing.email} onChange={(e) => setEditing((value) => ({ ...value, email: e.target.value }))} /></div>
            <div className="field"><label>Nueva contraseña (opcional)</label><input type="password" value={editing.password} placeholder={`mín. ${MIN_CLAVE} caracteres`} onChange={(e) => setEditing((value) => ({ ...value, password: e.target.value }))} /></div>
            <div className="field"><label>Rol</label><select value={editing.role} onChange={(e) => setEditing((value) => ({ ...value, role: e.target.value }))}><option value="jugador">Jugador</option><option value="usuario">Usuario normal</option><option value="admin">Administrador</option></select></div>
            <div className="field"><label>Equipo vinculado</label><select value={editing.teamId} onChange={(e) => setEditing((value) => ({ ...value, teamId: e.target.value }))}><option value="">— sin equipo vinculado —</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
          </div>
          <div className="row-actions"><button className="btn" onClick={handleUpdate} disabled={busy}>Guardar cambios</button><button className="btn ghost" onClick={() => setEditing(VACIO_EDICION)}>Cancelar</button></div>
        </div>
      )}

      <div className="card admin-cuentas__lista">
        <h3>Cuentas creadas ({accounts.length})</h3>
        <div className="admin-cuentas__tabla">
          <table>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Equipo vinculado</th><th>Acciones</th></tr></thead>
            <tbody>{accounts.map((account) => <tr key={account.id}><td>{account.full_name || '—'}</td><td>{account.email}</td><td><span className={`rol rol-${account.role}`}>{account.role}</span></td><td>{teamName(account.team_id)}</td><td className="row-actions"><button className="pill-btn edit" onClick={() => openEdit(account)} disabled={busy}>✎ Editar</button><button className="pill-btn danger" onClick={() => handleDelete(account)} disabled={busy || account.id === profile?.id}>Eliminar</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
