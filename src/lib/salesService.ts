import {
  collection, doc, addDoc, deleteDoc, updateDoc,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { sanitizeForFirestore } from './sanitize'
import { getSoldCarIdsFromSales } from './validators.js'
import { authenticatedFetch } from './authService'

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

// Canonical shape for an uploaded Sales document/photo. publicId + resourceType are required
// to reliably delete the file from Cloudinary later (see cloudinaryService.deleteFile). Legacy
// records may still contain plain strings (URL only, no publicId) - callers must handle both.
export interface UploadedDocument {
  url: string
  publicId: string
  resourceType: string
  filename?: string
  mimeType?: string
}

export interface Documents {
  vehiclePhotos?: string[]
  licensePhoto?: string
  signedContract?: string
  otherDocs?: string[]
  uploadedDocuments?: (string | UploadedDocument)[]
}

// Normalizes a legacy plain-string document entry or a full UploadedDocument into a consistent
// shape for rendering. Legacy string entries have no publicId, so they can never be deleted from
// Cloudinary (no way to identify the asset) - they can only be removed from the Sale record itself.
export function normalizeDocument(doc: string | UploadedDocument): UploadedDocument {
  if (typeof doc === 'string') {
    return { url: doc, publicId: '', resourceType: '' }
  }
  return doc
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

export interface MarkPaymentPaidResult {
  sale: Sale
  allPaymentsPaid: boolean
  saleCompleted: boolean
}

export interface MarkPaymentUnpaidResult {
  sale: Sale
  saleReopened: boolean
}

// A vehicle is considered sold if it has any sale whose status is NOT 'cancelled' - both
// 'active' and 'completed' sales count. This is a blocklist (not an allowlist of specific
// statuses) so any future status value defaults to "sold" unless explicitly 'cancelled' -
// the safer default for excluding a car from being sold twice. Sales with a missing/falsy
// carId are ignored rather than corrupting the resulting set with an empty-string entry.
// The actual rule lives in validators.js's getSoldCarIdsFromSales (shared with the backend's
// public sold-vehicle-ids endpoint and the AI inventory context) - this is a thin typed
// re-export so every existing caller here keeps working unchanged.
export function getSoldCarIds(sales: Sale[]): Set<string> {
  return getSoldCarIdsFromSales(sales)
}

// Single source of truth for "is this car sold" - callers should always go through this
// helper (backed by getSoldCarIds) rather than re-deriving the status !== 'cancelled' rule.
export function isCarSold(carId: string, soldCarIds: Set<string>): boolean {
  return soldCarIds.has(carId)
}

const COL = 'sales'

// Fetches all vehicle sales, newest first. Sale documents can contain buyer PII, so
// firestore.rules denies all client reads of the 'sales' collection - this goes through the
// authenticated admin-only GET /api/sales endpoint (Firebase Admin SDK on the backend) instead
// of reading Firestore directly from the browser. Callers (Admin Inventory, Dashboard, New Sale,
// Sales list) are unaffected - the signature and return shape are unchanged.
export async function getSales(): Promise<Sale[]> {
  const response = await authenticatedFetch('/api/sales')
  if (!response.ok) {
    throw new Error('Failed to fetch sales')
  }
  const data = await response.json()
  if (!data.success || !Array.isArray(data.sales)) {
    throw new Error('Failed to fetch sales')
  }
  return data.sales as Sale[]
}

// Fetches a single sale by document id via the authenticated admin-only GET /api/sales/:id
// endpoint, returns null if it doesn't exist. See getSales() for why this is no longer a direct
// Firestore client read.
export async function getSaleById(id: string): Promise<Sale | null> {
  const response = await authenticatedFetch(`/api/sales/${encodeURIComponent(id)}`)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error('Failed to fetch sale')
  }
  const data = await response.json()
  if (!data.success || !data.sale) return null
  return data.sale as Sale
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

// Marks a payment as paid and synchronizes the sale status in a single operation
// If all payments are now paid, automatically sets the sale status to 'completed'
// Returns a typed result indicating whether all payments are paid and whether completion occurred
export async function markPaymentPaidAndSyncSaleStatus(
  saleId: string,
  paymentId: string,
): Promise<MarkPaymentPaidResult> {
  const sale = await getSaleById(saleId)
  if (!sale) throw new Error('Sale not found')

  // Find and update the target payment
  let paymentFound = false
  const updatedPayments = sale.payments.map((p) => {
    if (p.id === paymentId) {
      paymentFound = true
      return { ...p, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
    }
    return p
  })

  if (!paymentFound) throw new Error('Payment not found')

  // Check if all payments are now paid
  const allPaymentsPaid = updatedPayments.every((p) => p.status === 'paid')

  // Determine the new status
  const saleCompleted = allPaymentsPaid && sale.status !== 'completed'
  const newStatus = saleCompleted ? 'completed' : sale.status

  // Single Firestore update for both payments and status
  const updateData: Partial<Sale> = {
    payments: updatedPayments,
    status: newStatus,
  }
  await updateSale(saleId, updateData)

  // Return the updated sale and completion information
  const updatedSale: Sale = {
    ...sale,
    payments: updatedPayments,
    status: newStatus,
  }

  return {
    sale: updatedSale,
    allPaymentsPaid,
    saleCompleted,
  }
}

// Marks a payment as unpaid and synchronizes the sale status in a single operation
// If the sale is currently completed, automatically reopens it to active status
// Returns a typed result indicating whether the sale was reopened
export async function markPaymentUnpaidAndSyncSaleStatus(
  saleId: string,
  paymentId: string,
): Promise<MarkPaymentUnpaidResult> {
  const sale = await getSaleById(saleId)
  if (!sale) throw new Error('Sale not found')

  // Find and update the target payment
  let paymentFound = false
  const updatedPayments = sale.payments.map((p) => {
    if (p.id === paymentId) {
      paymentFound = true
      const { id, dueDate, amount } = p
      return { id, dueDate, amount, status: 'pending' as const }
    }
    return p
  })

  if (!paymentFound) throw new Error('Payment not found')

  // Determine if the sale should reopen
  const saleReopened = sale.status === 'completed'
  const newStatus = saleReopened ? 'active' : sale.status

  // Single Firestore update for both payments and status
  const updateData: Partial<Sale> = {
    payments: updatedPayments,
    status: newStatus,
  }
  await updateSale(saleId, updateData)

  // Return the updated sale and reopening information
  const updatedSale: Sale = {
    ...sale,
    payments: updatedPayments,
    status: newStatus,
  }

  return {
    sale: updatedSale,
    saleReopened,
  }
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

  const currentDate = new Date(firstPaymentDate)

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
