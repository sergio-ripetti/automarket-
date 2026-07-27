import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, type Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

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

const COL = 'messages'

// Fetches all contact/financing/offer messages from the Firestore 'messages' collection, newest first
export async function getMessages(): Promise<Message[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
}

// Subscribes to real-time updates on the messages collection, newest first. Reads are allowed
// directly by Firestore rules (writes still go through the authenticated backend), so this uses
// onSnapshot instead of polling - the admin inbox and the sidebar's own onSnapshot-based unread
// badge then share the same live-listener lifecycle and always report consistent counts.
// Returns an unsubscribe function; callers must invoke it on unmount to avoid leaking listeners.
export function subscribeToMessages(
  onData: (messages: Message[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)))
    },
    (err) => onError(err),
  )
}

// Marks a message as read in Firestore
export async function markAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: true })
}

// Marks a message as unread in Firestore
export async function markAsUnread(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: false })
}

// Deletes a message document from Firestore by id
export async function deleteMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

// Submits a public message (contact form or vehicle inquiry) via backend API
// The backend handles validation, sanitization, and Firestore persistence
export async function submitPublicMessage(payload: Record<string, unknown>): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/messages/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return {
        success: false,
        error: data.error || 'Failed to submit message',
      }
    }

    const data = await response.json()
    return data
  } catch (err) {
    console.error('Failed to submit public message:', err)
    return {
      success: false,
      error: 'Network error - please try again',
    }
  }
}
