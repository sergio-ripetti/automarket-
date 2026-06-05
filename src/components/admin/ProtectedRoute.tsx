import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit', color: '#f59e0b', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
