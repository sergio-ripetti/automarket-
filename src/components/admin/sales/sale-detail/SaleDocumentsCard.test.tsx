import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SaleDocumentsCard } from './SaleDocumentsCard'
import type { Sale, Documents } from '../../../../lib/salesService'

const originalFetch = globalThis.fetch

beforeEach(() => {
  // Default: every file is reachable, so existing behavioral tests aren't affected by the
  // PDF-availability check added to guard against Cloudinary delivery failures.
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function createSale(documents?: Partial<Documents>): Sale {
  const defaultDocuments: Documents = {
    uploadedDocuments: [
      'https://example.com/doc1.pdf',
      'https://example.com/image1.jpg',
    ],
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
    documents: { ...defaultDocuments, ...documents } as Documents,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
  }
}

describe('SaleDocumentsCard', () => {
  it('renders documents heading with count', () => {
    const sale = createSale()
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText(/Documents & Photos \(2\)/)).toBeInTheDocument()
  })

  it('displays document count in heading', () => {
    const sale = createSale({
      uploadedDocuments: ['doc1.pdf', 'doc2.pdf', 'doc3.pdf'],
    })
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText(/Documents & Photos \(3\)/)).toBeInTheDocument()
  })

  it('renders view links for documents', () => {
    const sale = createSale()
    render(<SaleDocumentsCard sale={sale} />)
    const links = screen.getAllByText('View')
    expect(links).toHaveLength(2)
  })

  it('shows empty state when uploadedDocuments is null', () => {
    const sale = createSale()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sale as any).documents = { uploadedDocuments: null }
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
  })

  it('shows empty state when uploadedDocuments is empty', () => {
    const sale = createSale({ uploadedDocuments: [] })
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
  })

  it('shows empty state when documents is undefined', () => {
    const sale = createSale()
    sale.documents = undefined as unknown as Documents
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText('No documents uploaded')).toBeInTheDocument()
  })

  it('document links have correct href attributes', () => {
    const sale = createSale()
    render(<SaleDocumentsCard sale={sale} />)
    const links = screen.getAllByText('View') as HTMLAnchorElement[]
    expect(links[0]).toHaveAttribute('href', 'https://example.com/doc1.pdf')
    expect(links[1]).toHaveAttribute('href', 'https://example.com/image1.jpg')
  })

  it('document links open in new tab', () => {
    const sale = createSale()
    render(<SaleDocumentsCard sale={sale} />)
    const links = screen.getAllByText('View')
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('displays single document', () => {
    const sale = createSale({
      uploadedDocuments: ['https://example.com/single.pdf'],
    })
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText(/Documents & Photos \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('displays multiple documents', () => {
    const sale = createSale({
      uploadedDocuments: [
        'https://example.com/doc1.pdf',
        'https://example.com/doc2.pdf',
        'https://example.com/doc3.pdf',
      ],
    })
    render(<SaleDocumentsCard sale={sale} />)
    expect(screen.getByText(/Documents & Photos \(3\)/)).toBeInTheDocument()
    const links = screen.getAllByText('View')
    expect(links).toHaveLength(3)
  })

  it('shows a safe fallback for a broken/legacy PDF instead of a dead link, preserving the filename', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch
    const sale = createSale({ uploadedDocuments: ['https://example.com/broken-legacy.pdf'] })
    render(<SaleDocumentsCard sale={sale} />)

    await waitFor(() => {
      expect(screen.getByText('File unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('broken-legacy.pdf')).toBeInTheDocument()
    expect(screen.queryByText('View')).not.toBeInTheDocument()
    expect(screen.queryByText('Download')).not.toBeInTheDocument()
  })

  it('does not crash when a PDF availability check fails outright (network error)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network error')
    }) as typeof fetch
    const sale = createSale({ uploadedDocuments: ['https://example.com/unreachable.pdf'] })
    expect(() => render(<SaleDocumentsCard sale={sale} />)).not.toThrow()
    await waitFor(() => {
      expect(screen.getByText('File unavailable')).toBeInTheDocument()
    })
  })

  it('still renders View/Download for a reachable PDF', async () => {
    const sale = createSale({ uploadedDocuments: ['https://example.com/ok.pdf'] })
    render(<SaleDocumentsCard sale={sale} />)
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument()
    })
    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(screen.queryByText('File unavailable')).not.toBeInTheDocument()
  })
})
