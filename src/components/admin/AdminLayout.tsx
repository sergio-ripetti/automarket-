import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Car, CreditCard, ShoppingBag, Mail, Bot, ExternalLink, LogOut, Menu, X,
} from 'lucide-react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { logoutAdmin } from '../../lib/authService'

interface AdminLayoutProps { children: React.ReactNode }

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/admin',             end: true },
  { icon: Car,             label: 'Inventory',    to: '/admin/cars',        end: false },
  { icon: CreditCard,      label: 'Financing',    to: '/admin/financing',   end: false },
  { icon: ShoppingBag,     label: 'Sales',        to: '/admin/sales',       end: false },
  { icon: Bot,             label: 'AI Assistant', to: '/admin/ai',          end: false },
  { icon: Mail,            label: 'Messages',     to: '/admin/messages',    end: false },
]

// Renders the admin dashboard shell - collapsible sidebar nav, responsive layout, and logout control wrapping page content
export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(
    typeof window !== 'undefined'
      ? window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
      : 'desktop'
  )
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [pendingFinancingCount, setPendingFinancingCount] = useState(0)

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setScreenSize('mobile')
      else if (window.innerWidth < 1024) setScreenSize('tablet')
      else setScreenSize('desktop')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  // Close sidebar on desktop
  useEffect(() => {
    if (screenSize === 'desktop') setSidebarOpen(false)
  }, [screenSize])

  // Prevent body scroll when sidebar expanded on mobile/tablet
  useEffect(() => {
    if (sidebarOpen && screenSize !== 'desktop') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [sidebarOpen, screenSize])

  // Real-time listeners for unread messages and pending financing
  useEffect(() => {
    // Listen for unread messages
    const messagesQuery = query(collection(db, 'messages'), where('read', '==', false))
    const unsubscribeMessages = onSnapshot(messagesQuery, (snap) => {
      setUnreadMessageCount(snap.size)
    })

    // Listen for pending financing requests
    const financingQuery = query(collection(db, 'financing'), where('status', '==', 'pending'))
    const unsubscribeFinancing = onSnapshot(financingQuery, (snap) => {
      setPendingFinancingCount(snap.size)
    })

    // Cleanup listeners on unmount
    return () => {
      unsubscribeMessages()
      unsubscribeFinancing()
    }
  }, [])

  // Signs the admin out via Firebase auth and redirects to the login page
  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  // Helper to get badge count for nav items
  const getBadgeCount = (label: string): number => {
    if (label === 'Messages') return unreadMessageCount
    if (label === 'Financing') return pendingFinancingCount
    return 0
  }

  // Calculate sidebar widths (FIXED - never changes main content margin)
  const getCollapsedWidth = () => {
    if (screenSize === 'desktop') return 250
    if (screenSize === 'tablet') return 100
    return 80
  }

  const getExpandedWidth = () => 250

  const collapsedWidth = getCollapsedWidth()
  const expandedWidth = getExpandedWidth()
  const sidebarDisplayWidth = sidebarOpen && screenSize !== 'desktop' ? expandedWidth : collapsedWidth
  const isExpanded = sidebarOpen || screenSize === 'desktop'

  return (
    <div id="admin-layout-root" className="admin-layout-root" style={{ display: 'flex', height: '100vh', backgroundColor: '#F2F2F0' }}>
      {/* BACKDROP (for mobile/tablet when expanded) */}
      {sidebarOpen && screenSize !== 'desktop' && (
        <div
          id="admin-sidebar-backdrop"
          className="admin-sidebar-backdrop"
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

      {/* SIDEBAR - FIXED (overlays ON TOP of content, NOT pushing it) */}
      <aside
        id="admin-sidebar-main"
        className="admin-sidebar-main"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: sidebarDisplayWidth,
          backgroundColor: '#1A1A1A',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: screenSize === 'desktop' ? '1.5rem 1rem' : '0',
          overflowY: 'auto',
          transition: 'width 0.3s ease',
          zIndex: 50,
          boxShadow: sidebarOpen && screenSize !== 'desktop' ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        {/* HAMBURGER BUTTON (visible on mobile/tablet) */}
        {screenSize !== 'desktop' && (
          <button
            id="admin-sidebar-toggle"
            className="admin-sidebar-toggle"
            onClick={toggleSidebar}
            style={{
              width: '100%',
              padding: '1rem',
              border: 'none',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2A2A2A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* LOGO (only visible when expanded) */}
        {isExpanded && (
          <div style={{ marginBottom: '2.5rem', marginTop: screenSize !== 'desktop' ? '1rem' : '1.5rem', paddingLeft: '0.5rem' }}>
            <span className="font-bebas" style={{ fontSize: '1.5rem', display: 'block', letterSpacing: '0.05em' }}>
              <span style={{ color: '#C4FF00' }}>Auto</span><span style={{ color: '#FFFFFF' }}>Market</span>
            </span>
            <span style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Admin Panel
            </span>
          </div>
        )}

        {/* NAV LINKS */}
        <nav id="admin-sidebar-nav" className="admin-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(({ icon: Icon, label, to, end }) => {
            const badgeCount = getBadgeCount(label)
            return (
              <NavLink
                key={to}
                id={`admin-sidebar-link-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`admin-sidebar-link admin-sidebar-link-${label.toLowerCase().replace(/\s+/g, '-')}`}
                to={to}
                end={end}
                onClick={closeSidebar}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: screenSize === 'desktop' ? '0.75rem 1rem' : '1rem',
                  borderRadius: screenSize === 'desktop' ? '0.625rem' : '0',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: isExpanded ? '0.875rem' : '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                  textAlign: 'left' as const,
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                  backgroundColor: isActive ? 'rgba(196,255,0,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #C4FF00' : 'none',
                  paddingLeft: isActive ? 'calc(1rem - 3px)' : '1rem',
                  justifyContent: isExpanded && badgeCount > 0 ? 'space-between' : (isExpanded ? 'flex-start' : 'center'),
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {isExpanded && <span>{label}</span>}
                </div>
                {isExpanded && badgeCount > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                    backgroundColor: '#C4FF00',
                    color: '#1A1A1A',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}>
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto' }} />

        {/* BOTTOM LINKS */}
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: screenSize === 'desktop' ? '0.75rem 1rem' : '1rem',
                borderRadius: screenSize === 'desktop' ? '0.625rem' : '0',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left' as const,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '0.25rem',
              }}
            >
              <ExternalLink size={18} />
              View Site
            </a>

            <button
              id="admin-sidebar-logout"
              className="admin-sidebar-logout"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: screenSize === 'desktop' ? '0.75rem 1rem' : '1rem',
                borderRadius: screenSize === 'desktop' ? '0.625rem' : '0',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left' as const,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <LogOut size={18} />
              Sign Out
            </button>

            {/* SYSTEM STATUS SECTION */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Connected Status */}
              <div style={{
                backgroundColor: 'rgba(46, 125, 91, 0.1)',
                border: '1px solid rgba(46, 125, 91, 0.3)',
                borderRadius: '0.625rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2E7D5B',
                  flexShrink: 0,
                }} />
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sistema</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#FFFFFF', margin: '0', fontWeight: 500 }}>Conectado</p>
                </div>
              </div>

              {/* User Info */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.625rem',
                padding: '0.75rem 1rem',
              }}>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', margin: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuario</p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#FFFFFF', margin: '0.25rem 0 0 0', fontWeight: 500 }}>Admin</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT - SCROLLABLE (margin-left FIXED - sidebar overlays ON TOP) */}
      <main
        id="admin-main-content"
        className="admin-main-content"
        style={{
          position: 'relative',
          marginLeft: collapsedWidth,
          width: `calc(100% - ${collapsedWidth}px)`,
          height: '100vh',
          backgroundColor: '#F2F2F0',
          overflow: 'hidden',
          overflowY: 'auto',
          padding: screenSize === 'desktop' ? '2rem' : screenSize === 'tablet' ? '1.25rem' : '1rem',
        }}
      >
        {children}
      </main>
    </div>
  )
}
