import type { Timestamp } from 'firebase/firestore'
import { apiUrl, parseJsonResponse } from './apiClient'
import { authenticatedFetch } from './authService'

export interface Message {
  id: string
  senderName: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  reason: string
  message: string
  read: boolean
  type: 'contact' | 'financing' | 'offer'
  createdAt: Timestamp
  carId?: string
  carTitle?: string
  carPrice?: number
  offerPrice?: number
}

// Fetches all contact/financing/offer messages via the authenticated admin/demo-safe backend
// endpoint (GET /api/messages), newest first. Firestore's own 'messages' rule denies all client
// reads (see firestore.rules) - the backend (Firebase Admin SDK, which bypasses those rules) is
// the only path. Demo-role responses have sender PII masked server-side; admin gets full data.
export async function getMessages(): Promise<Message[]> {
  const response = await authenticatedFetch('/api/messages')
  const data = await parseJsonResponse<{ success: boolean; messages?: Message[] }>(response)
  if (!response.ok || !data.success || !Array.isArray(data.messages)) {
    throw new Error('Failed to fetch messages')
  }
  return data.messages
}

// Submits a public message (contact form or vehicle inquiry) via backend API
// The backend handles validation, sanitization, and Firestore persistence
export async function submitPublicMessage(payload: Record<string, unknown>): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(apiUrl('/api/messages/submit'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await parseJsonResponse<{ success: boolean; messageId?: string; error?: string }>(response)
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to submit message',
      }
    }

    return data
  } catch (err) {
    console.error('Failed to submit public message:', err)
    return {
      success: false,
      error: 'Network error - please try again',
    }
  }
}
