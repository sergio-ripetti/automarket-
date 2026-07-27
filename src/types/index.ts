// Represents a vehicle listing shown in the public catalog and managed via the admin dashboard (Firestore 'cars' collection)
export interface Car {
  id: string
  title: string
  brand: string
  model: string
  year: number
  price: number
  originalPrice?: number
  isOnSale: boolean
  km: number
  description: string
  ownerDescription: string
  images: string[]
  featured: boolean
  transmission: 'manual' | 'automatico'
  fuel: 'gasolina' | 'diesel' | 'electrico' | 'hibrido'
  color: string
  createdAt?: { toMillis(): number } | Date | string | number // Firestore Timestamp or ISO string or epoch number
  updatedAt?: { toMillis(): number } | Date | string | number // Firestore Timestamp or ISO string or epoch number
}

// Holds the current search/filter criteria used by the public car listing UI (FilterBar component)
export interface FilterState {
  search: string
  brand: string
  model: string
  yearMin: string
  yearMax: string
  priceMin: string
  priceMax: string
  fuel: string
}

// A single uploaded supporting document (e.g. ID, payslip) attached to a financing application, stored via Cloudinary
export interface FinancingDocument {
  url: string
  type: 'passport_license' | 'visa_residency' | 'proof_of_address' | 'payslip' | 'bank_statement' | 'other'
  filename: string
}

// Shape of the customer-facing financing application form, submitted to Firestore via financingService
export interface FinancingForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  income: string
  downPayment: number
  months: number
  employer: string
  jobTitle: string
  employmentType: 'fulltime' | 'parttime' | 'selfemployed' | 'other'
  yearsEmployed: number
  monthlyExpenses: string
  documents: FinancingDocument[]
  creditHistoryConsent: boolean
}

// Shape of the customer-facing "make an offer" form for a car listing, submitted as a message to Firestore
export interface OfferForm {
  offerPrice: string
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
}

// Public message submission payload (Contact and vehicle inquiry forms)
export interface PublicMessageSubmission {
  // Contact form
  name?: string
  firstName?: string
  lastName?: string
  // Both
  email: string
  phone: string
  reason?: string
  message: string
  // Offer form
  offerPrice?: number
  carId?: string
  carTitle?: string
  carPrice?: number
  // Server-generated
  type: 'contact' | 'offer'
}

// Response from POST /api/messages/submit
export interface PublicMessageSubmissionResponse {
  success: boolean
  messageId?: string
  error?: string
}
