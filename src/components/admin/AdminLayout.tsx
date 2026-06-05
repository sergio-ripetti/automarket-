import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Car, CreditCard, ShoppingBag, Mail, Bot, ExternalLink, LogOut,
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

  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: '260px', backgroundColor: '#0a0a0a',
        borderRight: '1px solid rgba(245,158,11,0.15)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
        overflowY: 'auto',
      }}>
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

      {/* ── Main content ── */}
      <main style={{
        marginLeft: '260px', padding: '2rem',
        backgroundColor: '#0f0f0f', minHeight: '100vh', flex: 1,
      }}>
        {children}
      </main>
    </div>
  )
}
