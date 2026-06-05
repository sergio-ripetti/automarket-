import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  query, orderBy, type Timestamp,
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

export async function getMessages(): Promise<Message[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
}

export async function markAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: true })
}

export async function markAsUnread(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: false })
}

export async function deleteMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
