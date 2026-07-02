import { useState } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

// Manages transient toast notification state - exposes a setter that auto-dismisses the message after a fixed delay
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  // Sets the toast message/type and schedules automatic dismissal after 3 seconds
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, showToast, dismissToast: () => setToast(null) }
}
