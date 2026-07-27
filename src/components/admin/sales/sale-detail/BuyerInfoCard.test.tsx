import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BuyerInfoCard } from './BuyerInfoCard'
import type { Sale } from '../../../../lib/salesService'

function createSale(): Sale {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('BuyerInfoCard', () => {
  it('renders buyer information heading', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('Buyer Information')).toBeInTheDocument()
  })

  it('displays buyer full name', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays buyer ID number', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('123456789')).toBeInTheDocument()
  })

  it('displays buyer license number', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('DL123456')).toBeInTheDocument()
  })

  it('displays buyer email', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('displays buyer phone', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('0212223333')).toBeInTheDocument()
  })

  it('displays buyer address', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  it('displays all field labels', () => {
    const sale = createSale()
    render(<BuyerInfoCard sale={sale} />)
    expect(screen.getByText('Full Name')).toBeInTheDocument()
    expect(screen.getByText('ID Number')).toBeInTheDocument()
    expect(screen.getByText('License')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Address')).toBeInTheDocument()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<BuyerInfoCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-buyer')).toBeInTheDocument()
  })

  it('renders detail card class', () => {
    const sale = createSale()
    const { container } = render(<BuyerInfoCard sale={sale} />)
    const card = container.querySelector('#admin-sales-detail-buyer')
    expect(card).toHaveClass('detail-card')
  })
})
