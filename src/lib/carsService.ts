import {
  collection,
  doc,
  getDocs,
  getDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Car } from '../types'

const COLLECTION = 'cars'

// Normalize timestamp to comparable value (handles Firestore Timestamp, Date, ISO string, epoch number, or missing)
function normalizeTimestamp(ts: unknown): number {
  if (!ts) return -Infinity
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    return (ts as { toMillis(): number }).toMillis() // Firestore Timestamp
  }
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime()
    return isNaN(parsed) ? -Infinity : parsed
  }
  if (typeof ts === 'number') return ts > 0 ? ts : -Infinity
  return -Infinity
}

// Fetches all car listings from the Firestore 'cars' collection, ordered by createdAt descending (newest first)
export async function getCars(): Promise<Car[]> {
  // Fetch all cars without ordering in the query (more reliable with legacy data)
  const snapshot = await getDocs(collection(db, COLLECTION))
  const cars = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Car))

  // Sort by createdAt descending, with invalid timestamps last
  cars.sort((a, b) => {
    const timeA = normalizeTimestamp(a.createdAt)
    const timeB = normalizeTimestamp(b.createdAt)
    return timeB - timeA
  })

  return cars
}

// Fetches a single car listing by document id from Firestore, returns null if it doesn't exist
export async function getCarById(id: string): Promise<Car | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Car
}

// Checks whether the Firestore 'cars' collection currently has no documents
export async function isCollectionEmpty(): Promise<boolean> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.empty
}
