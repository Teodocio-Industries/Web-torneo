import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="loading-screen">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/torneos" replace />

  return children
}
