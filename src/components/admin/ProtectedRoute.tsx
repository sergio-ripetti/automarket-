import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Guards admin routes - checks Firebase auth state from AuthContext and redirects unauthenticated users to login
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F4F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit', color: '#2C6E9E', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
