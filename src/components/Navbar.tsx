import { useState, useEffect, useRef } from 'react'
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
  const prevPathRef = useRef(location.pathname)

  // Tracks page scroll position to toggle the navbar's background/blur styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Closes the mobile menu when the route changes
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      setMenuOpen(false)
      prevPathRef.current = location.pathname
    }
  }, [location.pathname])

  const isActive = (path: string) => location.pathname === path

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-md ${
        scrolled
          ? 'bg-[#1A1A1A]/95 backdrop-blur-md border-b border-white/10 shadow-xl shadow-black/30'
          : 'bg-[#1A1A1A] border-b border-white/10'
      }`}
      role="banner"
    >
      <nav className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between md:justify-start md:gap-4 lg:gap-6" aria-label="Main navigation">
        {/* Logo - Always visible, responsive sizing */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00] rounded-lg px-1 sm:px-2 py-1 shrink-0">
          <svg
            width="24"
            height="16"
            viewBox="0 0 32 20"
            fill="none"
            className="text-[#C4FF00] transition-transform duration-md group-hover:scale-110 shrink-0 sm:w-7 sm:h-4"
            aria-hidden="true"
          >
            <path d="M2 14L5 6H27L30 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z" fill="currentColor" />
            <circle cx="8" cy="18" r="2" fill="currentColor" />
            <circle cx="24" cy="18" r="2" fill="currentColor" />
          </svg>
          <span className="font-bebas text-[#FFFFFF] text-xs sm:text-sm md:text-base whitespace-nowrap">
            <span className="text-[#C4FF00]">AUTO</span>MARKET
          </span>
        </Link>

        {/* Desktop & Tablet Navigation - Centered and responsive */}
        <ul className="hidden md:flex flex-1 items-center justify-center gap-3 lg:gap-6">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                id={link.id}
                className={`font-inter text-xs sm:text-sm font-medium relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00] rounded px-1.5 sm:px-2 md:px-2 py-1 transition-colors duration-300 whitespace-nowrap ${
                  isActive(link.to)
                    ? 'text-white'
                    : 'text-white/65 hover:text-white'
                }`}
                aria-current={isActive(link.to) ? 'page' : undefined}
              >
                <span className="relative inline-block">
                  {link.label}
                  <motion.span
                    className="absolute bottom-0 left-0 h-1 bg-[#C4FF00] rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: isActive(link.to) ? '100%' : 0
                    }}
                    whileHover={{
                      width: isActive(link.to) ? '100%' : '100%'
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablet & Desktop CTA */}
        <div className="hidden md:flex shrink-0">
          <Link
            to="/favourites"
            aria-label="Go to favorites"
            className="inline-flex items-center gap-2 font-inter text-white rounded-lg cursor-pointer transition-all duration-200 bg-[#1A1A1A] hover:bg-[#2A2A2A] hover:shadow-[0_4px_15px_rgba(26,26,26,0.4)] hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00]"
            style={{ padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.04em' }}
          >
            <Heart size={16} />
            Favorites
          </Link>
        </div>

        {/* Mobile Menu Button - Only visible on mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors duration-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00] shrink-0"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu - Only on mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-[#1A1A1A]/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
          >
            <nav className="px-4 sm:px-6 py-4 sm:py-6" aria-label="Mobile navigation">
              <ul className="flex flex-col gap-2 mb-4 w-full">
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
                      className={`block font-inter font-medium rounded-lg transition-all duration-300 py-3 px-4 text-center relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00] ${
                        isActive(link.to)
                          ? 'text-white'
                          : 'text-white/80 hover:text-white'
                      }`}
                      aria-current={isActive(link.to) ? 'page' : undefined}
                    >
                      <span className="relative inline-block">
                        {link.label}
                        <motion.span
                          className="absolute bottom-0 left-0 h-1 bg-[#C4FF00] rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: isActive(link.to) ? '100%' : 0
                          }}
                          whileHover={{
                            width: isActive(link.to) ? '100%' : '100%'
                          }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                        />
                      </span>
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
                  className="w-full flex items-center justify-center gap-2 font-inter text-white rounded-lg cursor-pointer transition-all duration-200 bg-[#1A1A1A] hover:bg-[#2A2A2A] hover:shadow-[0_4px_15px_rgba(26,26,26,0.4)]"
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
