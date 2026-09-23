import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import './Servicios.css'

const ICONS = { camera: '📸', star: '⭐', chart: '📈' }

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)
}

function soloDigitos(texto) {
  return (texto || '').replace(/[^\d]/g, '')
}

export default function Servicios() {
  const { profile } = useAuth()
  const [tiers, setTiers] = useState([])
  const [misAsignaciones, setMisAsignaciones] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [tiersRes, settingsRes] = await Promise.all([
      supabase.from('service_tiers').select('*').eq('active', true).order('sort_order'),
      supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    setTiers(tiersRes.data || [])
    setSettings(settingsRes.data || null)
    if (profile?.id) {
      const { data } = await supabase.from('tier_assignments').select('*, service_tiers(*)').eq('profile_id', profile.id)
      setMisAsignaciones(data || [])
    }
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { loadAll() }, [loadAll])
  useRealtimeRefresh(['tier_assignments', 'service_tiers', 'payment_settings'], loadAll, [loadAll])

  if (loading) return <div className="loading-screen">Cargando servicios…</div>

  function whatsappHref(rangoNombre) {
    if (!settings?.whatsapp_number) return null
    const numero = soloDigitos(settings.whatsapp_number)
    const mensaje = `Hola, soy ${profile?.full_name || 'un usuario'}, vengo a que me den más información sobre este rango de *${rangoNombre}*.`
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
  }

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

      <section className="servicios-grid">
        {tiers.map((tier) => (
          <div className={`tier-card tier-card--${tier.key}`} key={tier.id}>
            <div className="tier-card__head">
              <span className="tier-card__icon">{ICONS[tier.icon] || '⭐'}</span>
              <h3>{tier.name}</h3>
            </div>
            <p className="tier-card__tagline">{tier.tagline}</p>
            <ul>
              {(tier.features || []).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {tier.price_note && <p className="tier-card__note">*{tier.price_note}</p>}

            {whatsappHref(tier.name) ? (
              <a className="tier-card__cta" href={whatsappHref(tier.name)} target="_blank" rel="noreferrer">
                Quiero este servicio →
              </a>
            ) : (
              <p className="tier-card__note">El administrador aún no configuró el WhatsApp de contacto.</p>
            )}
          </div>
        ))}
      </section>

      {misAsignaciones.length === 0 && (
        <div className="empty">
          Dale clic a "Quiero este servicio" en el rango que te interese y te escribimos por WhatsApp para coordinar el precio y el pago.
        </div>
      )}
    </main>
  )
}