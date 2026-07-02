let toastCallback: ((message: string, type: 'success' | 'error') => void) | null = null

// Registers the UI callback (typically from a toast provider component) that showToast will invoke to render notifications
export function setToastCallback(callback: (message: string, type: 'success' | 'error') => void) {
  toastCallback = callback
}

// Triggers a success/error toast notification via the registered UI callback, falling back to console.log if none is registered
export function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastCallback) {
    toastCallback(message, type)
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`)
  }
}
