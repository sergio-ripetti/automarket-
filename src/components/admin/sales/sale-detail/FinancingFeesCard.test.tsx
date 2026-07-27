import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FinancingFeesCard } from './FinancingFeesCard'
import type { Sale, FinancingFees } from '../../../../lib/salesService'

function createSale(fees?: Partial<FinancingFees>): Sale {
  const defaultFees: FinancingFees = {
    establishmentFee: 500,
    ppsr: 75,
    monthlyAccountFee: 25,
    dealerOriginationFee: 400,
    total: 1000,
  }
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
      type: 'financing',
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
    financingFees: { ...defaultFees, ...fees } as FinancingFees,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('FinancingFeesCard', () => {
  it('renders financing fees heading', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText('Financing Fees')).toBeInTheDocument()
  })

  it('displays establishment fee', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText(/Establishment:.*\$500/s)).toBeInTheDocument()
  })

  it('displays PPSR fee', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText(/PPSR:.*\$75/s)).toBeInTheDocument()
  })

  it('displays monthly account fee', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText(/Monthly Account Fee:.*\$25/s)).toBeInTheDocument()
  })

  it('displays dealer origination fee', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText(/Dealer Origination:.*\$400/s)).toBeInTheDocument()
  })

  it('displays total fees', () => {
    const sale = createSale()
    render(<FinancingFeesCard sale={sale} />)
    expect(screen.getByText('Total: $1,000')).toBeInTheDocument()
  })

  it('returns null when financingFees is null', () => {
    const sale = createSale()
    sale.financingFees = null as unknown as FinancingFees
    const { container } = render(<FinancingFeesCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<FinancingFeesCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-financing-fees')).toBeInTheDocument()
  })
})
