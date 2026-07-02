import {
  collection,
  doc,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Car } from '../types'
import { cars as staticCars } from '../data/cars'

const COLLECTION = 'cars'

// Fetches all car listings from the Firestore 'cars' collection
export async function getCars(): Promise<Car[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Car))
}

// Fetches a single car listing by document id from Firestore, returns null if it doesn't exist
export async function getCarById(id: string): Promise<Car | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Car
}

// Seeds Firestore's 'cars' collection with the static sample catalog, but only if the collection is currently empty
export async function seedCars(): Promise<void> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  if (!snapshot.empty) return

  const batch = writeBatch(db)
  for (const car of staticCars) {
    batch.set(doc(db, COLLECTION, car.id), car)
  }
  await batch.commit()
}

// Force-writes the static sample catalog into Firestore's 'cars' collection, overwriting any existing docs with matching ids
export async function reseedCars(): Promise<void> {
  const batch = writeBatch(db)
  for (const car of staticCars) {
    batch.set(doc(db, COLLECTION, car.id), car)
  }
  await batch.commit()
}

// Checks whether the Firestore 'cars' collection currently has no documents
export async function isCollectionEmpty(): Promise<boolean> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.empty
}
