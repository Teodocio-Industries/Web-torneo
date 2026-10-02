import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh'
import { enlaceWhatsApp, formatoCOP, resolverRangos } from '../../lib/tiers'
import ConsentCheck, { EnlaceLegal } from '../ConsentCheck/ConsentCheck'
import './ServiciosCatalogo.css'

/* Iconos de línea (los del catálogo original), decorativos: el nombre del rango ya lo dice el título. */
const ICONOS = {
  camera: (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 16a3 3 0 0 1 3-3h6l3-4h12l3 4h6a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
      <circle cx="24" cy="25" r="8" />
      <circle cx="24" cy="25" r="3.5" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="m24 5 5.6 12.1 13.2 1.5-9.8 9 2.7 13L24 33.9 12.3 40.6l2.7-13-9.8-9 13.2-1.5z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5v38h38" />
      <rect x="11" y="28" width="6" height="11" />
      <rect x="21" y="21" width="6" height="18" />
      <rect x="31" y="26" width="6" height="13" />
      <path d="m10 20 9-8 7 5 12-11" />
      <path d="M32 6h6v6" />
    </svg>
  ),
}

/** Tarjeta de ejemplo del Player Spotlight. Datos ficticios, marcados como tal. */
function EjemploSpotlight() {
  return (
    <figure className="spotlight-ejemplo">
      <div className="spotlight-ejemplo__card">
        <div className="spotlight-ejemplo__banda">DESTACADO DEL JUGADOR</div>
        <p className="spotlight-ejemplo__nombre">Jugador Ejemplo — Club Ejemplo</p>
        <p className="spotlight-ejemplo__stats">26 PTS | 6 AST | 5 REB</p>
        <p className="spotlight-ejemplo__texto">Actuación destacada de la jornada</p>
      </div>
      <figcaption>Ejemplo ilustrativo con datos ficticios.</figcaption>
    </figure>
  )
}

function PagoRango({ asignacion, settings, nombreRango, nombrePersona, puedeContactar }) {
  const pagado = asignacion.status === 'pagado'
  const href = enlaceWhatsApp(settings?.whatsapp_number, nombrePersona, nombreRango)
  return (
    <div className="tier-card__pago">
      <div className="tier-card__pago-head">
        <div>
          <span className="tier-card__pago-label">Tu precio acordado</span>
          <strong className="tier-card__precio">{asignacion.price > 0 ? formatoCOP(asignacion.price) : 'Por confirmar'}</strong>
        </div>
        <span className={`badge ${pagado ? 'ok' : 'status-pendiente'}`}>{pagado ? 'Pagado' : 'Pendiente de pago'}</span>
      </div>

      {!pagado && settings && (
        <>
          <div className="tier-card__datos-pago">
            {settings.nequi_number && (
              <div><span>Nequi</span><strong>{settings.nequi_number}</strong>{settings.nequi_holder && <small>{settings.nequi_holder}</small>}</div>
            )}
            {settings.bancolombia_number && (
              <div><span>Bancolombia</span><strong>{settings.bancolombia_number}</strong>{settings.bancolombia_holder && <small>{settings.bancolombia_holder}</small>}</div>
            )}
          </div>
          <p className="tier-card__aviso">
            Paga solo a los datos que ves aquí dentro de tu cuenta. Nunca te pediremos claves, códigos ni datos de tu banco.
          </p>
          {href && puedeContactar ? (
            <a className="tier-card__cta" href={href} target="_blank" rel="noopener noreferrer">
              Enviar comprobante de pago<span className="visually-hidden"> de {nombreRango} por WhatsApp (se abre en una pestaña nueva)</span>
            </a>
          ) : (
            <button type="button" className="tier-card__cta" disabled>
              Enviar comprobante de pago<span className="visually-hidden"> de {nombreRango}</span>
            </button>
          )}
          {!href && <p className="tier-card__aviso">La organización aún no configuró el WhatsApp para recibir comprobantes.</p>}
        </>
      )}
    </div>
  )
}

/**
 * Catálogo de servicios individuales (Content Package / Player Spotlight / Player Performance).
 *
 * Regla de rangos: si la cuenta tiene rangos asignados, solo se muestran los suyos (con su precio,
 * estado de pago y datos para transferir). Si no tiene ninguno, se muestra el catálogo completo con
 * el botón para pedir información por WhatsApp.
 *
 * Antes de abrir WhatsApp (que recibe el nombre de la persona) se pide aceptar términos, privacidad y reembolsos.
 */
