import type { Car } from '../types'

/**
 * Validates step 1 (vehicle) has required fields
 */
export function validateStep1(selectedCar: Car | null, vin: string, plate: string): boolean {
  return !!selectedCar && vin.trim() !== '' && plate.trim() !== ''
}

/**
 * Validates buyer email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validates step 2 (buyer) has all required fields with email format check
 */
export function validateStep2(
  buyerName: string,
  buyerIdNumber: string,
  buyerLicense: string,
  buyerEmail: string,
  buyerPhone: string,
  buyerAddress: string
): boolean {
  return (
    buyerName.trim() !== '' &&
    buyerIdNumber.trim() !== '' &&
    buyerLicense.trim() !== '' &&
    buyerEmail.trim() !== '' &&
    buyerPhone.trim() !== '' &&
    buyerAddress.trim() !== '' &&
    isValidEmail(buyerEmail)
  )
}

/**
 * Calculates financing metrics for payment planning
 */
export function calculateFinancing(
  paymentType: 'cash' | 'financing' | 'mixed',
  salePrice: number,
  downPayment: number,
  loanTerm: number,
  monthlyRate: number = 0.008
) {
  if (paymentType === 'cash') {
    return { monthlyPayment: 0, totalPayment: salePrice, totalInterest: 0, financedAmount: 0 }
  }

  const financed = paymentType === 'mixed' ? salePrice - downPayment : salePrice
  const rate = monthlyRate
  const months = loanTerm
  const monthlyPayment =
    (financed * (rate * (1 + rate) ** months)) / ((1 + rate) ** months - 1)
  const totalPayment = monthlyPayment * months + downPayment
  const totalInterest = totalPayment - salePrice

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment,
    totalInterest: Math.round(totalInterest * 100) / 100,
    financedAmount: financed,
  }
}

/**
 * Calculates ORC total based on whether it's included or itemized
 */
export function calculateOrcTotal(
  orcIncluded: boolean,
  orcWof: number,
  orcRegistration: number,
  orcGrooming: number,
  orcOwnershipTransfer: number,
  orcMechanicalInspection: number,
  orcOtherAmount: number
): number {
  if (orcIncluded) return 0
  return orcWof + orcRegistration + orcGrooming + orcOwnershipTransfer + orcMechanicalInspection + orcOtherAmount
}

/**
 * Calculates accessories total
 */
export function calculateAccessoriesTotal(
  accessories: Array<{ description: string; price: number }>
): number {
  return accessories.reduce((sum, a) => sum + a.price, 0)
}

/**
 * Calculates financing fees total (only if not cash)
 */
export function calculateFinancingFeesTotal(
  paymentType: 'cash' | 'financing' | 'mixed',
  ffEstablishment: number,
  ffPpsr: number,
  ffMonthlyAccount: number,
  ffDealerOrigination: number
): number {
  if (paymentType === 'cash') return 0
  return ffEstablishment + ffPpsr + ffMonthlyAccount + ffDealerOrigination
}

/**
 * Calculates grand total with GST
 */
export function calculateTotals(subtotal: number) {
  const gst = Math.round(subtotal * 0.15)
  return { gst, totalCostToBuyer: subtotal + gst }
}
