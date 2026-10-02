import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Torneos from './pages/Torneos/Torneos'
import Jugadores from './pages/Jugadores/Jugadores'
import Servicios from './pages/Servicios/Servicios'
import PlayerProfile from './pages/PlayerProfile/PlayerProfile'
import CatalogPlayerProfile from './pages/PlayerProfile/CatalogPlayerProfile'
import Admin from './pages/Admin/Admin'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
        <Route path="/jugadores" element={<ProtectedRoute><Jugadores /></ProtectedRoute>} />
        <Route path="/servicios" element={<ProtectedRoute><Servicios /></ProtectedRoute>} />
        <Route path="/jugador/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
        <Route path="/jugador-biblioteca/:id" element={<ProtectedRoute role="admin"><CatalogPlayerProfile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
      </Routes>
    </>
  )
}