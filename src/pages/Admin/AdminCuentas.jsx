import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast/Toast'
import ConsentCheck, { EnlaceLegal } from '../../components/ConsentCheck/ConsentCheck'
import { VERSION_POLITICAS } from '../../config/negocio'

const MIN_CLAVE = 10

export default function AdminCuentas() {
  const toast = useToast()
  const { profile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('jugador')
  const [autorizado, setAutorizado] = useState(false)
  const [esMenor, setEsMenor] = useState(false)
  const [representante, setRepresentante] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate() {
    if (!email.trim() || !password || !fullName.trim()) return toast('Completa todos los campos', 'err')
    if (password.length < MIN_CLAVE) return toast(`La contraseña debe tener al menos ${MIN_CLAVE} caracteres`, 'err')
    if (!autorizado) return toast('Confirma que la persona autorizó el tratamiento de sus datos', 'err')
    if (esMenor && !representante.trim()) return toast('Indica el nombre del representante legal del menor', 'err')
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: email.trim(), password, full_name: fullName.trim(), role },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      // Constancia de la autorización (Decreto 1377/2013: debe poder probarse). Si la tabla aún no existe, no se bloquea la creación.
      const { error: errConsent } = await supabase.from('consent_records').insert({
        subject_name: fullName.trim(),
        subject_email: email.trim(),
        is_minor: esMenor,
        guardian_name: esMenor ? representante.trim() : null,
        kind: 'tratamiento_datos',
        policy_version: VERSION_POLITICAS,
        evidence_note: evidencia.trim() || null,
        recorded_by: profile?.id ?? null,
      })
      if (errConsent) toast('Cuenta creada, pero no se pudo guardar la constancia de autorización. Aplica la migración de consentimientos.', 'err')
      else toast('Cuenta creada: ' + email, 'ok')

      setFullName(''); setEmail(''); setPassword(''); setAutorizado(false)
      setEsMenor(false); setRepresentante(''); setEvidencia('')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Crear cuenta de acceso (jugador / usuario / admin)</h3>
      <p className="mini">Solo un administrador puede crear cuentas. Luego puedes vincularla a un jugador del roster desde la pestaña Jugadores. Entrega la contraseña por un canal privado y pídele a la persona que la cambie.</p>
      <div className="form-grid">
        <div className="field"><label>Nombre completo</label><input value={fullName} maxLength={120} autoComplete="off" onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="field"><label>Correo</label><input type="email" value={email} maxLength={254} autoComplete="off" onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>Contraseña</label><input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} placeholder={`mín. ${MIN_CLAVE} caracteres`} /></div>
        <div className="field">
          <label>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="jugador">Jugador</option>
            <option value="usuario">Usuario normal</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      <ConsentCheck checked={autorizado} onChange={setAutorizado} required={false}>
        Confirmo que la persona (o su representante legal, si es menor de 18 años) fue informada y me dio su autorización previa y expresa para tratar sus datos según la{' '}
        <EnlaceLegal a="privacidad">política de privacidad</EnlaceLegal>, y que conservo la prueba de esa autorización.
      </ConsentCheck>
      <ConsentCheck checked={esMenor} onChange={setEsMenor} required={false}>
        La persona es menor de 18 años y su representante legal dio la autorización.
      </ConsentCheck>
      {esMenor && (
        <div className="form-grid">
          <div className="field"><label>Nombre del representante legal</label><input value={representante} maxLength={120} onChange={(e) => setRepresentante(e.target.value)} /></div>
        </div>
      )}
      <div className="form-grid">
        <div className="field"><label>Dónde está la prueba (opcional)</label><input value={evidencia} maxLength={300} onChange={(e) => setEvidencia(e.target.value)} placeholder="Ej.: chat de WhatsApp del 01/10/2026, formulario firmado" /></div>
      </div>

      <button className="btn" onClick={handleCreate} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
    </div>
  )
}