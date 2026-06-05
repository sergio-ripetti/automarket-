import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0a0a0a",
        borderTop: "1px solid rgba(245,158,11,0.2)",
        width: "100%",
        marginTop: "3rem",
      }}>
      <div
        style={{
          width: "80%",
          marginLeft: "auto",
          marginRight: "auto",
          paddingTop: "3rem",
          paddingBottom: "3rem",
        }}>
        {/* 3 equal columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "2.5rem",
            width: "100%",
          }}>
          {/* Column 1 — Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                width="28"
                height="18"
                viewBox="0 0 32 20"
                fill="none"
                className="text-gold">
                <path
                  d="M2 14L5 6H27L30 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M1 14H31V16C31 17.1 30.1 18 29 18H3C1.9 18 1 17.1 1 16V14Z"
                  fill="currentColor"
                />
                <circle cx="8" cy="18" r="2" fill="currentColor" />
                <circle cx="24" cy="18" r="2" fill="currentColor" />
              </svg>
              <span className="font-bebas text-2xl text-gold tracking-wider">
                AutoMarket
              </span>
            </div>
            <p className="font-outfit text-sm text-white/50 leading-relaxed mb-6">
              New Zealand's premier car marketplace. We connect buyers and
              sellers with full transparency and trust.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                aria-label="X"
                className="text-white/30 hover:text-gold transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-white/30 hover:text-gold transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="text-white/30 hover:text-gold transition-colors">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h3 className="font-bebas text-lg text-white tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {[
                { label: "Home", to: "/" },
                { label: "Browse Cars", to: "/cars" },
                { label: "Financing", to: "/financiamiento" },
                { label: "Contact", to: "/contacto" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="font-outfit text-sm text-white/50 hover:text-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Contact */}
          <div>
            <h3 className="font-bebas text-lg text-white tracking-wider mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-gold mt-0.5 shrink-0" />
                <span className="font-outfit text-sm text-white/50">
                  123 Queen Street, Auckland CBD, Auckland 1010, New Zealand
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-gold shrink-0" />
                <span className="font-outfit text-sm text-white/50">
                  +64 9 123 4567
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-gold shrink-0" />
                <span className="font-outfit text-sm text-white/50">
                  contact@automarket.co.nz
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            borderTop: "1px solid rgba(234,179,8,0.2)",
            marginTop: "2.5rem",
            paddingTop: "1.5rem",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "0.875rem",
          }}>
          © 2024 AutoMarket. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
