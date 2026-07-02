import {
  collection, doc, getDocs, getDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { sanitizeForFirestore } from './sanitize'

export interface Buyer {
  name: string
  idNumber: string
  email: string
  phone: string
  address: string
  licenseNumber: string
}

export interface PaymentPlan {
  type: 'cash' | 'financing' | 'mixed'
  salePrice: number
  downPayment: number
  financedAmount: number
  monthlyRate: number
  termMonths: number
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  firstPaymentDate: string
}

export interface PaymentRecord {
  id: string
  dueDate: string
  amount: number
  paidDate?: string
  status: 'pending' | 'paid' | 'overdue'
}

export interface VehicleInfo {
  vin: string
  plate: string
  isNZNew: boolean
  originCountry: string
  previousOwners: number
  hasMaintenanceHistory: boolean
}

export interface ORC {
  wof: number
  registration: number
  registrationMonths: 6 | 12
  grooming: number
  ownershipTransfer: number
  mechanicalInspection: number
  otherLabel: string
  otherAmount: number
  orcTotal: number
  orcIncluded: boolean
  driveAwayPrice: boolean
}

export interface AccessoryItem {
  description: string
  price: number
}

export interface ExtraAccessories {
  items: AccessoryItem[]
  total: number
}

export interface FinancingFees {
  establishmentFee: number
  ppsr: number
  monthlyAccountFee: number
  dealerOriginationFee: number
  total: number
}

export interface Warranty {
  included: boolean
  months: number
  provider: string
}

export interface MechanicalInsurance {
  included: boolean
  months: number
  provider: string
}

export interface Documents {
  vehiclePhotos?: string[]
  licensePhoto?: string
  signedContract?: string
  otherDocs?: string[]
  uploadedDocuments?: string[]
}

export interface Sale {
  id: string
  carId: string
  carTitle: string
  carBrand: string
  carModel: string
  carYear: number
  carColor: string
  carImages: string[]
  buyer: Buyer
  paymentPlan: PaymentPlan
  payments: PaymentRecord[]
  status: 'active' | 'completed' | 'cancelled'
  saleDate: string
  notes: string
  vehicleInfo: VehicleInfo
  orc: ORC
  extraAccessories: ExtraAccessories
  financingFees?: FinancingFees
  warranty?: Warranty
  mechanicalInsurance?: MechanicalInsurance
  documents?: Documents
  createdAt: Timestamp
}

const COL = 'sales'

// Fetches all vehicle sales from the Firestore 'sales' collection, newest first
export async function getSales(): Promise<Sale[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
}

// Fetches a single sale by document id from Firestore, returns null if it doesn't exist
export async function getSaleById(id: string): Promise<Sale | null> {
  const docRef = doc(db, COL, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Sale
}

// Creates a new sale record in Firestore - sanitizes the data (strips undefined values) before writing and stamps a server-side createdAt
export async function addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<string> {
  const sanitizedSale = sanitizeForFirestore(sale) as Record<string, unknown>
  const docRef = await addDoc(collection(db, COL), { ...sanitizedSale, createdAt: serverTimestamp() })
  return docRef.id
}

// Updates an existing sale document in Firestore with partial data, sanitizing values first to avoid undefined fields
export async function updateSale(id: string, data: Partial<Sale>): Promise<void> {
  const sanitizedData = sanitizeForFirestore(data)
  await updateDoc(doc(db, COL, id), sanitizedData as Record<string, unknown>)
}

// Marks a specific payment in a sale's schedule as paid (sets paidDate to today) and persists the updated payments array to Firestore
export async function markPaymentPaid(saleId: string, paymentId: string): Promise<void> {
  const sale = await getSaleById(saleId)
  if (!sale) throw new Error('Sale not found')

  const updatedPayments = sale.payments.map((p) => {
    if (p.id === paymentId) {
      return { ...p, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
    }
    return p
  })

  await updateSale(saleId, { payments: updatedPayments })
}

// Reverts a specific payment in a sale's schedule back to pending (clears paidDate) and reopens the sale if it was completed; persists to Firestore
export async function markPaymentUnpaid(saleId: string, paymentId: string): Promise<void> {
  const sale = await getSaleById(saleId)
  if (!sale) throw new Error('Sale not found')

  const updatedPayments = sale.payments.map((p) => {
    if (p.id === paymentId) {
      const { paidDate, ...rest } = p
      return { ...rest, status: 'pending' as const }
    }
    return p
  })

  const updateData: Partial<Sale> = { payments: updatedPayments }
  if (sale.status === 'completed') {
    updateData.status = 'active'
  }

  await updateSale(saleId, updateData)
}

// Deletes a sale document from Firestore by id
export async function deleteSale(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

// Computes an amortized monthly payment schedule for a loan (financed amount, term, rate) starting from a given first payment date - pure calculation, no external I/O
export function generatePaymentSchedule(
  financedAmount: number,
  termMonths: number,
  monthlyRate: number,
  firstPaymentDate: string,
): PaymentRecord[] {
  const payments: PaymentRecord[] = []
  const rate = monthlyRate / 100
  const monthlyPayment = financedAmount * (rate * (1 + rate) ** termMonths) / ((1 + rate) ** termMonths - 1)

  let currentDate = new Date(firstPaymentDate)

  for (let i = 0; i < termMonths; i++) {
    const dueDate = new Date(currentDate)
    payments.push({
      id: `payment-${i + 1}`,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: Math.round(monthlyPayment * 100) / 100,
      status: 'pending',
    })
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return payments
}
