interface ConsentSectionProps {
  creditHistoryConsent: boolean
  error?: string
  onConsent: (checked: boolean) => void
}

export default function ConsentSection({
  creditHistoryConsent,
  error,
  onConsent,
}: ConsentSectionProps) {
  return (
    <>
      {/* Credit Consent — full width */}
      <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input
            required
            type="checkbox"
            checked={creditHistoryConsent}
            onChange={(e) => onConsent(e.target.checked)}
            style={{ marginTop: '0.35rem', cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <p style={{color: "#0D1B2A", marginBottom: '0.3rem' }}>
              I consent to a credit history check being performed *
            </p>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
              By checking this box you agree to allow AutoMarket to perform a credit check as part of your financing application
            </p>
          </div>
        </label>
        {error && <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(239,68,68,0.85)', marginTop: '0.3rem' }}>{error}</p>}
      </div>
    </>
  )
}
