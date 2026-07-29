import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sale } from '../../../lib/salesService'
import * as salesService from '../../../lib/salesService'
import * as adminSalesService from '../../../lib/adminSalesService'
import * as cloudinaryService from '../../../lib/cloudinaryService'
import AdminEditSale from '../AdminEditSale'

vi.mock('../../../lib/salesService', async () => {
  const actual = await vi.importActual('../../../lib/salesService')
  return { ...actual, getSaleById: vi.fn() }
})
vi.mock('../../../lib/adminSalesService')
vi.mock('../../../lib/cloudinaryService')
vi.mock('../../../lib/toast')

const downloadSaleDocumentMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../../../lib/downloadSaleDocument', () => ({
  downloadSaleDocument: (...args: unknown[]) => downloadSaleDocumentMock(...args),
  SaleDocumentDownloadError: class SaleDocumentDownloadError extends Error {},
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function createSale(overrides?: Partial<Sale>): Sale {
  return {
    id: 'sale-123',
    carId: 'car-001',
    carTitle: '2020 Toyota Camry',
    carBrand: 'Toyota',
    carModel: 'Camry',
    carYear: 2020,
    carColor: '#c0c0c0',
    carImages: ['https://example.com/car.jpg'],
    buyer: {
      name: 'John Smith',
      idNumber: 'AB123456',
      email: 'john@example.com',
      phone: '021234567',
      address: '123 Main St',
      licenseNumber: 'AB12345',
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
      firstPaymentDate: '2025-01-15',
    },
    payments: [],
    status: 'completed',
    saleDate: '2024-12-01',
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
    documents: { uploadedDocuments: [] },
    createdAt: { toDate: () => new Date() } as unknown as Sale['createdAt'],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/sales/edit/sale-123']}>
      <Routes>
        <Route path="/admin/sales/edit/:id" element={<AdminEditSale />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminEditSale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminSalesService.updateSale).mockResolvedValue({ success: true })
  })

  it('loads the sale and defaults the payment type toggle to the saved type (cash)', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale({ paymentPlan: createSale().paymentPlan }))
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))
    const cashButton = screen.getByRole('button', { name: 'Cash' })
    expect(cashButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching payment type from Cash to Financing reveals Loan Term and Financing Fees fields', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    expect(screen.queryByText('Loan Term (months)')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Financing' }))

    expect(screen.getByText('Loan Term (months)')).toBeInTheDocument()
    expect(screen.getByText('Financing Fees (NZD)')).toBeInTheDocument()
    expect(screen.queryByText('Down Payment (NZD)')).not.toBeInTheDocument()
  })

  it('switching to Mixed shows the Down Payment field as well', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    fireEvent.click(screen.getByRole('button', { name: 'Mixed' }))

    expect(screen.getByText('Down Payment (NZD)')).toBeInTheDocument()
    expect(screen.getByText('Loan Term (months)')).toBeInTheDocument()
  })

  it('recalculates the Monthly Payment summary when switching from Cash to Financing', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    expect(screen.queryByText('Monthly Payment')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Financing' }))

    await waitFor(() => {
      expect(screen.getByText('Monthly Payment')).toBeInTheDocument()
    })
  })

  it('sends the updated payment type, payments schedule, and status when saving a Cash-to-Financing change', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    fireEvent.click(screen.getByRole('button', { name: 'Financing' }))
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(adminSalesService.updateSale).toHaveBeenCalled()
    })
    const [, payload] = vi.mocked(adminSalesService.updateSale).mock.calls[0]
    expect(payload.paymentPlan?.type).toBe('financing')
    expect(payload.status).toBe('active')
    expect(payload.payments?.length).toBeGreaterThan(0)
  })

  it('preserves the existing payment schedule when some payments are already marked paid', async () => {
    const sale = createSale({
      paymentPlan: {
        type: 'financing', salePrice: 25000, downPayment: 0, financedAmount: 25000, monthlyRate: 0.8,
        termMonths: 12, monthlyPayment: 2170, totalPayment: 26040, totalInterest: 1040, firstPaymentDate: '2025-01-15',
      },
      payments: [
        { id: 'p1', dueDate: '2025-01-15', amount: 2170, status: 'paid' },
        { id: 'p2', dueDate: '2025-02-15', amount: 2170, status: 'pending' },
      ],
      status: 'active',
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    const loanTermInput = screen.getByDisplayValue('12')
    fireEvent.change(loanTermInput, { target: { value: '24' } })
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(adminSalesService.updateSale).toHaveBeenCalled()
    })
    const [, payload] = vi.mocked(adminSalesService.updateSale).mock.calls[0]
    expect(payload.payments).toEqual(sale.payments)
  })

  it('uppercases the licence number as the user types', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    const licenceInput = screen.getByDisplayValue('AB12345')
    fireEvent.change(licenceInput, { target: { value: 'cd67890' } })
    expect(screen.getByDisplayValue('CD67890')).toBeInTheDocument()
  })

  it('deletes the file from Cloudinary BEFORE removing it from local state (confirmed-delete order)', async () => {
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    let resolveDelete: (v: { success: boolean }) => void
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockReturnValue(
      new Promise((resolve) => { resolveDelete = resolve })
    )
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    fireEvent.click(screen.getByLabelText('Remove doc.pdf'))

    // While the delete call is still pending, the file must still be visible in the form -
    // it must not disappear before Cloudinary confirms deletion.
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledWith('automarket/sales/doc', 'image')
    })
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()

    resolveDelete!({ success: true })
    await waitFor(() => {
      expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument()
    })
  })

  it('disables the Remove button while a deletion is in flight and ignores repeated clicks', async () => {
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    let resolveDelete: (v: { success: boolean }) => void
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockReturnValue(
      new Promise((resolve) => { resolveDelete = resolve })
    )
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    const removeButton = screen.getByLabelText('Remove doc.pdf')
    fireEvent.click(removeButton)
    await waitFor(() => {
      expect(screen.getByLabelText('Deleting doc.pdf...')).toBeDisabled()
    })

    // A second click while pending must not fire a second delete request.
    fireEvent.click(screen.getByLabelText('Deleting doc.pdf...'))
    expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(1)

    resolveDelete!({ success: true })
    await waitFor(() => screen.queryByText('doc.pdf') === null)
  })

  it('keeps the file in form state (and therefore in the save payload) when Cloudinary deletion fails', async () => {
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockResolvedValue({ success: false, error: 'Cloudinary deletion failed' })
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    fireEvent.click(screen.getByLabelText('Remove doc.pdf'))

    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalled()
    })
    // The file must remain visible/in state after a failed deletion - not silently dropped.
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save Changes'))
    await waitFor(() => {
      expect(adminSalesService.updateSale).toHaveBeenCalled()
    })
    const [, payload] = vi.mocked(adminSalesService.updateSale).mock.calls[0]
    expect(payload.documents?.uploadedDocuments).toHaveLength(1)
  })

  it('allows retrying deletion after a failure, and the retry can succeed', async () => {
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    vi.mocked(adminSalesService.deleteCloudinaryFile)
      .mockResolvedValueOnce({ success: false, error: 'Network error' })
      .mockResolvedValueOnce({ success: true })
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    fireEvent.click(screen.getByLabelText('Remove doc.pdf'))
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()

    // Button must be re-enabled after the failure so the user can retry.
    fireEvent.click(screen.getByLabelText('Remove doc.pdf'))
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument()
    })
  })

  it('shows a confirmation dialog for a legacy string-only entry, explaining Cloudinary must be deleted manually, and does not call the delete endpoint', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const sale = createSale({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents: { uploadedDocuments: ['https://example.com/legacy.pdf'] as any },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    renderPage()
    await waitFor(() => screen.getByText('legacy.pdf'))

    fireEvent.click(screen.getByLabelText('Remove legacy.pdf'))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/cannot be automatically deleted from Cloudinary/i))
    await waitFor(() => {
      expect(screen.queryByText('legacy.pdf')).not.toBeInTheDocument()
    })
    expect(adminSalesService.deleteCloudinaryFile).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('keeps a legacy entry when the user cancels the confirmation dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const sale = createSale({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents: { uploadedDocuments: ['https://example.com/legacy.pdf'] as any },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    renderPage()
    await waitFor(() => screen.getByText('legacy.pdf'))

    fireEvent.click(screen.getByLabelText('Remove legacy.pdf'))

    expect(confirmSpy).toHaveBeenCalled()
    expect(screen.getByText('legacy.pdf')).toBeInTheDocument()
    expect(adminSalesService.deleteCloudinaryFile).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows a controlled error toast (not a crash) when Cloudinary deletion fails', async () => {
    const toastLib = await import('../../../lib/toast')
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockResolvedValue({ success: false, error: 'Cloudinary deletion failed' })
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    fireEvent.click(screen.getByLabelText('Remove doc.pdf'))

    await waitFor(() => {
      expect(toastLib.showToast).toHaveBeenCalledWith('Cloudinary deletion failed', 'error')
    })
  })

  it('uploads a new file via uploadSalesDocument and persists its publicId for later deletion', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/new.pdf',
      publicId: 'automarket/sales/new',
      resourceType: 'image',
    })
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })
    const input = document.getElementById('edit-unified-upload') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(cloudinaryService.uploadSalesDocument).toHaveBeenCalledWith(file, 'sales')
    })
  })

  it('routes Download for an already-saved attachment through the protected download proxy', async () => {
    const sale = createSale({
      documents: {
        uploadedDocuments: [
          { url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf', publicId: 'automarket/sales/doc', resourceType: 'image', filename: 'doc.pdf' },
        ],
      },
    })
    vi.mocked(salesService.getSaleById).mockResolvedValue(sale)
    renderPage()
    await waitFor(() => screen.getByText('doc.pdf'))

    fireEvent.click(screen.getByLabelText('Download doc.pdf'))

    expect(downloadSaleDocumentMock).toHaveBeenCalledWith(
      'sale-123',
      'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/doc.pdf',
      'doc.pdf'
    )
  })

  it('falls back to a direct link for a newly added, not-yet-saved attachment (no proxy call)', async () => {
    vi.mocked(salesService.getSaleById).mockResolvedValue(createSale())
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/new.pdf',
      publicId: 'automarket/sales/new',
      resourceType: 'image',
    })
    renderPage()
    await waitFor(() => screen.getByText('Payment Type'))

    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })
    const input = document.getElementById('edit-unified-upload') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    const downloadLink = await screen.findByLabelText('Download new.pdf')
    expect(downloadLink.tagName).toBe('A')
    expect(downloadLink).toHaveAttribute('href', 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/new.pdf')
    expect(downloadSaleDocumentMock).not.toHaveBeenCalled()
  })
})
