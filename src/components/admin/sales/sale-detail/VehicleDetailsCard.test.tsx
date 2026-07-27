import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VehicleDetailsCard } from './VehicleDetailsCard'
import type { Sale } from '../../../../lib/salesService'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSale(vehicleInfo?: any): Sale {
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
    vehicleInfo: vehicleInfo || {
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

describe('VehicleDetailsCard', () => {
  it('renders vehicle details heading', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('Vehicle Details')).toBeInTheDocument()
  })

  it('displays VIN', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('JTHBE1C26A5001234')).toBeInTheDocument()
  })

  it('displays license plate', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('displays NZ New origin', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('NZ New')).toBeInTheDocument()
  })

  it('displays Used Import origin for imports', () => {
    const sale = createSale({
      vin: 'JTHBE1C26A5001234',
      plate: 'ABC123',
      isNZNew: false,
      originCountry: 'Japan',
      previousOwners: 2,
      hasMaintenanceHistory: true,
    })
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('Used Import')).toBeInTheDocument()
  })

  it('displays country when vehicle is not NZ New', () => {
    const sale = createSale({
      vin: 'JTHBE1C26A5001234',
      plate: 'ABC123',
      isNZNew: false,
      originCountry: 'Japan',
      previousOwners: 2,
      hasMaintenanceHistory: true,
    })
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('Japan')).toBeInTheDocument()
  })

  it('hides country when vehicle is NZ New', () => {
    const sale = createSale()
    const { container } = render(<VehicleDetailsCard sale={sale} />)
    expect(container.textContent).not.toContain('Country')
  })

  it('displays previous owners count', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('displays maintenance history status', () => {
    const sale = createSale()
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('displays no maintenance history when false', () => {
    const sale = createSale({
      vin: 'JTHBE1C26A5001234',
      plate: 'ABC123',
      isNZNew: true,
      originCountry: '',
      previousOwners: 1,
      hasMaintenanceHistory: false,
    })
    render(<VehicleDetailsCard sale={sale} />)
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('returns null when vehicleInfo is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sale = createSale(undefined as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sale.vehicleInfo = null as any
    const { container } = render(<VehicleDetailsCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<VehicleDetailsCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-vehicle-details')).toBeInTheDocument()
  })
})