export default function ServiciosCatalogo({ title, subtitle }) {
  const { profile } = useAuth()
  const [tiers, setTiers] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acepta, setAcepta] = useState(false)
  const idAyuda = useId()

  const loadAll = useCallback(async () => {
    const [tiersRes, settingsRes, asignRes] = await Promise.all([
      supabase.from('service_tiers').select('id, key, name, tagline, icon, features, price_note, sort_order, active').eq('active', true).order('sort_order'),
      supabase.from('payment_settings').select('nequi_number, nequi_holder, bancolombia_number, bancolombia_holder, whatsapp_number').eq('id', 1).maybeSingle(),
      profile?.id
        ? supabase.from('tier_assignments').select('id, tier_id, price, status').eq('profile_id', profile.id)
        : Promise.resolve({ data: [] }),
    ])
    setTiers(tiersRes.data || [])
    setSettings(settingsRes.data || null)
    setAsignaciones(asignRes.data || [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { loadAll() }, [loadAll])
  useRealtimeRefresh(['service_tiers', 'payment_settings', 'tier_assignments'], loadAll, [loadAll])

  if (loading) return null
  const { tieneRango, visibles } = resolverRangos(tiers, asignaciones)
  if (visibles.length === 0) return null

  const hayWhatsApp = Boolean(settings?.whatsapp_number)

  return (
    <section className="servicios-catalogo" aria-label={title ? undefined : 'Servicios individuales'}>
      {title && <h2>{title}</h2>}
      {subtitle && <p className="mini">{subtitle}</p>}
      {tieneRango && (
        <p className="servicios-catalogo__estado">
          {visibles.length === 1 ? 'Este es tu servicio contratado.' : 'Estos son tus servicios contratados.'}
        </p>
      )}

      <div className="servicios-consent">
        <ConsentCheck checked={acepta} onChange={setAcepta} required={false}>
          He leído y acepto los <EnlaceLegal a="terminos">términos y condiciones</EnlaceLegal>, la <EnlaceLegal a="privacidad">política de privacidad</EnlaceLegal> y
          la <EnlaceLegal a="reembolsos">política de reembolsos y retracto</EnlaceLegal>. Entiendo que al continuar se abrirá WhatsApp y se compartirá mi nombre con Caribe Sports.
        </ConsentCheck>
      </div>

      <div className="servicios-grid">
        {visibles.map(({ tier, asignacion }) => {
          const href = enlaceWhatsApp(settings?.whatsapp_number, profile?.full_name, tier.name)
          return (
            <article className={`tier-card tier-card--${tier.key}`} key={tier.id} aria-labelledby={`tier-${tier.id}`}>
              <div className="tier-card__head">
                <span className="tier-card__icon">{ICONOS[tier.icon] || ICONOS.star}</span>
                <h3 id={`tier-${tier.id}`}>{tier.name}</h3>
              </div>
              <p className="tier-card__tagline">{tier.tagline}</p>
              <ul>
                {(tier.features || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              {tier.price_note && <p className="tier-card__note">*{tier.price_note}</p>}
              {tier.key === 'player_spotlight' && <EjemploSpotlight />}

              {asignacion ? (
                <PagoRango
                  asignacion={asignacion}
                  settings={settings}
                  nombreRango={tier.name}
                  nombrePersona={profile?.full_name}
                  puedeContactar={acepta}
                />
              ) : href && acepta ? (
                <a className="tier-card__cta" href={href} target="_blank" rel="noopener noreferrer">
                  Quiero este servicio<span className="visually-hidden">: {tier.name}. Se abre WhatsApp en una pestaña nueva</span>
                </a>
              ) : (
                <>
                  <button type="button" className="tier-card__cta" disabled aria-describedby={idAyuda}>
                    Quiero este servicio<span className="visually-hidden">: {tier.name}</span>
                  </button>
                  <p className="tier-card__aviso" id={idAyuda}>
                    {hayWhatsApp ? 'Acepta las condiciones de arriba para continuar.' : 'La organización aún no configuró el WhatsApp de contacto.'}
                  </p>
                </>
              )}
            </article>
          )
        })}
      </div>

      <p className="servicios-catalogo__legal">
        El precio de cada servicio se acuerda por escrito antes de pagar y puede variar según la cantidad y calidad del material. Caribe Sports no garantiza un número de vistas, alcance ni interacciones en redes sociales,
        ni resultados deportivos.
      </p>
    </section>
  )
}
