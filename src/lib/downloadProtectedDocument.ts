import { auth } from './firebase'
import { apiUrl } from './apiClient'

export class ProtectedDocumentDownloadError extends Error {}

// Generic, entity-agnostic core for forcing a real browser download of an admin-only attachment
// via a protected backend proxy, instead of navigating directly to a cross-origin Cloudinary URL
// (which many browsers refuse to force-download). Both Sales and Financing downloads delegate to
// this function - only the endpoint path and fallback filename differ between them.
export async function downloadProtectedDocument(
  endpointPath: string,
  url: string,
  suggestedFilename: string | undefined,
  fallbackFilename: string
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new ProtectedDocumentDownloadError('You must be signed in to download this file.')
  }

  const idToken = await currentUser.getIdToken()

  const response = await fetch(apiUrl(`/api/${endpointPath}?url=${encodeURIComponent(url)}`), {
    headers: { Authorization: `Bearer ${idToken}` },
  })

  if (!response.ok) {
    let message = 'Failed to download the file. Please try again.'
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // response wasn't JSON - keep the generic message
    }
    throw new ProtectedDocumentDownloadError(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || suggestedFilename || fallbackFilename

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
