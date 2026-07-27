import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentSummaryCard } from './PaymentSummaryCard'
import type { Sale } from '../../../../lib/salesService'

function createSale(paymentType: 'cash' | 'financing' | 'mixed' = 'financing'): Sale {
  return {
    id: '1',
    carId: 'car1',
    carTitle: '2020 Toyota Camry',
    carBrand: 'Toyota',
    carModel: 'Camry',
    carYear: 2020,
    carColor: 'Silver',
    carImages: ['https://example.com/car.jpg'],
    buyer: {
      name: 'John Doe',
      idNumber: '123456789',
      email: 'john@example.com',
      phone: '0212223333',
      address: '123 Main St',
      licenseNumber: 'DL123456',
    },
    paymentPlan: {
      type: paymentType,
      salePrice: 25000,
      downPayment: 5000,
      financedAmount: 20000,
      monthlyRate: 6.5,
      termMonths: 60,
      monthlyPayment: 387,
      totalPayment: 23220,
      totalInterest: 3220,
      firstPaymentDate: '2024-01-01',
    },
    payments: [],
    status: 'active',
    saleDate: '2023-12-01',
    notes: 'Test sale',
    vehicleInfo: {
      vin: 'JTHBE1C26A5001234',
      plate: 'ABC123',
      isNZNew: true,
      originCountry: '',
      previousOwners: 1,
      hasMaintenanceHistory: true,
    },
    orc: {
      wof: 0,
      registration: 0,
      registrationMonths: 12,
      grooming: 0,
      ownershipTransfer: 0,
      mechanicalInspection: 0,
      otherLabel: '',
      otherAmount: 0,
      orcTotal: 0,
      orcIncluded: false,
      driveAwayPrice: false,
    },
    extraAccessories: {
      items: [],
      total: 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('PaymentSummaryCard', () => {
  describe('cash payment type', () => {
    it('displays cash payment badge', () => {
      const sale = createSale('cash')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Cash Payment')).toBeInTheDocument()
    })

    it('displays sale price for cash', () => {
      const sale = createSale('cash')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getAllByText('$25,000')).toHaveLength(1)
    })

    it('does not show financing details for cash', () => {
      const sale = createSale('cash')
      render(<PaymentSummaryCard sale={sale} />)
      const monthlyPaymentElements = screen.queryAllByText(/Monthly Payment/)
      expect(monthlyPaymentElements.length).toBe(0)
    })
  })

  describe('financing payment type', () => {
    it('displays full financing badge', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Full Financing')).toBeInTheDocument()
    })

    it('displays sale price', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$25,000')).toBeInTheDocument()
    })

    it('displays amount financed', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$20,000')).toBeInTheDocument()
    })

    it('displays monthly payment', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$387')).toBeInTheDocument()
    })

    it('displays total interest', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$3,220')).toBeInTheDocument()
    })

    it('displays total repayment', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$23,220')).toBeInTheDocument()
    })
  })

  describe('mixed payment type', () => {
    it('displays down payment + financing badge', () => {
      const sale = createSale('mixed')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Down Payment + Financing')).toBeInTheDocument()
    })

    it('displays down payment when greater than 0', () => {
      const sale = createSale('mixed')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$5,000')).toBeInTheDocument()
    })

    it('hides down payment when 0', () => {
      const sale = createSale('mixed')
      sale.paymentPlan.downPayment = 0
      render(<PaymentSummaryCard sale={sale} />)
      const downPaymentLabels = screen.queryAllByText('Down Payment')
      expect(downPaymentLabels.length).toBe(0)
    })
  })

  describe('component rendering', () => {
    it('has correct component id', () => {
      const sale = createSale()
      const { container } = render(<PaymentSummaryCard sale={sale} />)
      expect(container.querySelector('#admin-sales-detail-payment')).toBeInTheDocument()
    })

    it('displays payment badge', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Full Financing')).toBeInTheDocument()
    })

    it('displays all financing detail labels', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Sale Price')).toBeInTheDocument()
      expect(screen.getByText('Amount Financed')).toBeInTheDocument()
      expect(screen.getByText('Monthly Payment')).toBeInTheDocument()
      expect(screen.getByText('Total Interest')).toBeInTheDocument()
      expect(screen.getByText('Total Repayment')).toBeInTheDocument()
    })
  })

  describe('visual consistency (Sales visual pass)', () => {
    it('uses a white card background instead of the old blue/grey filled gradient', () => {
      const sale = createSale('financing')
      const { container } = render(<PaymentSummaryCard sale={sale} />)
      const card = container.querySelector('#admin-sales-detail-payment') as HTMLElement
      expect(card.style.backgroundColor).toBe('rgb(255, 255, 255)')
      expect(card.style.background).not.toContain('gradient')
    })

    it('Monthly Payment highlight no longer uses the dark full-width bar (no black/rgba(0,0,0) fill)', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      const monthlyLabel = screen.getByText('Monthly Payment')
      const highlightBox = monthlyLabel.parentElement as HTMLElement
      expect(highlightBox.style.backgroundColor).not.toMatch(/rgba\(0, ?0, ?0/)
      expect(highlightBox.style.backgroundColor).toBe('rgb(255, 255, 255)')
    })

    it('Monthly Payment highlight has a compact width, not a full-width bar', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      const monthlyLabel = screen.getByText('Monthly Payment')
      const highlightBox = monthlyLabel.parentElement as HTMLElement
      expect(highlightBox.style.display).toBe('inline-flex')
      expect(highlightBox.style.maxWidth).toBeTruthy()
    })

    it('Monthly Payment value still renders the correct amount', () => {
      const sale = createSale('financing')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('$387')).toBeInTheDocument()
    })

    it('financing summary remains functional for a mixed sale', () => {
      const sale = createSale('mixed')
      render(<PaymentSummaryCard sale={sale} />)
      expect(screen.getByText('Down Payment + Financing')).toBeInTheDocument()
      expect(screen.getByText('$387')).toBeInTheDocument()
      expect(screen.getByText('$23,220')).toBeInTheDocument()
    })

    it('cash summary card also uses the white card style (no blue fill)', () => {
      const sale = createSale('cash')
      const { container } = render(<PaymentSummaryCard sale={sale} />)
      const card = container.querySelector('#admin-sales-detail-payment') as HTMLElement
      expect(card.style.backgroundColor).toBe('rgb(255, 255, 255)')
      expect(screen.getByText('$25,000')).toBeInTheDocument()
    })
  })
})
