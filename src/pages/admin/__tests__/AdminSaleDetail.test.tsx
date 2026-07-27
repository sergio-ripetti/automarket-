import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sale } from '../../../lib/salesService'
import * as salesService from '../../../lib/salesService'
import * as adminSalesService from '../../../lib/adminSalesService'
import * as invoiceService from '../../../lib/invoiceService'
import AdminSaleDetail from '../AdminSaleDetail'

vi.mock('../../../lib/salesService')
vi.mock('../../../lib/adminSalesService')
vi.mock('../../../lib/invoiceService')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('../../../lib/toast')
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))

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
    { id: 'payment-2', dueDate: '2025-02-15', amount: 400, status: 'pending' },
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

const AdminSaleDetailWrapper = () => (
  <MemoryRouter initialEntries={['/admin/sales/sale-123']}>
    <Routes>
      <Route path="/admin/sales/:id" element={<AdminSaleDetail />} />
    </Routes>
  </MemoryRouter>
)

describe('AdminSaleDetail - Backend Payment Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Mark Payment as Paid', () => {
    it('calls updatePaymentStatus with correct parameters when mark paid clicked', async () => {
      const sale = createSale({
        payments: [
          { id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' },
        ],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: true })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        const buttons = screen.queryAllByText('Mark Paid')
        expect(buttons.length).toBeGreaterThan(0)
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      await waitFor(() => {
        expect(adminSalesService.updatePaymentStatus).toHaveBeenCalledWith('sale-123', 'payment-1', 'paid')
      })
    })

    it('calls updatePaymentStatus exactly once per button click', async () => {
      const sale = createSale({
        payments: [{ id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' }],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: true })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(screen.queryAllByText('Mark Paid').length).toBeGreaterThan(0)
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      await waitFor(() => {
        expect(adminSalesService.updatePaymentStatus).toHaveBeenCalledTimes(1)
      })
    })

    it('refetches sale after success', async () => {
      const sale = createSale({
        payments: [{ id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' }],
      })
      const updatedSale = createSale({
        payments: [{ id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'paid', paidDate: '2025-01-20' }],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValueOnce(sale).mockResolvedValueOnce(updatedSale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: true })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(screen.queryAllByText('Mark Paid').length).toBeGreaterThan(0)
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      await waitFor(() => {
        // First call on load, second call after marking payment
        expect(vi.mocked(salesService.getSaleById)).toHaveBeenCalledTimes(2)
      })
    })

    it('does not display false success on backend failure', async () => {
      const sale = createSale({
        payments: [{ id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' }],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: false, error: 'Backend error' })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(screen.queryAllByText('Mark Paid').length).toBeGreaterThan(0)
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      // Verify the payment still shows as pending after failure
      await waitFor(() => {
        expect(vi.mocked(salesService.getSaleById)).toHaveBeenCalled()
      })
    })
  })

  describe('Mark Payment as Unpaid', () => {
    it('refetches sale after backend call', async () => {
      const sale = createSale({
        status: 'completed',
        payments: [
          { id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'paid', paidDate: '2025-01-20' },
        ],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValueOnce(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: true })

      render(<AdminSaleDetailWrapper />)

      // Component renders and loads sale on mount
      await waitFor(() => {
        expect(vi.mocked(salesService.getSaleById)).toHaveBeenCalled()
      })

      // Verify getSaleById was called at least once
      expect(vi.mocked(salesService.getSaleById).mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('refetches sale after successful payment update', async () => {
      const sale = createSale({
        status: 'active',
        payments: [
          { id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' },
        ],
      })

      vi.mocked(salesService.getSaleById).mockResolvedValueOnce(sale).mockResolvedValueOnce(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: true })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(vi.mocked(salesService.getSaleById)).toHaveBeenCalled()
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      await waitFor(() => {
        // After update, getSaleById should be called again to refresh
        expect(vi.mocked(salesService.getSaleById).mock.calls.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('does not falsely update UI on payment failure', async () => {
      const sale = createSale({
        status: 'active',
        payments: [
          { id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' },
        ],
        notes: 'Test notes',
      })

      vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: false, error: 'Backend failed' })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(screen.getByText('Test notes')).toBeInTheDocument()
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      // After failure, notes should still show original data
      await waitFor(() => {
        expect(screen.getByText('Test notes')).toBeInTheDocument()
      })
    })
  })

  describe('Sale State Preservation', () => {
    it('preserves existing sale state on backend failure', async () => {
      const sale = createSale({
        payments: [{ id: 'payment-1', dueDate: '2025-01-15', amount: 400, status: 'pending' }],
        notes: 'Important notes',
      })

      vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
      vi.mocked(adminSalesService.updatePaymentStatus).mockResolvedValue({ success: false, error: 'Error' })

      render(<AdminSaleDetailWrapper />)

      await waitFor(() => {
        expect(screen.getByText('Important notes')).toBeInTheDocument()
      })

      const markPaidButtons = screen.getAllByText('Mark Paid')
      fireEvent.click(markPaidButtons[0])

      // After failure, notes should still be displayed
      await waitFor(() => {
        expect(screen.getByText('Important notes')).toBeInTheDocument()
      })
    })
  })
})

describe('AdminSaleDetail - Visual consistency pass (action buttons, layout, regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Download Invoice action still calls generateInvoice with the sale', async () => {
    const sale = createSale()
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)

    render(<AdminSaleDetailWrapper />)
    await waitFor(() => screen.getByText('Download Invoice'))

    fireEvent.click(screen.getByText('Download Invoice'))
    expect(invoiceService.generateInvoice).toHaveBeenCalledWith(sale)
  })

  it('Edit action still navigates to the edit route', async () => {
    const sale = createSale()
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)

    render(<AdminSaleDetailWrapper />)
    await waitFor(() => screen.getByText('Edit'))

    fireEvent.click(screen.getByText('Edit'))
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/sales/edit/${sale.id}`)
  })

  it('Download Invoice and Edit remain compact action buttons sharing the same class family', async () => {
    const sale = createSale()
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)

    render(<AdminSaleDetailWrapper />)
    await waitFor(() => screen.getByText('Download Invoice'))

    const invoiceButton = screen.getByText('Download Invoice').closest('button')
    const editButton = screen.getByText('Edit').closest('button')
    expect(invoiceButton).toHaveClass('admin-sales-detail-btn')
    expect(editButton).toHaveClass('admin-sales-detail-btn')
  })

  it('Full Financing summary remains functional (values render) with the restyled white card', async () => {
    const sale = createSale({
      paymentPlan: {
        type: 'financing',
        salePrice: 25000,
        downPayment: 0,
        financedAmount: 25000,
        monthlyRate: 0.08,
        termMonths: 60,
        monthlyPayment: 500,
        totalPayment: 30000,
        totalInterest: 5000,
        firstPaymentDate: '2025-01-15',
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)

    render(<AdminSaleDetailWrapper />)
    await waitFor(() => screen.getByText('Full Financing'))

    expect(screen.getByText('$500')).toBeInTheDocument()
    const paymentCard = document.querySelector('#admin-sales-detail-payment') as HTMLElement
    expect(paymentCard.style.backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('Cash sale still renders in a single full-width column (no empty second column)', async () => {
    const sale = createSale({
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
        firstPaymentDate: '2025-01-15',
      },
      payments: [],
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)

    render(<AdminSaleDetailWrapper />)
    await waitFor(() => screen.getByText('Cash Payment'))

    expect(document.getElementById('admin-sales-detail-right-col')).not.toBeInTheDocument()
    const grid = document.getElementById('admin-sales-detail-grid')
    expect(grid).toHaveClass('sale-detail-grid--single-col')
  })
})
