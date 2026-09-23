import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import './AdminServicios.css'

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)
}

const SETTINGS_FIELDS = [
  { key: 'nequi_number', label: 'Número Nequi', placeholder: 'Ej: 300 123 4567' },
  { key: 'nequi_holder', label: 'Titular Nequi', placeholder: 'Nombre a quien está registrado' },
  { key: 'bancolombia_number', label: 'Cuenta Bancolombia', placeholder: 'Ej: 000-000000-00' },
  { key: 'bancolombia_holder', label: 'Titular Bancolombia', placeholder: 'Nombre a quien está registrada' },
  { key: 'whatsapp_number', label: 'WhatsApp para comprobantes', placeholder: 'Con código de país, ej: 573001234567' },
]

export default function AdminServicios() {
  const toast = useToast()
  const confirm = useConfirm()
  const [tiers, setTiers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [priceInput, setPriceInput] = useState('')
  const [busyCell, setBusyCell] = useState(null)

  const loadAll = useCallback(async () => {
    const [tiersRes, accountsRes, assignRes, settingsRes] = await Promise.all([
      supabase.from('service_tiers').select('*').order('sort_order'),
      supabase.from('profiles').select('*').in('role', ['jugador', 'usuario']).order('full_name'),
      supabase.from('tier_assignments').select('*'),
      supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    setTiers(tiersRes.data || [])
    setAccounts(accountsRes.data || [])
    setAssignments(assignRes.data || [])
    setSettings(
      settingsRes.data || {
        nequi_number: '', nequi_holder: '', bancolombia_number: '', bancolombia_holder: '', whatsapp_number: '',
      }
    )
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useRealtimeRefresh(['service_tiers', 'tier_assignments', 'payment_settings'], loadAll, [loadAll])

  function findAssignment(profileId, tierId) {
    return assignments.find((a) => a.profile_id === profileId && a.tier_id === tierId)
  }

  function startAssign(profileId, tierId, current) {
    setEditingCell({ profileId, tierId })
    setPriceInput(current ? String(current.price) : '')
  }

  function cancelEdit() {
    setEditingCell(null)
    setPriceInput('')
  }

  async function saveAssign(profileId, tierId) {
    const price = Number(priceInput)
    if (priceInput === '' || Number.isNaN(price) || price < 0) {
      toast('Ingresa un precio válido', 'err')
      return
    }
    const cellKey = `${profileId}-${tierId}`
    setBusyCell(cellKey)
    const existing = findAssignment(profileId, tierId)
    const { error } = existing
      ? await supabase.from('tier_assignments').update({ price }).eq('id', existing.id)
      : await supabase.from('tier_assignments').insert({ profile_id: profileId, tier_id: tierId, price })
    setBusyCell(null)
    if (error) {
      toast('No se pudo guardar: ' + error.message, 'err')
      return
    }
    toast(existing ? 'Precio actualizado' : 'Rango asignado', 'ok')
    cancelEdit()
    await loadAll()
  }

  async function removeAssign(assignment) {
    const ok = await confirm('¿Quitar este rango asignado? La cuenta dejará de ver la pantalla de pago para este servicio.', { title: 'Quitar rango' })
    if (!ok) return
    const { error } = await supabase.from('tier_assignments').delete().eq('id', assignment.id)
    if (error) { toast('Error: ' + error.message, 'err'); return }
    toast('Rango quitado', 'ok')
    await loadAll()
  }

  async function toggleStatus(assignment) {
    const next = assignment.status === 'pagado' ? 'pendiente' : 'pagado'
    const { error } = await supabase.from('tier_assignments').update({ status: next }).eq('id', assignment.id)
    if (error) { toast('Error: ' + error.message, 'err'); return }
    await loadAll()
  }

  async function saveSettings() {
    setSavingSettings(true)
    const { error } = await supabase.from('payment_settings').update({
      nequi_number: settings.nequi_number,
      nequi_holder: settings.nequi_holder,
      bancolombia_number: settings.bancolombia_number,
      bancolombia_holder: settings.bancolombia_holder,
      whatsapp_number: settings.whatsapp_number,
    }).eq('id', 1)
    setSavingSettings(false)
    if (error) { toast('Error al guardar: ' + error.message, 'err'); return }
    toast('Datos de pago actualizados', 'ok')
  }

  if (loading || !settings) return <div className="loading-screen">Cargando servicios…</div>

  return (
    <div className="admin-servicios">
      <div className="card">
        <h3>Datos de pago</h3>
        <p className="mini">
          Esto es lo que verá una cuenta en la pantalla de pago cuando le asignes un rango. No es una pasarela de
          pago: la persona transfiere manualmente a estos datos y luego envía su comprobante por WhatsApp.
        </p>
        <div className="form-grid">
          {SETTINGS_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input
                value={settings[f.key] || ''}
                placeholder={f.placeholder}
                onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button className="btn" onClick={saveSettings} disabled={savingSettings}>
          {savingSettings ? 'Guardando…' : 'Guardar datos de pago'}
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 18 }}>
          <h3>Asignar rangos a cuentas</h3>
          <p className="mini">
            Haz clic en "+ Asignar" junto a la cuenta y el rango, ingresa el precio acordado y guarda. La cuenta
            verá su rango, el precio y los datos de pago apenas entre a "Servicios". Haz clic en el estado
            (Pendiente/Pagado) para marcarlo cuando confirmes el comprobante.
          </p>
        </div>
        {accounts.length === 0 ? (
          <div className="empty">No hay cuentas de jugadores/usuarios todavía.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  {tiers.map((t) => <th key={t.id}>{t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <strong>{acc.full_name}</strong>
                      <div className="mini">{acc.email} · <span className={`rol rol-${acc.role}`}>{acc.role}</span></div>
                    </td>
                    {tiers.map((tier) => {
                      const current = findAssignment(acc.id, tier.id)
                      const isEditing = editingCell?.profileId === acc.id && editingCell?.tierId === tier.id
                      const cellKey = `${acc.id}-${tier.id}`
                      return (
                        <td key={tier.id}>
                          {isEditing ? (
                            <div className="rango-edit">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                placeholder="Precio COP"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                autoFocus
                              />
                              <div className="rango-edit__actions">
                                <button className="btn small" disabled={busyCell === cellKey} onClick={() => saveAssign(acc.id, tier.id)}>
                                  {busyCell === cellKey ? '…' : 'Guardar'}
                                </button>
                                <button className="btn ghost small" onClick={cancelEdit}>Cancelar</button>
                              </div>
                            </div>
                          ) : current ? (
                            <div className="rango-chip">
                              <button
                                type="button"
                                className={`badge ${current.status === 'pagado' ? 'ok' : 'status-pendiente'}`}
                                onClick={() => toggleStatus(current)}
                                title="Clic para cambiar entre pendiente y pagado"
                              >
                                {current.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                              </button>
                              <span className="rango-chip__price">{formatCOP(current.price)}</span>
                              <div className="rango-chip__actions">
                                <button className="btn ghost small" onClick={() => startAssign(acc.id, tier.id, current)}>Editar</button>
                                <button className="btn ghost small" onClick={() => removeAssign(current)}>Quitar</button>
                              </div>
                            </div>
                          ) : (
                            <button className="btn ghost small" onClick={() => startAssign(acc.id, tier.id, null)}>+ Asignar</button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}