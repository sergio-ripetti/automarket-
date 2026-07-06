import { CheckCircle2, XCircle, X } from 'lucide-react'

interface AdminToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

// Displays a fixed-position success/error toast notification with a manual dismiss button
export default function AdminToast({ message, type, onDismiss }: AdminToastProps) {
  const ok = type === 'success'
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      backgroundColor: '#FFFFFF',
      border: `1px solid ${ok ? 'rgba(29,78,216,0.4)' : 'rgba(220,38,38,0.4)'}`,
      borderRadius: '0.75rem', padding: '0.875rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '360px',
    }}>
      {ok
        ? <CheckCircle2 size={18} color="#2E86AB" />
        : <XCircle size={18} color="#ef4444" />}
      <span style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: ok ? '#2E86AB' : '#fca5a5', flex: 1 }}>
        {message}
      </span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  )
}
