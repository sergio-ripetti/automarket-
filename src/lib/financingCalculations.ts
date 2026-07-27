/**
 * Pure financial calculation functions for the Financing calculator.
 * All calculations preserve the current product formulas exactly.
 */

const MONTHLY_RATE = 0.008

/**
 * Result of financing calculations for a loan amount.
 */
export interface FinancingCalculationResult {
  basePrice: number
  downPaymentAmount: number
  financedAmount: number
  monthlyPayment: number
  totalRepayment: number
  totalInterest: number
  sliderPercentage: number
}

/**
 * Calculate the base price from car price or manual entry.
 * Falls back to 25000 if no price is available.
 */
export function calculateBasePrice(carPrice: number | undefined, manualPrice: string): number {
  if (carPrice !== undefined && carPrice > 0) {
    return carPrice
  }
  const parsed = Number(manualPrice)
  return parsed > 0 ? parsed : 25000
}

/**
 * Calculate down payment amount as a fixed currency amount.
 * Rounds to nearest dollar.
 */
export function calculateDownPaymentAmount(basePrice: number, downPaymentPercentage: number): number {
  return Math.round((downPaymentPercentage / 100) * basePrice)
}

/**
 * Calculate the amount that will be financed (borrowed).
 */
export function calculateFinancedAmount(basePrice: number, downPaymentAmount: number): number {
  return basePrice - downPaymentAmount
}

/**
 * Calculate monthly payment using amortization formula.
 * Monthly rate: 0.008 (0.8%)
 * Formula: financed * (r * (1+r)^n) / ((1+r)^n - 1)
 * Returns 0 if financed amount is zero or negative.
 */
export function calculateMonthlyPayment(
  financedAmount: number,
  loanTermMonths: number,
): number {
  if (financedAmount <= 0 || loanTermMonths <= 0) {
    return 0
  }

  const r = MONTHLY_RATE
  const n = loanTermMonths
  const numerator = r * Math.pow(1 + r, n)
  const denominator = Math.pow(1 + r, n) - 1

  return financedAmount * (numerator / denominator)
}

/**
 * Calculate total amount to be repaid over loan term.
 */
export function calculateTotalRepayment(
  monthlyPayment: number,
  loanTermMonths: number,
  downPaymentAmount: number,
): number {
  return monthlyPayment * loanTermMonths + downPaymentAmount
}

/**
 * Calculate total interest paid over loan term.
 */
export function calculateTotalInterest(totalRepayment: number, basePrice: number): number {
  return totalRepayment - basePrice
}

/**
 * Calculate slider percentage (0-100) for down payment visual indicator.
 * Down payment range: 10% to 50%
 * Formula: ((downPaymentPercentage - 10) / 40) * 100
 */
export function calculateSliderPercentage(downPaymentPercentage: number): number {
  return ((downPaymentPercentage - 10) / 40) * 100
}

/**
 * Calculate complete financing summary.
 * This is the primary entry point for calculating all financing figures.
 */
export function calculateFinancingSummary(
  carPrice: number | undefined,
  manualPrice: string,
  downPaymentPercentage: number,
  loanTermMonths: number,
): FinancingCalculationResult {
  const basePrice = calculateBasePrice(carPrice, manualPrice)
  const downPaymentAmount = calculateDownPaymentAmount(basePrice, downPaymentPercentage)
  const financedAmount = calculateFinancedAmount(basePrice, downPaymentAmount)
  const monthlyPayment = calculateMonthlyPayment(financedAmount, loanTermMonths)
  const totalRepayment = calculateTotalRepayment(monthlyPayment, loanTermMonths, downPaymentAmount)
  const totalInterest = calculateTotalInterest(totalRepayment, basePrice)
  const sliderPercentage = calculateSliderPercentage(downPaymentPercentage)

  return {
    basePrice,
    downPaymentAmount,
    financedAmount,
    monthlyPayment,
    totalRepayment,
    totalInterest,
    sliderPercentage,
  }
}
