import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Content-Security-Policy.
 *
 * GitHub Pages no permite configurar cabeceras HTTP, así que la política se
 * inyecta como <meta http-equiv> SOLO en el build de producción (en desarrollo
 * Vite necesita scripts en línea para el recargado en caliente).
 *
 * Qué permite:
 *  - Scripts y fuentes: solo del propio sitio (las fuentes ya se sirven locales).
 *  - Conexiones: solo al proyecto Supabase (REST, auth, storage y websockets).
 *  - Cloudflare Turnstile: únicamente si VITE_TURNSTILE_SITE_KEY está definida.
 *  - Imágenes: https: (los administradores pueden enlazar logos externos).
 *  - Estilos en línea: React y Recharts aplican atributos style.
 */
function cspPlugin(env) {
  return {
    name: 'caribe-csp',
    apply: 'build',
    transformIndexHtml(html) {
      let supabaseOrigin = 'https://*.supabase.co'
      let supabaseWs = 'wss://*.supabase.co'
      try {
        const u = new URL(env.VITE_SUPABASE_URL)
        supabaseOrigin = u.origin
        supabaseWs = `wss://${u.host}`
      } catch {
        /* sin URL válida: se deja el comodín de supabase.co */
      }
      const turnstile = env.VITE_TURNSTILE_SITE_KEY ? ' https://challenges.cloudflare.com' : ''
      const directives = [
        "default-src 'self'",
        `script-src 'self'${turnstile}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self'",
        `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
        `frame-src ${turnstile ? 'https://challenges.cloudflare.com' : "'none'"}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ]
      const meta = `    <meta http-equiv="Content-Security-Policy" content="${directives.join('; ')}" />\n`
      return html.replace('<meta name="referrer"', `${meta}    <meta name="referrer"`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    // En GitHub Pages el sitio se sirve dentro de /Web-torneo/.
    // Localmente se mantiene en la raíz para npm run dev.
    base: process.env.GITHUB_ACTIONS ? '/Web-torneo/' : '/',
    plugins: [react(), cspPlugin(env)],
  }
})