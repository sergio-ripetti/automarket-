import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

export async function loginAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logoutAdmin() {
  return signOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
