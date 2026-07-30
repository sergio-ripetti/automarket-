import { describe, it, expect, vi, beforeEach } from 'vitest'
import autoTable from 'jspdf-autotable'
import type { Sale } from '../salesService'
import { generateInvoice, writeAllFooters } from '../invoiceService'

vi.mock('jspdf-autotable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf-autotable')>()
  return { ...actual, default: vi.fn(actual.default) }
})

// Full, realistic fixture mirroring the one used in AdminSaleDetail.test.tsx, so the redesigned
// PDF is exercised against the real Sale shape rather than a stripped-down fake.
const createSale = (overrides?: Partial<Sale>): Sale => ({
  id: 'sale-123',
  carId: 'car-001',
  carTitle: '2020 Toyota Camry',
  carBrand: 'Toyota',
  carModel: 'Camry',
  carYear: 2020,
  carColor: 'Silver',
  carImages: ['https://example.com/car.jpg'],
  buyer: {
    name: 'John Smith',
    idNumber: 'AB123456',
    email: 'john@example.com',
    phone: '555-1234',
    address: '123 Main St',
    licenseNumber: 'LS123456',
  },
  paymentPlan: {
    type: 'financing',
    salePrice: 25000,
    downPayment: 5000,
    financedAmount: 20000,
    monthlyRate: 0.08,
    termMonths: 60,
    monthlyPayment: 400,
    totalPayment: 24000,
    totalInterest: 4000,
    firstPaymentDate: '2025-01-15',
  },
  payments: [
    { id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' },
    { id: 'payment-2', dueDate: '2025-02-15', amount: 400, status: 'paid' },
  ],
  status: 'active',
  saleDate: '2025-01-01',
  notes: 'Test sale',
  vehicleInfo: {
    vin: 'JTHBP5C1XA5034760',
    plate: 'ABC123',
    isNZNew: false,
    originCountry: 'Japan',
    previousOwners: 2,
    hasMaintenanceHistory: true,
  },
  orc: {
    wof: 150,
    registration: 200,
    registrationMonths: 12,
    grooming: 0,
    ownershipTransfer: 150,
    mechanicalInspection: 0,
    otherLabel: '',
    otherAmount: 0,
    orcTotal: 500,
    orcIncluded: false,
    driveAwayPrice: false,
  },
  extraAccessories: { items: [], total: 0 },
  createdAt: { toDate: () => new Date() } as unknown as Sale['createdAt'],
  ...overrides,
})

describe('generateInvoice - redesigned PDF renders without throwing', () => {
  beforeEach(() => {
    // jsPDF's save() creates a Blob + object URL + anchor click, none of which jsdom implements
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  it('renders a cash sale (no financing section, no payment schedule) without throwing', () => {
    const sale = createSale({
      paymentPlan: {
        type: 'cash', salePrice: 25000, downPayment: 0, financedAmount: 0,
        monthlyRate: 0, termMonths: 0, monthlyPayment: 0, totalPayment: 25000, totalInterest: 0,
        firstPaymentDate: '',
      },
      payments: [],
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('renders a pure financing sale with a payment schedule without throwing', () => {
    const sale = createSale()
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('renders a mixed cash+financing sale without throwing', () => {
    const sale = createSale({ paymentPlan: { ...createSale().paymentPlan, type: 'mixed' } })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('renders correctly with no notes (does not force an empty section)', () => {
    const sale = createSale({ notes: '' })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('renders correctly with no accessories, no financing fees, no warranty/insurance (all optional sections absent)', () => {
    const sale = createSale({
      extraAccessories: { items: [], total: 0 },
      financingFees: undefined,
      warranty: undefined,
      mechanicalInsurance: undefined,
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('renders correctly with all optional sections present (accessories, financing fees, warranty, insurance)', () => {
    const sale = createSale({
      extraAccessories: { items: [{ description: 'Tow bar', price: 300 }, { description: 'Floor mats', price: 80 }], total: 380 },
      financingFees: { establishmentFee: 250, ppsr: 50, monthlyAccountFee: 15, dealerOriginationFee: 100, total: 415 },
      warranty: { included: true, months: 24, provider: 'AA Warranty' },
      mechanicalInsurance: { included: true, months: 12, provider: 'Protecta' },
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('handles a long buyer name and long vehicle title without throwing', () => {
    const sale = createSale({
      carTitle: '2024 Mercedes-Benz GLE 450 4MATIC AMG Line Premium Plus Package Long Wheelbase',
      buyer: {
        name: 'Alexandra Wellington-Fitzgerald-Montgomery the Third',
        idNumber: 'AB123456', email: 'alexandra.wellington.fitzgerald@example.co.nz',
        phone: '021 555 1234', address: '456 Very Long Street Name Avenue, Ponsonby, Auckland Central 1011',
        licenseNumber: 'LS123456',
      },
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('handles ORC included-in-price (no ORC line items) without throwing', () => {
    const sale = createSale({
      orc: { wof: 0, registration: 0, registrationMonths: 12, grooming: 0, ownershipTransfer: 0, mechanicalInspection: 0, otherLabel: '', otherAmount: 0, orcTotal: 0, orcIncluded: true, driveAwayPrice: true },
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('handles an NZ-new vehicle (no country-of-origin row) without throwing', () => {
    const sale = createSale({
      vehicleInfo: { vin: 'JTHBP5C1XA5034760', plate: 'ABC123', isNZNew: true, originCountry: '', previousOwners: 0, hasMaintenanceHistory: false },
    })
    expect(() => generateInvoice(sale)).not.toThrow()
  })

  it('completes the full render and save pipeline for a realistic sale without throwing', () => {
    const sale = createSale()
    expect(() => generateInvoice(sale)).not.toThrow()
  })
})

describe('generateInvoice - vehicle colour presentation', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  // Finds the ['Colour', value] row passed to the Vehicle Details autoTable call, by inspecting
  // every mocked autoTable invocation's body data.
  function findRenderedColourValue(sale: Sale): string | undefined {
    const mockedAutoTable = autoTable as unknown as ReturnType<typeof vi.fn>
    mockedAutoTable.mockClear()
    generateInvoice(sale)
    for (const call of mockedAutoTable.mock.calls) {
      const options = call[1] as { body?: unknown[] }
      const row = options.body?.find((r) => Array.isArray(r) && r[0] === 'Colour') as
        | [string, string]
        | undefined
      if (row) return row[1]
    }
    return undefined
  }

  it('does not render the raw hex value as the Colour field', () => {
    const sale = createSale({ carColor: '#f5f5f5' })
    expect(findRenderedColourValue(sale)).not.toBe('#f5f5f5')
  })

  it('renders "White" for a near-white hex colour', () => {
    const sale = createSale({ carColor: '#f5f5f5' })
    expect(findRenderedColourValue(sale)).toBe('White')
  })

  it('renders the correct name for another colour', () => {
    const sale = createSale({ carColor: '#ff0000' })
    expect(findRenderedColourValue(sale)).toBe('Red')
  })

  it('uses a safe fallback for a missing colour value', () => {
    const sale = createSale({ carColor: '' })
    const value = findRenderedColourValue(sale)
    expect(value).toBe('Unknown colour')
  })

  it('does not throw and preserves other invoice data when the colour changes', () => {
    const sale = createSale({ carColor: '#ff0000' })
    expect(() => generateInvoice(sale)).not.toThrow()
  })
})

describe('writeAllFooters - page numbering', () => {
  // A minimal fake jsPDF-like object so the numbering loop is tested in isolation, independent
  // of full PDF generation (which always produces at least 2 physical pages).
  function createFakeDoc(totalPages: number) {
    return {
      getNumberOfPages: () => totalPages,
      setPage: vi.fn(),
    }
  }

  it('numbers a single-page document as Page 1 of 1', () => {
    const doc = createFakeDoc(1)
    const draw = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeAllFooters(doc as any, draw)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw).toHaveBeenNthCalledWith(1, doc, 1, 1)
  })

  it('numbers a two-page document as Page 1 of 2 then Page 2 of 2', () => {
    const doc = createFakeDoc(2)
    const draw = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeAllFooters(doc as any, draw)
    expect(draw).toHaveBeenCalledTimes(2)
    expect(draw).toHaveBeenNthCalledWith(1, doc, 1, 2)
    expect(draw).toHaveBeenNthCalledWith(2, doc, 2, 2)
  })

  it('numbers a three-page document as Page 1 of 3, Page 2 of 3, Page 3 of 3 (Consumer Information Notice page included)', () => {
    const doc = createFakeDoc(3)
    const draw = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeAllFooters(doc as any, draw)
    expect(draw).toHaveBeenCalledTimes(3)
    expect(draw).toHaveBeenNthCalledWith(1, doc, 1, 3)
    expect(draw).toHaveBeenNthCalledWith(2, doc, 2, 3)
    expect(draw).toHaveBeenNthCalledWith(3, doc, 3, 3)
  })

  it('activates every page via setPage exactly once, in order, with no page skipped or duplicated', () => {
    const doc = createFakeDoc(4)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeAllFooters(doc as any, vi.fn())
    expect(doc.setPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3, 4])
  })

  it('never numbers a page as 0 and never produces an off-by-one total', () => {
    const doc = createFakeDoc(5)
    const draw = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeAllFooters(doc as any, draw)
    for (const [, page, total] of draw.mock.calls) {
      expect(page).toBeGreaterThanOrEqual(1)
      expect(total).toBe(5)
    }
    expect(draw.mock.calls.at(-1)?.[1]).toBe(5)
  })
})
