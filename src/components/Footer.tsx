import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Browse Cars', to: '/cars' },
  { label: 'Financing', to: '/financing' },
  { label: 'Contact', to: '/contact' },
]

const openingHours = [
  { day: 'Monday – Friday', hours: '9:00 AM – 6:00 PM' },
  { day: 'Saturday', hours: '9:00 AM – 4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
]

// Small uppercase, letter-spaced label used for each column heading, so the four sections share
// one consistent typographic rhythm instead of each using its own ad-hoc heading style.
function ColumnHeading({ children }: { children: string }) {
  return <h3 className="footer-heading">{children}</h3>
}

// Renders the site-wide footer with brand info, quick links, contact details, and opening hours.
// Uses a scoped <style> block with real CSS classes for all spacing (padding/margin/gap) instead
// of Tailwind's px-*/py-*/mb-*/space-y-* utilities: index.css defines an unlayered `* { margin: 0;
// padding: 0 }` reset that, under CSS cascade layers, always wins over Tailwind's utilities (which
// live inside `@layer utilities`) - so those classes silently compute to 0px everywhere. Plain CSS
// classes here are also unlayered, so normal specificity applies and they beat the `*` reset.
export default function Footer() {
  return (
    <footer className="site-footer">
      <style>{`
        .site-footer {
          background-color: #1A1A1A;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin-top: 5rem;
        }
        @media (min-width: 1024px) {
          .site-footer { margin-top: 8rem; }
        }
        .site-footer-inner {
          max-width: 72rem;
          margin: 0 auto;
          padding: 2.5rem 20px 2rem;
        }
        @media (min-width: 480px) {
          .site-footer-inner { padding: 2.75rem 28px 2.25rem; }
        }
        @media (min-width: 640px) {
          .site-footer-inner { padding: 3.5rem 32px 2.5rem; }
        }
        @media (min-width: 1024px) {
          .site-footer-inner { padding: 5rem 48px 3rem; }
        }

        /* Outer section grid: mobile stacks everything full-width; tablet pairs Brand+Explore in
           row 1 with the Contact/Hours block spanning row 2; desktop lays out four columns. */
        .footer-grid {
          display: flex;
          flex-direction: column;
          gap: 2.25rem;
          margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
          .footer-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 2.5rem;
            row-gap: 2.75rem;
            margin-bottom: 2.5rem;
          }
        }
        @media (min-width: 1024px) {
          .footer-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            column-gap: 2.5rem;
            row-gap: 0;
            margin-bottom: 3.5rem;
          }
        }

        .footer-brand-logo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .footer-brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.25rem;
          letter-spacing: 0.05em;
          color: #FFFFFF;
        }
        .footer-brand-description {
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          max-width: 22rem;
        }

        .footer-heading {
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.95);
          margin-bottom: 1.1rem;
        }

        /* Explore links: subtle row separators + a hover-only arrow, so the list reads as
           deliberately designed rather than plain stacked text, without becoming a second navbar. */
        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
        }
        .footer-links li + li {
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .footer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.6rem 0;
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-link:hover,
        .footer-link:focus-visible {
          color: #C4FF00;
        }
        .footer-link:focus-visible {
          outline: 2px solid #C4FF00;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }
        .footer-link-arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .footer-link:hover .footer-link-arrow,
        .footer-link:focus-visible .footer-link-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* Contact + Opening Hours: stacked at the narrowest widths, a 2-column grid from 375px
           (uses the space efficiently instead of two tall stacked blocks), then unwrapped via
           display:contents at desktop so each becomes its own independent column in the 4-col grid. */
        .footer-contact-hours {
          display: flex;
          flex-direction: column;
          gap: 2.25rem;
        }
        @media (min-width: 375px) {
          .footer-contact-hours {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.5rem;
          }
        }
        @media (min-width: 640px) and (max-width: 1023.98px) {
          .footer-contact-hours {
            grid-column: 1 / -1;
          }
        }
        @media (min-width: 1024px) {
          .footer-contact-hours {
            display: contents;
          }
        }

        .footer-contact-list,
        .footer-hours-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .footer-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
        }
        .footer-row-icon {
          flex-shrink: 0;
          width: 16px;
          margin-top: 0.15rem;
          color: #C4FF00;
        }
        .footer-row-text {
          font-family: 'Poppins', sans-serif;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
        }
        .footer-row-link {
          font-family: 'Poppins', sans-serif;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: color 0.2s ease;
          line-height: 1.5;
          word-break: break-word;
        }
        .footer-row-link:hover,
        .footer-row-link:focus-visible {
          color: #C4FF00;
        }
        .footer-row-link:focus-visible {
          outline: 2px solid #C4FF00;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }
        .footer-hours-time {
          color: rgba(255,255,255,0.4);
        }

        .footer-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(196,255,0,0.2), transparent);
        }
        .footer-copyright {
          text-align: center;
          padding-top: 1.5rem;
        }
        @media (min-width: 640px) {
          .footer-copyright { padding-top: 1.75rem; }
        }
        .footer-copyright p {
          font-family: 'Poppins', sans-serif;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
        }
      `}</style>

      <div className="site-footer-inner">
        {/* Footer Grid */}
        <div className="footer-grid">
          {/* Brand Column */}
          <div>
            <div className="footer-brand-logo-row">
              <svg
                width="28"
                height="18"
                viewBox="0 0 32 20"
                fill="none"
                className="text-[#C4FF00]"
                aria-hidden="true"
              >
                <path d="M2 14L5 6H27L30 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z" fill="currentColor" />
                <circle cx="8" cy="18" r="2" fill="currentColor" />
                <circle cx="24" cy="18" r="2" fill="currentColor" />
              </svg>
              <span className="footer-brand-name">AutoMarket</span>
            </div>
            <p className="footer-brand-description">
              Helping New Zealand drivers find, compare and finance quality vehicles with confidence.
            </p>
          </div>

          {/* Explore Column */}
          <div>
            <ColumnHeading>Explore</ColumnHeading>
            <ul className="footer-links">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-link">
                    {link.label}
                    <span className="footer-link-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Opening Hours (grouped so they can share a 2-column row on mobile/tablet) */}
          <div className="footer-contact-hours">
            {/* Contact Column */}
            <div>
              <ColumnHeading>Contact</ColumnHeading>
              <ul className="footer-contact-list">
                <li className="footer-row">
                  <MapPin size={16} className="footer-row-icon" aria-hidden="true" />
                  <span className="footer-row-text">
                    123 Queen Street
                    <br />
                    Auckland CBD, NZ 1010
                  </span>
                </li>
                <li className="footer-row">
                  <Phone size={16} className="footer-row-icon" aria-hidden="true" />
                  <a href="tel:+6491234567" className="footer-row-link">
                    +64 9 123 4567
                  </a>
                </li>
                <li className="footer-row">
                  <Mail size={16} className="footer-row-icon" aria-hidden="true" />
                  <a href="mailto:contact@automarket.co.nz" className="footer-row-link">
                    contact@automarket.co.nz
                  </a>
                </li>
              </ul>
            </div>

            {/* Opening Hours Column */}
            <div>
              <ColumnHeading>Opening Hours</ColumnHeading>
              <ul className="footer-hours-list">
                {openingHours.map(({ day, hours }) => (
                  <li key={day} className="footer-row">
                    <Clock size={16} className="footer-row-icon" aria-hidden="true" />
                    <span className="footer-row-text">
                      {day}
                      <br />
                      <span className="footer-hours-time">{hours}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Copyright */}
        <div className="footer-copyright">
          <p>© {new Date().getFullYear()} AutoMarket. All rights reserved. Built with care in New Zealand.</p>
        </div>
      </div>
    </footer>
  )
}
