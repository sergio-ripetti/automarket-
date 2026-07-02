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
