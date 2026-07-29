import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as salesService from '../../../lib/salesService'
import AdminSales from '../AdminSales'
import type { Sale } from '../../../lib/salesService'

vi.mock('../../../lib/salesService')
vi.mock('../../../lib/adminSalesService')

function makeSale(overrides: Partial<Sale> = {}): Sale {
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
      type: 'cash',
      salePrice: 25000,
      downPayment: 0,
      financedAmount: 0,
      monthlyRate: 0,
      termMonths: 0,
      monthlyPayment: 0,
      totalPayment: 25000,
      totalInterest: 0,
      firstPaymentDate: '2024-01-01',
    },
    payments: [],
    status: 'completed',
    saleDate: '2023-12-01',
    notes: '',
    vehicleInfo: {
      vin: 'JTHBE1C26A5001234',
      plate: 'ABC123',
      isNZNew: true,
      originCountry: '',
      previousOwners: 1,
      hasMaintenanceHistory: true,
    },
    orc: {
      wof: 0, registration: 0, registrationMonths: 12, grooming: 0, ownershipTransfer: 0,
      mechanicalInspection: 0, otherLabel: '', otherAmount: 0, orcTotal: 0, orcIncluded: false, driveAwayPrice: false,
    },
    extraAccessories: { items: [], total: 0 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: new Date() as any,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSales />
    </MemoryRouter>
  )
}

describe('AdminSales - Visual consistency pass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale()])
  })

  it('renders the "Sales Records" title using Dashboard-compatible font-bebas heading treatment', async () => {
    renderPage()
    const heading = await screen.findByText('Sales Records')
    expect(heading.tagName).toBe('H1')
    expect(heading).toHaveClass('font-bebas')
  })

  it('renders a record-count subtitle beneath the title (Dashboard-style rhythm)', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    expect(screen.getByText('1 sales recorded')).toBeInTheDocument()
  })

  it('renders exactly four metric cards using the shared admin-sales-stat-card class', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    const cards = document.querySelectorAll('.admin-sales-stat-card')
    expect(cards.length).toBe(4)
  })

  it('metric cards use the Dashboard-compatible white/bordered recipe (not the old dark-gradient card)', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    const styleTag = Array.from(document.querySelectorAll('style')).find((s) =>
      s.textContent?.includes('.admin-sales-stat-card')
    )
    expect(styleTag?.textContent).toContain('background-color: #FFFFFF')
    expect(styleTag?.textContent).not.toContain('linear-gradient(135deg, rgba(255,255,255')
  })

  it('shows the four required metric labels: Total Revenue, Cash Sales, Financed Sales, Active Financing', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('Cash Sales')).toBeInTheDocument()
    expect(screen.getByText('Financed Sales')).toBeInTheDocument()
    expect(screen.getByText('Active Financing')).toBeInTheDocument()
  })

  it('Record New Sale button remains present, labeled, and accessible', async () => {
    renderPage()
    const button = await screen.findByRole('button', { name: /Record New Sale/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })

  it('preserves total revenue calculation in the metric card', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    await waitFor(() => {
      expect(screen.getAllByText('$25,000').length).toBeGreaterThan(0)
    })
  })

  it('the search field has a programmatic accessible name (fixed: was placeholder-only)', async () => {
    renderPage()
    await screen.findByText('Sales Records')
    const search = screen.getByRole('textbox', { name: 'Search sales by buyer, car, or ID number' })
    expect(search).toHaveAttribute('id', 'admin-sales-search-bar')
    // No duplicate id in the document
    expect(document.querySelectorAll('#admin-sales-search-bar')).toHaveLength(1)
  })
})
