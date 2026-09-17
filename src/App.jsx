import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Torneos from './pages/Torneos/Torneos'
import Jugadores from './pages/Jugadores/Jugadores'
import JugadorDetalle from './pages/JugadorDetalle/JugadorDetalle'
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
        <Route path="/jugadores/:playerId" element={<ProtectedRoute><JugadorDetalle /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
      </Routes>
    </>
  )
}
