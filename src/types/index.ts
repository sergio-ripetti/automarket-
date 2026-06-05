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
}

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

export interface FinancingDocument {
  url: string
  type: 'passport_license' | 'visa_residency' | 'proof_of_address' | 'payslip' | 'bank_statement' | 'other'
  filename: string
}

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

export interface OfferForm {
  offerPrice: string
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
}
