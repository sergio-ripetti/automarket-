import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../../lib/authService'
import { FormInput, FormLabel, FormError } from '../../components/shared'

// Admin login page - renders the sign-in form and delegates credential verification to Firebase Authentication
export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


  // Handles admin login form submission - takes email/password, authenticates via Firebase, and redirects to the admin dashboard on success
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAdmin(email, password)
      navigate('/admin')
    } catch {
      setError('Invalid credentials. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        backgroundColor: '#FFFFFF', border: '1px solid #E0E0DC',
        borderRadius: '1.25rem', padding: '2.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span className="font-bebas" style={{ fontSize: '2rem', color: '#1A1A1A', display: 'block', lineHeight: 1 }}>
            AutoMarket
          </span>
          <span style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Admin Panel
          </span>
        </div>

        <h1 className="font-bebas" style={{color: "#1A1A1A", textAlign: 'center', lineHeight: 1, marginBottom: '0.5rem' }}>
          Admin Access
        </h1>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: '#767676', textAlign: 'center', marginBottom: '2rem' }}>
          Sign in to manage your inventory
        </p>

        {error && (
          <div style={{
            backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
            color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem',
            fontFamily: 'Outfit', fontSize: '0.85rem', marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <FormLabel>Email Address</FormLabel>
            <FormInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@automarket.co.nz"
            />
          </div>

          <div>
            <FormLabel>Password</FormLabel>
            <FormInput
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '48px',
              background: '#1A1A1A',
              color: '#FFFFFF', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: '0.95rem',
              borderRadius: '0.75rem', border: 'none',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
