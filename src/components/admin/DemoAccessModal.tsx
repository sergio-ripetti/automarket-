import { useEffect, useRef, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { DEMO_ACCESS_EMAIL, DEMO_ACCESS_PASSWORD, isDemoAccessConfigured } from '../../lib/demoAccessConfig'

interface DemoAccessModalProps {
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  // Optional: lets the caller (AdminLogin) populate the login form with the demo credentials.
  // Must never auto-submit - only fills the fields, the user still clicks "Sign In" themselves.
  onFillCredentials?: (email: string, password: string) => void
}

// One credential row (label + value) with its own copy-to-clipboard button and "Copied" feedback.
function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard API unavailable/denied (older browser, insecure context, permission policy) -
      // fall back to a legacy selection-based copy instead of failing silently.
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        // Both copy strategies failed - leave the value visible/selectable for a manual copy.
      }
      document.body.removeChild(textarea)
    }
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
      backgroundColor: '#FAFAF8', border: '1px solid #E0E0DC', borderRadius: '0.75rem',
      padding: '0.75rem 0.9rem',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem',
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#1A1A1A',
          fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem',
          backgroundColor: copied ? '#1A1A1A' : '#FFFFFF',
          color: copied ? '#FFFFFF' : '#1A1A1A',
          border: '1px solid #1A1A1A', borderRadius: '0.5rem',
          padding: '0.4rem 0.65rem', fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// Modal shown from the Admin Login screen so recruiters/reviewers can quickly find and copy the
// public demo credentials without needing to read the project source. Handles its own focus
// management (focus moves in on open, Escape/overlay/close-button all dismiss, focus returns to
// the trigger button on close) since the project has no existing shared Modal component to reuse.
//
// Credentials come only from VITE_DEMO_ADMIN_EMAIL/VITE_DEMO_ADMIN_PASSWORD (demoAccessConfig.ts)
// - a dedicated, restricted 'demo'-role account, never the real administrator. If those env vars
// aren't configured, this shows a safe "temporarily unavailable" message instead of any fallback.
export default function DemoAccessModal({ onClose, triggerRef, onFillCredentials }: DemoAccessModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const configured = isDemoAccessConfigured()

  useEffect(() => {
    closeButtonRef.current?.focus()
    const triggerNode = triggerRef.current

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerNode?.focus()
    }
  }, [onClose, triggerRef])

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(26,26,26,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-access-modal-title"
        style={{
          width: '100%', maxWidth: '380px', backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0DC', borderRadius: '1.25rem',
          padding: '1.75rem', boxShadow: '0 20px 50px rgba(26,26,26,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h2 id="demo-access-modal-title" className="font-bebas" style={{ color: '#1A1A1A', fontSize: '1.5rem', lineHeight: 1 }}>
            Admin Demo Access
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close demo access dialog"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', flexShrink: 0,
              backgroundColor: 'transparent', border: 'none', borderRadius: '0.5rem',
              color: '#767676', cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.color = '#1A1A1A' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#767676' }}
          >
            <X size={18} />
          </button>
        </div>

        {configured && DEMO_ACCESS_EMAIL && DEMO_ACCESS_PASSWORD ? (() => {
          const email = DEMO_ACCESS_EMAIL
          const password = DEMO_ACCESS_PASSWORD
          return (
          <>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: '#767676', marginBottom: '1.5rem' }}>
              Use these credentials to explore the admin panel demo. This is a restricted demo
              account - not the real administrator.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <CredentialRow label="Email" value={email} />
              <CredentialRow label="Password" value={password} />
            </div>

            {onFillCredentials && (
              <button
                type="button"
                onClick={() => onFillCredentials(email, password)}
                style={{
                  width: '100%', marginTop: '1rem', backgroundColor: '#1A1A1A', color: '#FFFFFF',
                  border: 'none', borderRadius: '0.75rem', padding: '0.65rem',
                  fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                Fill demo credentials
              </button>
            )}

            <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'center', marginTop: '1.25rem' }}>
              For portfolio review purposes only.
            </p>
          </>
          )
        })() : (
          <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: '#767676' }}>
            Demo access is temporarily unavailable.
          </p>
        )}
      </div>
    </div>
  )
}
