import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Guards admin routes - checks Firebase auth state from AuthContext and redirects unauthenticated users to login
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F2F2F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit', color: '#1A1A1A', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
