import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

// Signs in an admin user with email/password credentials via Firebase Authentication
export async function loginAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

// Signs out the currently authenticated admin user from Firebase Authentication
export async function logoutAdmin() {
  return signOut(auth)
}

// Subscribes to Firebase Authentication state changes and invokes callback with the current user (or null)
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// Fetches a resource from the API with Firebase ID token authentication
export async function authenticatedFetch(url: string, options?: RequestInit) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken(true)
  const headers = {
    ...options?.headers,
    'Authorization': `Bearer ${idToken}`,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
