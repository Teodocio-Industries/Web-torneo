import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Torneos from './pages/Torneos/Torneos'
import Jugadores from './pages/Jugadores/Jugadores'
import Servicios from './pages/Servicios/Servicios'
import PlayerProfile from './pages/PlayerProfile/PlayerProfile'
import CatalogPlayerProfile from './pages/PlayerProfile/CatalogPlayerProfile'
import Admin from './pages/Admin/Admin'
import Privacidad from './pages/Legal/Privacidad'
import Terminos from './pages/Legal/Terminos'
import Cookies from './pages/Legal/Cookies'
import Reembolsos from './pages/Legal/Reembolsos'
import ProtectedRoute from './components/ProtectedRoute'
import { iniciarEtiquetadoAutomatico } from './lib/accesibilidad'

// Con HashRouter un enlace "#contenido" cambiaría la ruta, así que el salto se hace enfocando <main>.
function irAlContenido() {
  const main = document.querySelector('main')
  if (!main) return
  main.setAttribute('tabindex', '-1')
  main.focus()
  main.scrollIntoView()
}

export default function App() {
  useEffect(() => iniciarEtiquetadoAutomatico(), [])
  return (
    <>
      <button type="button" className="skip-link" onClick={irAlContenido}>Saltar al contenido</button>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/reembolsos" element={<Reembolsos />} />
        <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
        <Route path="/jugadores" element={<ProtectedRoute><Jugadores /></ProtectedRoute>} />
        <Route path="/servicios" element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
        <Route path="/jugador/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
        <Route path="/jugador-biblioteca/:id" element={<ProtectedRoute role="admin"><CatalogPlayerProfile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  )
}