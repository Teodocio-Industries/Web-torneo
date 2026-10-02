import { useEffect, useRef } from 'react'

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let promesaScript = null

function cargarScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!promesaScript) {
    promesaScript = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SRC
      s.async = true
      s.defer = true
      s.onload = () => resolve(window.turnstile)
      s.onerror = () => {
        promesaScript = null
        reject(new Error('No se pudo cargar la verificación anti-bots'))
      }
      document.head.appendChild(s)
    })
  }
  return promesaScript
}

/**
 * Widget de Cloudflare Turnstile (alternativa gratuita y respetuosa de la privacidad a reCAPTCHA).
 * Solo se monta si hay una clave configurada. `onToken` recibe el token (o '' si expira o falla).
 * Cambia `reiniciar` (número) para pedir un token nuevo después de un intento.
 */
export default function Turnstile({ siteKey, onToken, onError, reiniciar = 0 }) {
  const contenedor = useRef(null)
  const widgetId = useRef(null)
  const primeraVez = useRef(true)

  useEffect(() => {
    let cancelado = false
    cargarScript()
      .then((turnstile) => {
        if (cancelado || !contenedor.current || widgetId.current !== null) return
        widgetId.current = turnstile.render(contenedor.current, {
          sitekey: siteKey,
          theme: 'dark',
          language: 'es',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        })
      })
      .catch((e) => onError?.(e))
    return () => {
      cancelado = true
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch { /* ya removido */ }
      }
      widgetId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return }
    if (widgetId.current !== null && window.turnstile) {
      onToken('')
      try { window.turnstile.reset(widgetId.current) } catch { /* sin widget */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reiniciar])

  return <div ref={contenedor} className="turnstile-box" aria-label="Verificación de seguridad" />
}