import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'

export default function AdminCuentas() {
  const toast = useToast()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('jugador')
  const [busy, setBusy] = useState(false)

  async function handleCreate() {
    if (!email.trim() || !password || !fullName.trim()) return toast('Completa todos los campos', 'err')
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: email.trim(), password, full_name: fullName.trim(), role },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast('Cuenta creada: ' + email, 'ok')
      setFullName(''); setEmail(''); setPassword('')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Crear cuenta de acceso (jugador / usuario / admin)</h3>
      <p className="mini">Solo un administrador puede crear cuentas. Luego puedes vincularla a un jugador del roster desde la pestaña Jugadores.</p>
      <div className="form-grid">
        <div className="field"><label>Nombre completo</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="field"><label>Correo</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>Contraseña</label><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 6 caracteres" /></div>
        <div className="field">
          <label>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="jugador">Jugador</option>
            <option value="usuario">Usuario normal</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>
      <button className="btn" onClick={handleCreate} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button>
    </div>
  )
}
