import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Car, CreditCard, ShoppingBag, Mail, Bot, ExternalLink, LogOut, Menu, X,
} from 'lucide-react'
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen bg-dark">
      {/* ─── SIDEBAR BACKDROP (Mobile only) ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`
          fixed lg:relative
          top-0 left-0 h-screen w-4/5 max-w-xs
          bg-dark border-r border-amber-500/15
          flex flex-col p-4 lg:p-6
          z-50 lg:z-10
          transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="mb-8 lg:mb-10 pl-1">
          <span className="font-bebas text-2xl lg:text-3xl text-amber-500 block">
            AutoMarket
          </span>
          <span className="font-outfit text-xs text-white/30 tracking-widest uppercase">
            Admin Panel
          </span>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1 flex-1">
          {navItems.map(({ icon: Icon, label, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg font-outfit text-sm transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 border-l-3 border-amber-500 pl-[calc(1rem-3px)]'
                    : 'text-white/50 hover:text-white/70'
                }`
              }
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-1 pt-6 border-t border-white/5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-outfit text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            <ExternalLink size={18} />
            <span className="hidden sm:inline">View Site</span>
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-outfit text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full lg:w-auto bg-dark min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-carbon border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bebas text-lg text-white flex-1">AutoMarket</span>
        </div>

        {/* Content */}
        <div className="px-4 py-4 lg:px-8 lg:py-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
