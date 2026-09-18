import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // En GitHub Pages el sitio se sirve dentro de /Web-torneo/.
  // Localmente se mantiene en la raíz para npm run dev.
  base: process.env.GITHUB_ACTIONS ? '/Web-torneo/' : '/',
  plugins: [react()],
})
