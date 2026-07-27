import type { UploadedDocument } from '../lib/salesService'

export interface FormData {
  // Step 1: Vehicle Details
  carId: string
  vin: string
  plate: string
  isNZNew: boolean
  originCountry: string
  previousOwners: number
  hasMaintenanceHistory: boolean

  // Step 2: Buyer Information
  buyerName: string
  buyerIdNumber: string
  buyerLicense: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string

  // Step 3: Payment & Sale Details
  saleDate: string
  paymentType: 'cash' | 'financing' | 'mixed'
  salePrice: number
  downPayment: number
  loanTerm: number
  firstPaymentDate: string
  notes: string

  // On Road Costs (ORC)
  orcIncluded: boolean
  driveAwayPrice: boolean
  orcWof: number
  orcRegistration: number
  orcRegistrationMonths: 6 | 12
  orcGrooming: number
  orcOwnershipTransfer: number
  orcMechanicalInspection: number
  orcOtherLabel: string
  orcOtherAmount: number

  // Accessories
  accessories: Array<{ description: string; price: number }>

  // Financing Fees
  ffEstablishment: number
  ffPpsr: number
  ffMonthlyAccount: number
  ffDealerOrigination: number

  // Warranty & Mechanical Insurance
  warrantyIncluded: boolean
  warrantyMonths: number
  warrantyProvider: string
  mechInsuranceIncluded: boolean
  mechInsuranceMonths: number
  mechInsuranceProvider: string

  // Documents
  uploadingFiles: Map<string, { file: File; progress: number; uploaded: boolean }>
  uploadedDocuments: UploadedDocument[]
}
