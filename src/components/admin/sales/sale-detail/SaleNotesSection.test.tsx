import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SaleNotesSection } from './SaleNotesSection'
import type { Sale } from '../../../../lib/salesService'

function createSale(notes?: string | null | undefined): Sale {
  let noteValue = 'This is a test note'
  if (notes === null) {
    noteValue = ''
  } else if (notes === undefined) {
    noteValue = ''
  } else if (typeof notes === 'string') {
    noteValue = notes
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
    notes: noteValue,
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

describe('SaleNotesSection', () => {
  it('renders notes label', () => {
    const sale = createSale('Test note')
    render(<SaleNotesSection sale={sale} />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('displays note content', () => {
    const sale = createSale('This is a detailed note about the sale')
    render(<SaleNotesSection sale={sale} />)
    expect(screen.getByText('This is a detailed note about the sale')).toBeInTheDocument()
  })

  it('returns null when notes is empty', () => {
    const sale = createSale(null)
    const { container } = render(<SaleNotesSection sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when notes is falsy', () => {
    const sale = createSale('')
    const { container } = render(<SaleNotesSection sale={sale} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays long notes text', () => {
    const longNote = 'This is a very long note that contains multiple lines of text describing the sale condition and any special notes from the staff about this particular vehicle and transaction.'
    const sale = createSale(longNote)
    render(<SaleNotesSection sale={sale} />)
    expect(screen.getByText(longNote)).toBeInTheDocument()
  })
})
