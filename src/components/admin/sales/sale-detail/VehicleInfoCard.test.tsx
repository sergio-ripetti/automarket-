import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VehicleInfoCard } from './VehicleInfoCard'
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

describe('VehicleInfoCard', () => {
  it('renders vehicle title', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
  })

  it('displays car year and km', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText(/2020 • 0 km/)).toBeInTheDocument()
  })

  it('displays car color', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText('Silver')).toBeInTheDocument()
  })

  it('displays formatted sale price', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText('$25,000')).toBeInTheDocument()
  })

  it('renders vehicle image', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    const img = screen.getByAltText('')
    expect(img).toHaveAttribute('src', 'https://example.com/car.jpg')
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<VehicleInfoCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-vehicle')).toBeInTheDocument()
  })

  it('displays sale price label', () => {
    const sale = createSale()
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText('Sale Price')).toBeInTheDocument()
  })

  it('shows a visual color swatch using the saved color value, not just raw text', () => {
    const sale = { ...createSale(), carColor: '#f5f5f5' }
    render(<VehicleInfoCard sale={sale} />)
    const swatch = screen.getByLabelText('Vehicle color: #f5f5f5')
    expect(swatch).toHaveStyle({ backgroundColor: '#f5f5f5', borderRadius: '50%' })
  })

  it('shows a human-readable colour name instead of the raw hex value', () => {
    const sale = { ...createSale(), carColor: '#f5f5f5' }
    render(<VehicleInfoCard sale={sale} />)
    expect(screen.getByText('White')).toBeInTheDocument()
    expect(screen.queryByText('#f5f5f5')).not.toBeInTheDocument()
  })

  it('keeps the raw hex value available via the swatch tooltip/aria-label', () => {
    const sale = { ...createSale(), carColor: '#f5f5f5' }
    render(<VehicleInfoCard sale={sale} />)
    const swatch = screen.getByLabelText('Vehicle color: #f5f5f5')
    expect(swatch).toHaveAttribute('title', '#f5f5f5')
  })
})
