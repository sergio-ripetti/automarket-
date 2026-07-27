import { getAuth } from 'firebase/auth'

interface MessageReadResponse {
  success: boolean
  error?: string
}

interface DeleteMessageResponse {
  success: boolean
  error?: string
}

/**
 * Mark a message as read via authenticated backend endpoint
 */
export async function markAsRead(id: string): Promise<MessageReadResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/messages/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ read: true }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to mark message as read',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to mark message as read:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}

/**
 * Mark a message as unread via authenticated backend endpoint
 */
export async function markAsUnread(id: string): Promise<MessageReadResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/messages/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ read: false }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to mark message as unread',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to mark message as unread:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}

/**
 * Delete a message via authenticated backend endpoint
 */
export async function deleteMessage(id: string): Promise<DeleteMessageResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/messages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete message',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to delete message:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}
