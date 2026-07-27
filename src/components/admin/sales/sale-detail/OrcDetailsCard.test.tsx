import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrcDetailsCard } from './OrcDetailsCard'
import type { Sale, ORC } from '../../../../lib/salesService'

function createSale(orc?: Partial<ORC>): Sale {
  const defaultOrc: ORC = {
    wof: 450,
    registration: 250,
    registrationMonths: 12,
    grooming: 300,
    ownershipTransfer: 200,
    mechanicalInspection: 150,
    otherLabel: 'Other',
    otherAmount: 100,
    orcTotal: 1450,
    orcIncluded: false,
    driveAwayPrice: false,
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
    orc: { ...defaultOrc, ...orc } as ORC,
    extraAccessories: {
      items: [],
      total: 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('OrcDetailsCard', () => {
  it('renders ORC heading', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText('On Road Costs (ORC)')).toBeInTheDocument()
  })

  it('displays "ORC Included in Price" when orcIncluded is true', () => {
    const sale = createSale({ ...createSale().orc, orcIncluded: true })
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText('ORC Included in Price')).toBeInTheDocument()
  })

  it('displays fee breakdown when orcIncluded is false', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText(/WoF:/)).toBeInTheDocument()
    expect(screen.getByText(/Registration:/)).toBeInTheDocument()
  })

  it('displays WoF when amount > 0', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText(/WoF:/)).toBeInTheDocument()
  })

  it('hides WoF when amount is 0', () => {
    const sale = createSale({ ...createSale().orc, wof: 0 })
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.queryByText(/WoF:/)).not.toBeInTheDocument()
  })

  it('displays grooming fee', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText(/Grooming:/)).toBeInTheDocument()
  })

  it('displays total ORC amount', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText('Total: $1,450')).toBeInTheDocument()
  })

  it('returns null when ORC is missing', () => {
    const sale = createSale()
    sale.orc = null as unknown as ORC
    const { container } = render(<OrcDetailsCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when orcTotal is 0 and orcIncluded is false', () => {
    const sale = createSale()
    sale.orc = { ...sale.orc, orcTotal: 0, orcIncluded: false }
    const { container } = render(<OrcDetailsCard sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays other charges when otherAmount > 0', () => {
    const sale = createSale()
    render(<OrcDetailsCard sale={sale} />)
    expect(screen.getByText(/Other:/)).toBeInTheDocument()
  })

  it('has correct component id', () => {
    const sale = createSale()
    const { container } = render(<OrcDetailsCard sale={sale} />)
    expect(container.querySelector('#admin-sales-detail-orc')).toBeInTheDocument()
  })
})
