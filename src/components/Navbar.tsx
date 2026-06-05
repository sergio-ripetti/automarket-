import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Heart } from 'lucide-react'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Cars', to: '/cars' },
  { label: 'Financing', to: '/financiamiento' },
  { label: 'Contact', to: '/contacto' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ctaHovered, setCtaHovered] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark/90 backdrop-blur-md shadow-lg shadow-black/40' : 'bg-transparent'
      }`}
      style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}
    >
      <div
        className="mx-auto flex items-center justify-between"
        style={{ width: '80%', height: '72px' }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <svg
            width="32"
            height="20"
            viewBox="0 0 32 20"
            fill="none"
            className="text-gold transition-transform duration-300 group-hover:scale-110"
          >
            <path d="M2 14L5 6H27L30 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="1" y="13" width="30" height="5" rx="2" fill="currentColor" opacity="0.15" />
            <path d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z" fill="currentColor" />
            <circle cx="8" cy="18" r="2" fill="currentColor" />
            <circle cx="24" cy="18" r="2" fill="currentColor" />
            <path d="M8 8H14L12 12H6L8 8Z" fill="currentColor" opacity="0.5" />
            <path d="M18 8H24L26 12H20L18 8Z" fill="currentColor" opacity="0.5" />
          </svg>
          <span className="font-bebas text-2xl tracking-wider">
            <span className="text-gold">AUTO</span><span className="text-white">MARKET</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-outfit text-white/70 hover:text-white transition-colors duration-200 relative group"
              style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}
            >
              {link.label}
              <span
                className="absolute left-0 bg-gold"
                style={{
                  bottom: '-4px',
                  height: '1px',
                  width: '100%',
                  transform: 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 0.3s ease',
                }}
                // scaleX on hover via group-hover class isn't possible with inline style,
                // so we use the Tailwind approach below via a sibling span trick
              />
              {/* Tailwind sliding underline */}
              <span className="absolute left-0 bottom-[-4px] h-px w-full bg-gold scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}

          {/* CTA Button */}
          <Link
            to="/favourites"
            className="font-outfit flex items-center gap-2 transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.03em',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              boxShadow: ctaHovered
                ? '0 0 20px rgba(245,158,11,0.45)'
                : '0 0 0px rgba(245,158,11,0)',
            }}
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
          >
            <Heart size={15} />
            My Favourites
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-carbon/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
          >
            <nav className="flex flex-col px-4 py-4 gap-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    to={link.to}
                    className="block font-outfit text-white/80 hover:text-gold py-2.5 px-2 transition-colors"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.06 }}
                className="pt-2"
              >
                <Link
                  to="/favourites"
                  className="flex items-center justify-center gap-2 font-outfit font-bold text-sm py-2.5 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000',
                    letterSpacing: '0.03em',
                  }}
                >
                  <Heart size={15} />
                  My Favourites
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
