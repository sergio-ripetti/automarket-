let toastCallback: ((message: string, type: 'success' | 'error') => void) | null = null

export function setToastCallback(callback: (message: string, type: 'success' | 'error') => void) {
  toastCallback = callback
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastCallback) {
    toastCallback(message, type)
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`)
  }
}
