import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WarrantyDetailsCard } from './WarrantyDetailsCard'
import type { Sale, Warranty, MechanicalInsurance } from '../../../../lib/salesService'

function createSale(warranty?: Partial<Warranty>, insurance?: Partial<MechanicalInsurance>): Sale {
  const defaultWarranty: Warranty = { included: true, months: 24, provider: 'Toyota' }
  const defaultInsurance: MechanicalInsurance = { included: true, months: 12, provider: 'InsuranceCo' }
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
    warranty: { ...defaultWarranty, ...warranty } as Warranty,
    mechanicalInsurance: { ...defaultInsurance, ...insurance } as MechanicalInsurance,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('WarrantyDetailsCard', () => {
  it('renders warranty heading', () => {
    const sale = createSale()
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.getByText('Warranty & Insurance')).toBeInTheDocument()
  })

  it('displays warranty information', () => {
    const sale = createSale()
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.getByText(/Warranty: 24 months - Toyota/)).toBeInTheDocument()
  })

  it('displays insurance information', () => {
    const sale = createSale()
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.getByText(/Insurance: 12 months - InsuranceCo/)).toBeInTheDocument()
  })

  it('hides warranty when not present', () => {
    const sale = createSale()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).warranty = undefined
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.queryByText(/Warranty:/)).not.toBeInTheDocument()
  })

  it('hides insurance when not present', () => {
    const sale = createSale()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).mechanicalInsurance = undefined
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.queryByText(/Insurance:/)).not.toBeInTheDocument()
  })

  it('returns null when neither warranty nor insurance is present', () => {
    const sale = createSale()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).warranty = undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).mechanicalInsurance = undefined
    const { container } = render(<WarrantyDetailsCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays warranty only when insurance is missing', () => {
    const warranty = { included: true, months: 36, provider: 'Provider1' }
    const sale = createSale(warranty, undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).mechanicalInsurance = undefined
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.getByText(/Warranty: 36 months - Provider1/)).toBeInTheDocument()
    expect(screen.queryByText(/Insurance:/)).not.toBeInTheDocument()
  })

  it('displays insurance only when warranty is missing', () => {
    const insurance = { included: true, months: 24, provider: 'Provider2' }
    const sale = createSale(undefined, insurance)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).warranty = undefined
    render(<WarrantyDetailsCard sale={sale} />)
    expect(screen.queryByText(/Warranty:/)).not.toBeInTheDocument()
    expect(screen.getByText(/Insurance: 24 months - Provider2/)).toBeInTheDocument()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<WarrantyDetailsCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-warranty')).toBeInTheDocument()
  })
})
