import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import ServiciosCatalogo from '../../components/ServiciosCatalogo/ServiciosCatalogo'
import './Servicios.css'

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)
}

function soloDigitos(texto) {
  return (texto || '').replace(/[^\d]/g, '')
}

export default function Servicios() {
  const { profile } = useAuth()
  const [misAsignaciones, setMisAsignaciones] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMias = useCallback(async () => {
    const settingsRes = await supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle()
    setSettings(settingsRes.data || null)
    if (profile?.id) {
      const { data } = await supabase.from('tier_assignments').select('*, service_tiers(*)').eq('profile_id', profile.id)
      setMisAsignaciones(data || [])
    }
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { loadMias() }, [loadMias])
  useRealtimeRefresh(['tier_assignments', 'payment_settings'], loadMias, [loadMias])

  function whatsappHref(rangoNombre) {
    if (!settings?.whatsapp_number) return null
    const numero = soloDigitos(settings.whatsapp_number)
    const mensaje = `Hola, soy ${profile?.full_name || 'un usuario'}, vengo a que me den más información sobre este rango de *${rangoNombre}*.`
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
  }

  if (loading) return <div className="loading-screen">Cargando servicios…</div>

  return (
    <main className="page servicios-page">
      <section className="servicios-encabezado">
        <p className="eyebrow">Caribe Sports</p>
        <h1>Catálogo de Servicios Individuales</h1>
        <p className="mini">Maximiza tu visibilidad, imagen y rendimiento durante el torneo.</p>
      </section>

      {misAsignaciones.length > 0 && (
        <section className="mis-rangos">
          <h2>Tu(s) rango(s) asignado(s)</h2>
          {misAsignaciones.map((a) => (
            <div className="card pago-card" key={a.id}>
              <div className="pago-card__head">
                <div>
                  <span className="eyebrow">{a.service_tiers?.name}</span>
                  <h3>{formatCOP(a.price)}</h3>
                </div>
                <span className={`badge ${a.status === 'pagado' ? 'ok' : 'status-pendiente'}`}>
                  {a.status === 'pagado' ? 'Pagado' : 'Pendiente de pago'}
                </span>
              </div>

              {a.status !== 'pagado' && settings && (
                <>
                  <div className="pago-datos">
                    {settings.nequi_number && (
                      <div className="pago-datos__item">
                        <span className="mini">Nequi</span>
                        <strong>{settings.nequi_number}</strong>
                        {settings.nequi_holder && <span className="mini">{settings.nequi_holder}</span>}
                      </div>
                    )}
                    {settings.bancolombia_number && (
                      <div className="pago-datos__item">
                        <span className="mini">Bancolombia</span>
                        <strong>{settings.bancolombia_number}</strong>
                        {settings.bancolombia_holder && <span className="mini">{settings.bancolombia_holder}</span>}
                      </div>
                    )}
                  </div>

                  {whatsappHref(a.service_tiers?.name) ? (
                    <a className="btn" href={whatsappHref(a.service_tiers?.name)} target="_blank" rel="noreferrer">
                      Enviar Comprobante de Pago
                    </a>
                  ) : (
                    <p className="mini">El administrador aún no configuró el WhatsApp para recibir comprobantes.</p>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      )}

      <ServiciosCatalogo />

      {misAsignaciones.length === 0 && (
        <div className="empty">
          Dale clic a "Quiero este servicio" en el rango que te interese y te escribimos por WhatsApp para coordinar el precio y el pago.
        </div>
      )}
    </main>
  )
}