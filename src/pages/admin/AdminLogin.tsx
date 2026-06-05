// Default admin: admin@automarket.co.nz / AutoMarket2024!
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../../lib/authService'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0f0f0f',
    border: `1px solid ${focused === name ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.625rem', padding: '0.875rem 1rem',
    color: 'white', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem',
    outline: 'none', transition: 'border-color 0.2s',
  })

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px',
  }

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
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        backgroundColor: '#111111', border: '1px solid rgba(245,158,11,0.15)',
        borderRadius: '1.25rem', padding: '2.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span className="font-bebas" style={{ fontSize: '2rem', color: '#f59e0b', display: 'block', lineHeight: 1 }}>
            AutoMarket
          </span>
          <span style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Admin Panel
          </span>
        </div>

        <h1 className="font-bebas" style={{ fontSize: '2.5rem', color: 'white', textAlign: 'center', lineHeight: 1, marginBottom: '0.5rem' }}>
          Admin Access
        </h1>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '2rem' }}>
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
            <label style={labelStyle}>Email Address</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              placeholder="admin@automarket.co.nz"
              style={inputStyle('email')}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
              placeholder="••••••••••"
              style={inputStyle('pass')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '48px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
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
