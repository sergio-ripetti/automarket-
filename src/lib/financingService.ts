import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  query, orderBy, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface FinancingDocument {
  url: string
  type: 'passport_license' | 'visa_residency' | 'proof_of_address' | 'payslip' | 'bank_statement' | 'other'
  filename: string
}

export interface FinancingRequest {
  id: string
  carId: string
  carTitle: string
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  monthlyIncome: number
  downPayment: number
  loanTerm: number
  monthlyPayment: number
  totalAmount: number
  totalInterest: number
  status: 'pending' | 'approved' | 'rejected' | 'paying' | 'completed'
  createdAt: Timestamp
  approvedAt?: Timestamp
  notes?: string
  employer?: string
  jobTitle?: string
  employmentType?: 'fulltime' | 'parttime' | 'selfemployed' | 'other'
  yearsEmployed?: number
  monthlyExpenses?: number
  documents?: FinancingDocument[]
  creditHistoryConsent?: boolean
}

const COL = 'financing'

export async function getFinancingRequests(): Promise<FinancingRequest[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancingRequest))
}

export async function updateFinancingStatus(
  id: string,
  status: FinancingRequest['status'],
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status })
}

export async function deleteFinancingRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
