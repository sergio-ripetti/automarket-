import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Browse Cars', to: '/cars' },
  { label: 'Financing', to: '/financing' },
  { label: 'Contact', to: '/contact' },
]

const socialLinks = [
  { icon: ExternalLink, label: 'Twitter', href: '#' },
  { icon: ExternalLink, label: 'LinkedIn', href: '#' },
]

// Renders the site-wide footer with brand info, quick links, and contact details
export default function Footer() {
  return (
    <footer className="bg-[#EEF2F7] border-t border-#2E86AB/10 mt-20 lg:mt-32">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 mb-12">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <svg
                width="28"
                height="18"
                viewBox="0 0 32 20"
                fill="none"
                className="text-#2E86AB"
                aria-hidden="true"
              >
                <path d="M2 14L5 6H27L30 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z" fill="currentColor" />
                <circle cx="8" cy="18" r="2" fill="currentColor" />
                <circle cx="24" cy="18" r="2" fill="currentColor" />
              </svg>
              <span className="font-bebas text-xl tracking-wider text-#2E86AB">AutoMarket</span>
            </div>
            <p className="font-poppins text-sm text-[#0D1B2A]/60 leading-relaxed mb-6">
              New Zealand's premier automotive marketplace. We connect buyers and sellers with complete transparency,
              trust, and innovative AI-powered insights.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-#2E86AB/20 border border-white/10 hover:border-#2E86AB/30 flex items-center justify-center text-[#0D1B2A]/60 hover:text-#2E86AB transition-all duration-sm group focus:outline-none focus-visible:ring-2 focus-visible:ring-#2E86AB"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="font-bebas text-[#0D1B2A] mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-poppins text-sm text-[#0D1B2A]/60 hover:text-#2E86AB transition-colors duration-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-#2E86AB rounded px-2 py-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="font-bebas text-[#0D1B2A] mb-6">Contact Info</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-#2E86AB mt-0.5 shrink-0" aria-hidden="true" />
                <span className="font-poppins text-sm text-[#0D1B2A]/60">
                  123 Queen Street
                  <br />
                  Auckland CBD, NZ 1010
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-#2E86AB shrink-0" aria-hidden="true" />
                <a
                  href="tel:+64912345 67"
                  className="font-poppins text-sm text-[#0D1B2A]/60 hover:text-#2E86AB transition-colors duration-sm"
                >
                  +64 9 123 4567
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-#2E86AB shrink-0" aria-hidden="true" />
                <a
                  href="mailto:contact@automarket.co.nz"
                  className="font-poppins text-sm text-[#0D1B2A]/60 hover:text-#2E86AB transition-colors duration-sm"
                >
                  contact@automarket.co.nz
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-8" />

        {/* Copyright */}
        <div className="text-center">
          <p className="font-poppins text-xs text-[#0D1B2A]/40">
            © {new Date().getFullYear()} AutoMarket. All rights reserved. | Crafted with care in New Zealand.
          </p>
        </div>
      </div>
    </footer>
  )
}
