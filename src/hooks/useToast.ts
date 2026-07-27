import { useCallback, useState } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

// Manages transient toast notification state - exposes a setter that auto-dismisses the message after a fixed delay
// showToast/dismissToast are memoized so their reference stays stable across renders - consumers that put
// showToast in a useEffect dependency array (to load data once and toast on error) would otherwise re-run
// that effect on every render triggered by the toast's own state update, causing an infinite fetch/toast loop.
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  return { toast, showToast, dismissToast }
}
