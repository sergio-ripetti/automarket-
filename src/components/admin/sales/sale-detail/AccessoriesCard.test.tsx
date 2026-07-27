import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccessoriesCard } from './AccessoriesCard'
import type { Sale, ExtraAccessories } from '../../../../lib/salesService'

function createSale(accessories?: Partial<ExtraAccessories>): Sale {
  const defaultAccessories: ExtraAccessories = {
    items: [
      { description: 'Floor Mats', price: 150 },
      { description: 'Roof Rack', price: 300 },
    ],
    total: 450,
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
    extraAccessories: { ...defaultAccessories, ...accessories } as ExtraAccessories,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('AccessoriesCard', () => {
  it('renders extra accessories heading', () => {
    const sale = createSale()
    render(<AccessoriesCard sale={sale} />)
    expect(screen.getByText('Extra Accessories')).toBeInTheDocument()
  })

  it('displays accessory items', () => {
    const sale = createSale()
    render(<AccessoriesCard sale={sale} />)
    expect(screen.getByText(/Floor Mats:/)).toBeInTheDocument()
    expect(screen.getByText(/Roof Rack:/)).toBeInTheDocument()
  })

  it('displays accessory prices formatted as currency', () => {
    const sale = createSale()
    render(<AccessoriesCard sale={sale} />)
    expect(screen.getByText(/Floor Mats:.*\$150/s)).toBeInTheDocument()
    expect(screen.getByText(/Roof Rack:.*\$300/s)).toBeInTheDocument()
  })

  it('displays total accessories price', () => {
    const sale = createSale()
    render(<AccessoriesCard sale={sale} />)
    expect(screen.getByText('Total: $450')).toBeInTheDocument()
  })

  it('returns null when extraAccessories is null', () => {
    const sale = createSale()
    sale.extraAccessories = null as unknown as ExtraAccessories
    const { container } = render(<AccessoriesCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when items array is empty', () => {
    const sale = createSale({ items: [], total: 0 })
    const { container } = render(<AccessoriesCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when items array is undefined', () => {
    const sale = createSale({ items: undefined, total: 0 })
    const { container } = render(<AccessoriesCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<AccessoriesCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-accessories')).toBeInTheDocument()
  })

  it('renders multiple items', () => {
    const sale = createSale({
      items: [
        { description: 'Item 1', price: 100 },
        { description: 'Item 2', price: 200 },
        { description: 'Item 3', price: 300 },
      ],
      total: 600,
    })
    render(<AccessoriesCard sale={sale} />)
    expect(screen.getByText(/Item 1:/)).toBeInTheDocument()
    expect(screen.getByText(/Item 2:/)).toBeInTheDocument()
    expect(screen.getByText(/Item 3:/)).toBeInTheDocument()
  })
})
