import { describe, it, expect } from 'vitest'
import {
  calculateBasePrice,
  calculateDownPaymentAmount,
  calculateFinancedAmount,
  calculateMonthlyPayment,
  calculateTotalRepayment,
  calculateTotalInterest,
  calculateSliderPercentage,
  calculateFinancingSummary,
} from '../financingCalculations'

describe('Financing Calculations', () => {
  describe('calculateBasePrice', () => {
    it('returns car price when available', () => {
      expect(calculateBasePrice(30000, '25000')).toBe(30000)
    })

    it('returns manual price when car price is undefined', () => {
      expect(calculateBasePrice(undefined, '35000')).toBe(35000)
    })

    it('returns manual price when car price is zero', () => {
      expect(calculateBasePrice(0, '20000')).toBe(20000)
    })

    it('returns 25000 default when manual price is empty', () => {
      expect(calculateBasePrice(undefined, '')).toBe(25000)
    })

    it('returns 25000 default when manual price is zero', () => {
      expect(calculateBasePrice(undefined, '0')).toBe(25000)
    })

    it('returns 25000 default when manual price is negative', () => {
      expect(calculateBasePrice(undefined, '-5000')).toBe(25000)
    })

    it('returns 25000 default when manual price is invalid', () => {
      expect(calculateBasePrice(undefined, 'not-a-number')).toBe(25000)
    })

    it('parses manual price as number', () => {
      expect(calculateBasePrice(undefined, '40000')).toBe(40000)
    })
  })

  describe('calculateDownPaymentAmount', () => {
    it('calculates 10% down payment on 25000', () => {
      expect(calculateDownPaymentAmount(25000, 10)).toBe(2500)
    })

    it('calculates 20% down payment on 25000', () => {
      expect(calculateDownPaymentAmount(25000, 20)).toBe(5000)
    })

    it('calculates 30% down payment on 25000', () => {
      expect(calculateDownPaymentAmount(25000, 30)).toBe(7500)
    })

    it('calculates 50% down payment on 25000', () => {
      expect(calculateDownPaymentAmount(25000, 50)).toBe(12500)
    })

    it('rounds to nearest dollar', () => {
      expect(calculateDownPaymentAmount(25001, 10)).toBe(2500)
    })

    it('returns 0 for 0% down payment', () => {
      expect(calculateDownPaymentAmount(25000, 0)).toBe(0)
    })

    it('calculates 20% down payment on 30000', () => {
      expect(calculateDownPaymentAmount(30000, 20)).toBe(6000)
    })
  })

  describe('calculateFinancedAmount', () => {
    it('subtracts down payment from base price', () => {
      expect(calculateFinancedAmount(25000, 5000)).toBe(20000)
    })

    it('returns base price when no down payment', () => {
      expect(calculateFinancedAmount(25000, 0)).toBe(25000)
    })

    it('returns 0 when down payment equals base price', () => {
      expect(calculateFinancedAmount(25000, 25000)).toBe(0)
    })

    it('can return negative if down payment exceeds base price', () => {
      expect(calculateFinancedAmount(25000, 30000)).toBe(-5000)
    })
  })

  describe('calculateMonthlyPayment', () => {
    it('calculates monthly payment for 36-month term on 20000 financed', () => {
      // 36-month amortization at 0.8% monthly rate
      const payment = calculateMonthlyPayment(20000, 36)
      expect(payment).toBeGreaterThan(600)
      expect(payment).toBeLessThan(700)
    })

    it('calculates monthly payment for 12-month term on 20000 financed', () => {
      const payment = calculateMonthlyPayment(20000, 12)
      expect(payment).toBeGreaterThan(1700)
      expect(payment).toBeLessThan(1800)
    })

    it('calculates monthly payment for 60-month term on 20000 financed', () => {
      const payment = calculateMonthlyPayment(20000, 60)
      expect(payment).toBeGreaterThan(400)
      expect(payment).toBeLessThan(450)
    })

    it('returns 0 when financed amount is zero', () => {
      expect(calculateMonthlyPayment(0, 36)).toBe(0)
    })

    it('returns 0 when financed amount is negative', () => {
      expect(calculateMonthlyPayment(-5000, 36)).toBe(0)
    })

    it('returns 0 when loan term is zero', () => {
      expect(calculateMonthlyPayment(20000, 0)).toBe(0)
    })

    it('returns 0 when loan term is negative', () => {
      expect(calculateMonthlyPayment(20000, -12)).toBe(0)
    })

    it('uses 0.8% monthly rate (0.008)', () => {
      // For $1000 financed over 12 months at 0.8% monthly
      const payment = calculateMonthlyPayment(1000, 12)
      expect(payment).toBeGreaterThan(85)
      expect(payment).toBeLessThan(95)
    })
  })

  describe('calculateTotalRepayment', () => {
    it('calculates total repayment as monthly payment times months plus down payment', () => {
      const total = calculateTotalRepayment(670, 36, 5000)
      expect(total).toBeGreaterThan(29000)
      expect(total).toBeLessThan(30000)
    })

    it('returns only down payment when monthly payment is zero', () => {
      expect(calculateTotalRepayment(0, 36, 5000)).toBe(5000)
    })

    it('includes zero down payment', () => {
      const total = calculateTotalRepayment(670, 36, 0)
      expect(total).toBeGreaterThan(24000)
      expect(total).toBeLessThan(25000)
    })
  })

  describe('calculateTotalInterest', () => {
    it('calculates interest as total repayment minus base price', () => {
      // 25000 financed + 5000 down = 30000 base
      // If total repay is 26830, interest is 26830 - 30000 = -3170
      // (interest is negative because down payment covers part of principal upfront)
      const interest = calculateTotalInterest(26830, 30000)
      expect(interest).toBe(-3170)
    })

    it('calculates interest for full price with no down payment', () => {
      // 25000 financed, 0 down = 25000 base
      // If total repay is 26830, interest is 1830
      const interest = calculateTotalInterest(26830, 25000)
      expect(interest).toBe(1830)
    })

    it('returns 0 when total repayment equals base price', () => {
      expect(calculateTotalInterest(25000, 25000)).toBe(0)
    })

    it('can be negative when down payment is substantial', () => {
      expect(calculateTotalInterest(20000, 30000)).toBe(-10000)
    })
  })

  describe('calculateSliderPercentage', () => {
    it('returns 0% for 10% down payment (minimum)', () => {
      expect(calculateSliderPercentage(10)).toBe(0)
    })

    it('returns 50% for 30% down payment (middle)', () => {
      expect(calculateSliderPercentage(30)).toBe(50)
    })

    it('returns 100% for 50% down payment (maximum)', () => {
      expect(calculateSliderPercentage(50)).toBe(100)
    })

    it('returns 25% for 20% down payment', () => {
      expect(calculateSliderPercentage(20)).toBe(25)
    })

    it('returns 75% for 40% down payment', () => {
      expect(calculateSliderPercentage(40)).toBe(75)
    })
  })

  describe('calculateFinancingSummary', () => {
    it('calculates complete summary with default values', () => {
      const result = calculateFinancingSummary(undefined, '25000', 20, 36)

      expect(result.basePrice).toBe(25000)
      expect(result.downPaymentAmount).toBe(5000)
      expect(result.financedAmount).toBe(20000)
      expect(result.monthlyPayment).toBeGreaterThan(600)
      expect(result.monthlyPayment).toBeLessThan(700)
      expect(result.totalRepayment).toBeGreaterThan(28000)
      expect(result.totalRepayment).toBeLessThan(29000)
      expect(result.totalInterest).toBeGreaterThan(3000)
      expect(result.totalInterest).toBeLessThan(4000)
      expect(result.sliderPercentage).toBe(25)
    })

    it('uses car price when provided', () => {
      const result = calculateFinancingSummary(30000, '25000', 20, 36)

      expect(result.basePrice).toBe(30000)
      expect(result.downPaymentAmount).toBe(6000)
      expect(result.financedAmount).toBe(24000)
    })

    it('calculates for 12-month term', () => {
      const result = calculateFinancingSummary(undefined, '25000', 20, 12)

      expect(result.basePrice).toBe(25000)
      expect(result.monthlyPayment).toBeGreaterThan(1700)
      expect(result.monthlyPayment).toBeLessThan(1800)
    })

    it('calculates for 60-month term', () => {
      const result = calculateFinancingSummary(undefined, '25000', 20, 60)

      expect(result.monthlyPayment).toBeGreaterThan(400)
      expect(result.monthlyPayment).toBeLessThan(450)
    })

    it('calculates for 10% down payment', () => {
      const result = calculateFinancingSummary(undefined, '25000', 10, 36)

      expect(result.downPaymentAmount).toBe(2500)
      expect(result.financedAmount).toBe(22500)
      expect(result.sliderPercentage).toBe(0)
    })

    it('calculates for 50% down payment', () => {
      const result = calculateFinancingSummary(undefined, '25000', 50, 36)

      expect(result.downPaymentAmount).toBe(12500)
      expect(result.financedAmount).toBe(12500)
      expect(result.sliderPercentage).toBe(100)
    })

    it('handles 100% down payment gracefully', () => {
      const result = calculateFinancingSummary(undefined, '25000', 100, 36)

      expect(result.downPaymentAmount).toBe(25000)
      expect(result.financedAmount).toBe(0) // no amount to finance
      expect(result.monthlyPayment).toBe(0) // protected by <= 0 check
    })
  })
})
