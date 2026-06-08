import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Car, CreditCard, ShoppingBag, Mail, Bot, ExternalLink, LogOut, Menu, X,
} from 'lucide-react'
import { logoutAdmin } from '../../lib/authService'

interface AdminLayoutProps { children: React.ReactNode }

const linkBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.75rem',
  padding: '0.75rem 1rem', borderRadius: '0.625rem',
  fontFamily: 'Outfit, sans-serif', fontSize: '0.875rem',
  cursor: 'pointer', transition: 'all 0.2s', marginBottom: '0.25rem',
  textDecoration: 'none', border: 'none', background: 'none', width: '100%',
  textAlign: 'left' as const,
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/admin',             end: true },
  { icon: Car,             label: 'Inventory',    to: '/admin/cars',        end: false },
  { icon: CreditCard,      label: 'Financing',    to: '/admin/financing',   end: false },
  { icon: ShoppingBag,     label: 'Sales',        to: '/admin/sales',       end: false },
  { icon: Bot,             label: 'AI Assistant', to: '/admin/ai',          end: false },
  { icon: Mail,            label: 'Messages',     to: '/admin/messages',    end: false },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024)

  // Update isMobile on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar when location changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen, isMobile])

  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  const closeSidebar = () => setSidebarOpen(false)
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ─── SIDEBAR BACKDROP (Mobile only) ─── */}
      {sidebarOpen && isMobile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: isMobile && !sidebarOpen ? 0 : '260px',
          backgroundColor: '#0a0a0a',
          borderRight: '1px solid rgba(245,158,11,0.15)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          position: isMobile ? 'fixed' : 'fixed',
          top: 0,
          left: isMobile && !sidebarOpen ? '-260px' : 0,
          height: '100vh',
          zIndex: 100,
          overflowY: 'auto',
          transition: 'all 0.3s ease',
          maxWidth: '80vw',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
          <span className="font-bebas" style={{ fontSize: '1.5rem', color: '#f59e0b', display: 'block' }}>
            AutoMarket
          </span>
          <span style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Admin Panel
          </span>
        </div>

        {/* Nav links */}
        {navItems.map(({ icon: Icon, label, to, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeSidebar}
            style={({ isActive }) => ({
              ...linkBase,
              ...(isActive
                ? {
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    color: '#f59e0b',
                    borderLeft: '3px solid #f59e0b',
                    paddingLeft: 'calc(1rem - 3px)',
                  }
                : { color: 'rgba(255,255,255,0.5)' }),
            })}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto' }} />

        {/* View Site */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...linkBase, color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}
        >
          <ExternalLink size={17} />
          View Site
        </a>

        {/* Sign Out */}
        <button onClick={handleLogout} style={{ ...linkBase, color: 'rgba(255,255,255,0.4)' }}>
          <LogOut size={17} />
          Sign Out
        </button>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main
        style={{
          marginLeft: isMobile ? 0 : '260px',
          padding: isMobile ? '3.5rem 1rem 2rem' : '2rem',
          backgroundColor: '#0f0f0f',
          minHeight: '100vh',
          flex: 1,
          width: isMobile ? '100%' : 'auto',
        }}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: '#1a1a1a',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={toggleSidebar}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
              }}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
