import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCJCRPezPTQQD_thjry5W2J1SSWd9ZWFZ8',
  authDomain: 'automarket-710a5.firebaseapp.com',
  projectId: 'automarket-710a5',
  storageBucket: 'automarket-710a5.firebasestorage.app',
  messagingSenderId: '38981894586',
  appId: '1:38981894586:web:5eb19af63f55c835295d83',
}

// Prevent duplicate initialization during Vite HMR
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
export const auth = getAuth(app)
