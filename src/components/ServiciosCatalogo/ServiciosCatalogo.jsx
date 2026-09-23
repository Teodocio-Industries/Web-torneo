import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import './ServiciosCatalogo.css'

const ICONS = { camera: '📸', star: '⭐', chart: '📈' }

function soloDigitos(texto) {
  return (texto || '').replace(/[^\d]/g, '')
}

/**
 * Catálogo de rangos (Content Package / Player Spotlight / Player Performance)
 * con un botón que abre WhatsApp con un mensaje precargado. Se usa tanto en
 * el Inicio (para cuentas logueadas) como en la página completa de Servicios.
 */
export default function ServiciosCatalogo({ title, subtitle }) {
  const { profile } = useAuth()
  const [tiers, setTiers] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [tiersRes, settingsRes] = await Promise.all([
      supabase.from('service_tiers').select('*').eq('active', true).order('sort_order'),
      supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    setTiers(tiersRes.data || [])
    setSettings(settingsRes.data || null)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useRealtimeRefresh(['service_tiers', 'payment_settings'], loadAll, [loadAll])

  function whatsappHref(rangoNombre) {
    if (!settings?.whatsapp_number) return null
    const numero = soloDigitos(settings.whatsapp_number)
    const mensaje = `Hola, soy ${profile?.full_name || 'un usuario'}, vengo a que me den más información sobre este rango de *${rangoNombre}*.`
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
  }

  if (loading) return null
  if (tiers.length === 0) return null

  return (
    <section className="servicios-catalogo">
      {title && <h2>{title}</h2>}
      {subtitle && <p className="mini">{subtitle}</p>}
      <div className="servicios-grid">
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
      </div>
    </section>
  )
}