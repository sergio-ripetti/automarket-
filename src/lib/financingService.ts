import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  query, orderBy, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { apiUrl, parseJsonResponse } from './apiClient'

export interface FinancingSubmissionPayload {
  carId: string
  carTitle: string
  carPrice?: number
  manualPrice?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  income: string
  monthlyExpenses: string
  downPayment: number
  months: number
  employer: string
  jobTitle: string
  employmentType: 'fulltime' | 'parttime' | 'selfemployed' | 'other'
  yearsEmployed: number
  documents: FinancingDocument[]
  creditHistoryConsent: boolean
}

export interface FinancingSubmissionResponse {
  success: boolean
  applicationId?: string
  error?: string
}

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

// Fetches all financing applications from the Firestore 'financing' collection, newest first
export async function getFinancingRequests(): Promise<FinancingRequest[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancingRequest))
}

// Updates the status field (pending/approved/rejected/paying/completed) of a financing request in Firestore
export async function updateFinancingStatus(
  id: string,
  status: FinancingRequest['status'],
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status })
}

// Deletes a financing request document from Firestore by id
export async function deleteFinancingRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

// Submits a new financing application via backend API endpoint
// The backend handles validation, recalculation, and Firestore persistence
export async function submitFinancingApplication(payload: FinancingSubmissionPayload): Promise<FinancingSubmissionResponse> {
  const response = await fetch(apiUrl('/api/financing/submit'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJsonResponse<FinancingSubmissionResponse>(response)
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to submit financing application',
    }
  }

  return data
}
