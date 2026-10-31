import { Link } from 'react-router-dom'
import LegalLayout, { Neg } from './LegalLayout'
import { RUTAS_LEGALES, TURNSTILE_SITE_KEY } from '../../config/negocio'

// La sesión de Supabase se guarda con una clave basada en el identificador del proyecto.
function claveSesion() {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
    return `sb-${host}-auth-token`
  } catch {
    return 'sb-<proyecto>-auth-token'
  }
}

export default function Cookies() {
  return (
    <LegalLayout
      titulo="Política de cookies y almacenamiento local"
      resumen="Solo usamos almacenamiento técnico indispensable para mantener tu sesión y proteger el acceso. No usamos cookies de analítica, publicidad ni seguimiento, por eso no te mostramos un banner de aceptación."
    >
      <h2>1. Qué son</h2>
      <p>
        Son pequeños datos que un sitio guarda en tu navegador (cookies o almacenamiento local) para recordar información entre visitas. En Colombia, cuando estas tecnologías recogen datos personales se aplica la
        Ley 1581 de 2012; por eso te informamos qué guardamos y para qué.
      </p>

      <h2>2. Qué guardamos</h2>
      <div className="legal__tabla-scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué sirve</th><th>Cuánto dura</th></tr></thead>
          <tbody>
            <tr><td><code>{claveSesion()}</code></td><td>Propio · almacenamiento local · necesario</td><td>Mantiene tu sesión iniciada y renueva el acceso de forma segura.</td><td>Hasta que cierres sesión o expire.</td></tr>
            <tr><td><code>cs_login_guard</code></td><td>Propio · almacenamiento local · necesario (seguridad)</td><td>Cuenta intentos fallidos de inicio de sesión para frenar adivinación de contraseñas en este dispositivo.</td><td>Se reinicia a los 15 minutos del primer fallo o al iniciar sesión correctamente.</td></tr>
            {TURNSTILE_SITE_KEY && (
              <tr><td>Cloudflare Turnstile</td><td>De tercero · necesario (seguridad)</td><td>Verifica que quien inicia sesión no es un robot. Solo se carga en la pantalla de inicio de sesión.</td><td>Según Cloudflare.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>3. Qué NO usamos</h2>
      <ul>
        <li>Cookies o herramientas de analítica (Google Analytics, píxeles de Meta, Hotjar o similares).</li>
        <li>Publicidad, remarketing ni seguimiento entre sitios.</li>
        <li>Fuentes, mapas o videos incrustados de terceros: las tipografías se sirven desde este mismo sitio.</li>
        <li>Botones o plugins de redes sociales. Los enlaces a WhatsApp solo abren WhatsApp cuando tú los pulsas.</li>
      </ul>

      <h2>4. Consentimiento</h2>
      <p>
        Como solo se usa almacenamiento técnico indispensable para el servicio que tú solicitas al iniciar sesión, no se muestra un banner de aceptación: te informamos aquí y en la pantalla de inicio de sesión. Si en el futuro
        agregáramos cookies de analítica, publicidad u otras no esenciales, <strong>las activaremos solo después de que las aceptes</strong> mediante un aviso con opción de rechazar, y actualizaremos esta página.
      </p>

      <h2>5. Cómo borrarlas o bloquearlas</h2>
      <p>
        Cerrar sesión elimina la sesión guardada. También puedes borrar los datos del sitio desde la configuración de tu navegador. Si bloqueas el almacenamiento local, no podrás mantener la sesión iniciada.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Dudas sobre esta política: <Neg campo="email" />. Más sobre el tratamiento de tus datos en la <Link to={RUTAS_LEGALES.privacidad}>política de privacidad</Link>.
      </p>
    </LegalLayout>
  )
}