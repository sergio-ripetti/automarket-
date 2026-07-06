import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Heart } from 'lucide-react'

const navLinks = [
  { label: 'Home', to: '/', id: 'nav-home' },
  { label: 'Cars', to: '/cars', id: 'nav-cars' },
  { label: 'Financing', to: '/financing', id: 'nav-financing' },
  { label: 'Contact', to: '/contact', id: 'nav-contact' },
]

// Site-wide navigation header - shows nav links and favorites CTA, adds a blurred background on scroll, and collapses into a mobile menu on small screens
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Tracks page scroll position to toggle the navbar's background/blur styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Closes the mobile menu automatically whenever the route changes
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-md ${
        scrolled
          ? 'bg-[#0D1B2A]/95 backdrop-blur-md border-b border-white/10 shadow-xl shadow-black/30'
          : 'bg-[#0D1B2A] border-b border-white/10'
      }`}
      role="banner"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E86AB] rounded-lg px-2 py-1">
          <svg
            width="28"
            height="18"
            viewBox="0 0 32 20"
            fill="none"
            className="text-[#2E86AB] transition-transform duration-md group-hover:scale-110 flex-shrink-0"
            aria-hidden="true"
          >
            <path d="M2 14L5 6H27L30 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z" fill="currentColor" />
            <circle cx="8" cy="18" r="2" fill="currentColor" />
            <circle cx="24" cy="18" r="2" fill="currentColor" />
          </svg>
          <span className="font-bebas text-[#0D1B2A] hidden sm:inline">
            <span className="text-[#2E86AB]">AUTO</span>MARKET
          </span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                id={link.id}
                className="font-inter text-sm font-medium text-[#0D1B2A]/55 hover:text-[#0D1B2A] transition-colors duration-sm relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E86AB] rounded px-2 py-1"
                aria-current={location.pathname === link.to ? 'page' : undefined}
              >
                {link.label}
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#2E86AB] group-hover:w-full transition-all duration-md" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden lg:block">
          <Link
            to="/favourites"
            aria-label="Go to favorites"
            className="inline-flex items-center gap-2 font-inter text-[#0D1B2A] rounded-lg cursor-pointer transition-all duration-200 bg-[#2E86AB] hover:bg-[#256E8C] hover:shadow-[0_4px_15px_rgba(46,134,171,0.4)] hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E86AB]"
            style={{ padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.04em' }}
          >
            <Heart size={16} />
            Favorites
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden text-[#0D1B2A] w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors duration-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E86AB]"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-[#0D1B2A]/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
          >
            <nav className="px-4 sm:px-6 py-4" aria-label="Mobile navigation">
              <ul className="flex flex-col gap-1 mb-4">
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      to={link.to}
                      id={`mobile-${link.id}`}
                      className="block font-inter font-medium text-[#0D1B2A]/80 hover:text-[#2E86AB] py-3 px-4 rounded-lg transition-colors duration-sm active:bg-white/10"
                      aria-current={location.pathname === link.to ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.08 }}
              >
                <Link
                  to="/favourites"
                  aria-label="Go to favorites"
                  className="w-full flex items-center justify-center gap-2 font-inter text-[#0D1B2A] rounded-lg cursor-pointer transition-all duration-200 bg-[#2E86AB] hover:bg-[#256E8C] hover:shadow-[0_4px_15px_rgba(46,134,171,0.4)]"
                  style={{ height: '48px', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.04em' }}
                >
                  <Heart size={16} />
                  My Favorites
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
