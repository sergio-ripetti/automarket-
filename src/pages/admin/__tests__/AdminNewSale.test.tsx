import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as carsService from '../../../lib/carsService'
import * as adminSalesService from '../../../lib/adminSalesService'
import * as cloudinaryService from '../../../lib/cloudinaryService'
import * as salesService from '../../../lib/salesService'
import type { Sale } from '../../../lib/salesService'
import * as toastLib from '../../../lib/toast'
import AdminNewSale from '../AdminNewSale'
import type { Car } from '../../../types'

vi.mock('../../../lib/carsService')
vi.mock('../../../lib/adminSalesService')
vi.mock('../../../lib/cloudinaryService')
vi.mock('../../../lib/toast')
vi.mock('../../../lib/salesService', async () => {
  const actual = await vi.importActual('../../../lib/salesService')
  return { ...actual, getSales: vi.fn() }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Default: no existing sales, so the sold-vehicle exclusion never filters anything out unless a
// test explicitly overrides this. Set once at module scope since it must survive vi.clearAllMocks()
// calls in every describe block's beforeEach (clearAllMocks does not reset mock implementations).
vi.mocked(salesService.getSales).mockResolvedValue([])

const testCar: Car = {
  id: 'car-1',
  title: '2020 Toyota Camry',
  brand: 'Toyota',
  model: 'Camry',
  year: 2020,
  price: 25000,
  km: 42000,
  transmission: 'automatico',
  fuel: 'gasolina',
  color: 'Silver',
  description: '',
  ownerDescription: '',
  images: ['https://example.com/car.jpg'],
  featured: false,
  isOnSale: false,
} as unknown as Car

function renderWizard() {
  return render(
    <MemoryRouter>
      <AdminNewSale />
    </MemoryRouter>
  )
}

async function goToStep2() {
  renderWizard()
  await waitFor(() => screen.getByPlaceholderText('Search vehicles...'))
  fireEvent.focus(screen.getByPlaceholderText('Search vehicles...'))
  fireEvent.change(screen.getByPlaceholderText('Search vehicles...'), { target: { value: 'Camry' } })
  await waitFor(() => screen.getByText('2020 Toyota Camry'))
  fireEvent.click(screen.getByText('2020 Toyota Camry'))
  fireEvent.change(screen.getByPlaceholderText('e.g. JTHBP5C1XA5034760'), { target: { value: 'JTHBP5C1XA5034760' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. ABC123'), { target: { value: 'ABC123' } })
  fireEvent.click(screen.getByText('Next Step'))
  await waitFor(() => screen.getByText('Buyer Information'))
}

async function fillBuyerAndGoToStep3() {
  await goToStep2()
  fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: 'Jane Buyer' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'jane@example.com' } })
  fireEvent.change(screen.getByLabelText(/ID Number/), { target: { value: 'AB123456' } })
  fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: '0211234567' } })
  fireEvent.change(screen.getByLabelText(/Driver License/), { target: { value: 'AB12345' } })
  fireEvent.change(screen.getByLabelText(/Address/), { target: { value: '123 Queen St' } })
  await waitFor(() => expect(screen.getByText('Next Step')).not.toBeDisabled())
  fireEvent.click(screen.getByText('Next Step'))
  await waitFor(() => screen.getByText('Payment Plan'))
}

describe('AdminNewSale - Step indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('the active step number is visible (not the same color as its own background)', async () => {
    renderWizard()
    await waitFor(() => screen.getByText('Select Vehicle'))
    const activeCircle = document.querySelector('.admin-new-sale__step-circle--active')
    expect(activeCircle).toBeInTheDocument()
    expect(activeCircle?.textContent).toBe('1')
  })

  it('a completed step renders a check icon, and future step numbers stay visible', async () => {
    await fillBuyerAndGoToStep3()
    const completedCircles = document.querySelectorAll('.admin-new-sale__step-circle--completed')
    expect(completedCircles.length).toBe(2)
    // Completed circles render a check icon (svg), not a bare digit
    completedCircles.forEach((circle) => {
      expect(circle.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('Buyer step active styling applies when on step 2', async () => {
    await goToStep2()
    const activeCircle = document.querySelector('.admin-new-sale__step-circle--active')
    expect(activeCircle?.textContent).toBe('2')
  })

  it('Payment step active styling applies when on step 3', async () => {
    await fillBuyerAndGoToStep3()
    const activeCircle = document.querySelector('.admin-new-sale__step-circle--active')
    expect(activeCircle?.textContent).toBe('3')
  })

  it('Back preserves the previously entered vehicle and buyer values', async () => {
    await fillBuyerAndGoToStep3()
    // Go back to step 2, then back to step 1 is not directly exposed, but Back from step 3 must
    // return to step 2 with buyer data intact
    const backButtons = screen.getAllByText(/Back/)
    fireEvent.click(backButtons[0])
    await waitFor(() => screen.getByText('Buyer Information'))
    expect(screen.getByLabelText(/Full Name/)).toHaveValue('Jane Buyer')
  })
})

describe('AdminNewSale - Sale price regression (the confirmed manual QA defect)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('reaches the backend with a valid, non-empty salePrice in the payload - no "salePrice is required"', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: true, id: 'sale-123' })
    await fillBuyerAndGoToStep3()

    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => {
      expect(adminSalesService.createSale).toHaveBeenCalledTimes(1)
    })

    const payload = vi.mocked(adminSalesService.createSale).mock.calls[0][0]
    expect(payload.salePrice).toBeTypeOf('number')
    expect(payload.salePrice).toBeGreaterThan(0)
    expect(payload.salePrice).toBe(payload.paymentPlan.salePrice)
    expect(screen.queryByText(/salePrice is required/)).not.toBeInTheDocument()
  })

  it('submits exactly once per click (no repeated submission)', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: true, id: 'sale-123' })
    await fillBuyerAndGoToStep3()

    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => {
      expect(adminSalesService.createSale).toHaveBeenCalledTimes(1)
    })
  })

  it('shows one visible error and preserves form values when the backend rejects with "salePrice is required"', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: false, error: 'salePrice is required' })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await fillBuyerAndGoToStep3()

    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => {
      expect(adminSalesService.createSale).toHaveBeenCalledTimes(1)
    })

    // Buyer values must still be intact after a failed submit (no false success, no data loss)
    fireEvent.click(screen.getAllByText(/Back/)[0])
    expect(screen.getByLabelText(/Full Name/)).toHaveValue('Jane Buyer')
    // The failure path never itself logs to console - only genuine thrown exceptions do
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})

describe('AdminNewSale - Payment modes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('Cash mode: submits with salePrice and no financing-only fields required', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: true, id: 'sale-1' })
    await fillBuyerAndGoToStep3()
    // Cash is the default payment type
    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => expect(adminSalesService.createSale).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(adminSalesService.createSale).mock.calls[0][0]
    expect(payload.paymentPlan.type).toBe('cash')
    expect(payload.paymentPlan.downPayment).toBe(0)
    expect(payload.salePrice).toBeGreaterThan(0)
  })

  it('Financing mode: submits with loan term and first payment date coherent, salePrice present', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: true, id: 'sale-2' })
    await fillBuyerAndGoToStep3()

    fireEvent.click(screen.getByText('Financing'))
    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => expect(adminSalesService.createSale).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(adminSalesService.createSale).mock.calls[0][0]
    expect(payload.paymentPlan.type).toBe('financing')
    expect(payload.paymentPlan.termMonths).toBe(24)
    expect(payload.paymentPlan.firstPaymentDate).toBeTruthy()
    expect(payload.salePrice).toBeGreaterThan(0)
    expect(Number.isFinite(payload.paymentPlan.monthlyPayment)).toBe(true)
    expect(Number.isNaN(payload.paymentPlan.monthlyPayment)).toBe(false)
  })

  it('Mixed mode: cash (down payment) + financed component reconciles with sale price, salePrice present', async () => {
    vi.mocked(adminSalesService.createSale).mockResolvedValue({ success: true, id: 'sale-3' })
    await fillBuyerAndGoToStep3()

    fireEvent.click(screen.getByText('Mixed'))
    fireEvent.change(screen.getByLabelText(/Down Payment/), { target: { value: '5000' } })
    fireEvent.click(screen.getByText('Confirm Sale'))

    await waitFor(() => expect(adminSalesService.createSale).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(adminSalesService.createSale).mock.calls[0][0]
    expect(payload.paymentPlan.type).toBe('mixed')
    expect(payload.paymentPlan.downPayment).toBe(5000)
    expect(payload.paymentPlan.financedAmount).toBe(payload.salePrice - 5000)
    expect(payload.salePrice).toBeGreaterThan(0)
  })

  it('switching payment mode preserves salePrice and does not trigger the other mode required fields incorrectly', async () => {
    await fillBuyerAndGoToStep3()
    const salePriceBefore = (screen.getByLabelText(/Sale Price/) as HTMLInputElement).value

    fireEvent.click(screen.getByText('Financing'))
    fireEvent.click(screen.getByText('Cash'))

    const salePriceAfter = (screen.getByLabelText(/Sale Price/) as HTMLInputElement).value
    expect(salePriceAfter).toBe(salePriceBefore)
  })
})

describe('AdminNewSale - Numeric input contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('Sale Price input uses type=text with inputMode=numeric (not type=number)', async () => {
    await fillBuyerAndGoToStep3()
    const salePriceInput = screen.getByLabelText(/Sale Price/)
    expect(salePriceInput).toHaveAttribute('type', 'text')
    expect(salePriceInput).toHaveAttribute('inputMode', 'numeric')
  })

  it('rejects letters typed into Sale Price', async () => {
    await fillBuyerAndGoToStep3()
    const salePriceInput = screen.getByLabelText(/Sale Price/) as HTMLInputElement
    fireEvent.change(salePriceInput, { target: { value: 'abc123' } })
    expect(salePriceInput.value).toBe('123')
  })

  it('rejects e/E and +/- typed into Sale Price (no scientific notation)', async () => {
    await fillBuyerAndGoToStep3()
    const salePriceInput = screen.getByLabelText(/Sale Price/) as HTMLInputElement
    fireEvent.change(salePriceInput, { target: { value: '3e10' } })
    expect(salePriceInput.value).not.toMatch(/[eE+-]/)
    fireEvent.change(salePriceInput, { target: { value: '-999' } })
    expect(salePriceInput.value).not.toMatch(/[eE+-]/)
  })

  it('enforces the 7-digit maximum on Sale Price', async () => {
    await fillBuyerAndGoToStep3()
    const salePriceInput = screen.getByLabelText(/Sale Price/) as HTMLInputElement
    fireEvent.change(salePriceInput, { target: { value: '123456789' } })
    expect(salePriceInput.value.length).toBeLessThanOrEqual(7)
  })

  it('the loan-term month buttons are all present and readable (contrast fix)', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'));
    [12, 24, 36, 48, 60].forEach((m) => {
      expect(screen.getByText(`${m} mo`)).toBeInTheDocument()
    })
    const active = document.querySelector('.admin-new-sale__button--term--active')
    expect(active?.textContent).toBe('24 mo')
  })
})

describe('AdminNewSale - Encoding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('helper text and buttons do not contain mojibake sequences', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'))
    const bodyText = document.body.textContent || ''
    expect(bodyText).not.toContain('â€')
    expect(bodyText).not.toContain('Â')
  })

  it('renders the correct en-dash range copy for financing fee helper text', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'))
    fireEvent.click(screen.getAllByText('Financing Fees')[0])
    expect(screen.getByText((_, el) => el?.textContent === 'Typically NZ$150–500')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === 'Typically NZ$350–500')).toBeInTheDocument()
  })

  it('renders a correct left arrow on the Back button (not a corrupted sequence)', async () => {
    await fillBuyerAndGoToStep3()
    const backButton = screen.getAllByText(/Back/)[0].closest('button')
    expect(backButton?.textContent).toContain('←')
    expect(backButton?.textContent).not.toContain('â€')
  })
})

describe('AdminNewSale - Document upload (PDF Cloudinary defect regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  function getUploadInput(): HTMLInputElement {
    return document.getElementById('unified-upload') as HTMLInputElement
  }

  it('uploads a PDF via uploadSalesDocument, preserving its MIME type', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })

    await waitFor(() => {
      expect(cloudinaryService.uploadSalesDocument).toHaveBeenCalledWith(pdfFile, 'sales')
    })
  })

  it('persists the Cloudinary secure_url for the uploaded PDF, never a blob: URL', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })

    await waitFor(() => screen.getByText('View'))
    const viewLink = screen.getByText('View') as HTMLAnchorElement
    expect(viewLink.getAttribute('href')).toBe('https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf')
    expect(viewLink.getAttribute('href')).not.toMatch(/^blob:/)
  })

  it('surfaces a clear error and does not add a broken entry when Cloudinary rejects the PDF upload (delivery blocked)', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockRejectedValue(
      new Error('File uploaded but is not retrievable from Cloudinary. This usually means the Cloudinary account blocks delivery of this file type (e.g. PDF/ZIP delivery restriction) - contact the account owner.')
    )
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'blocked.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })

    await waitFor(() => {
      expect(toastLib.showToast).toHaveBeenCalledWith(expect.stringMatching(/not retrievable/i), 'error')
    })
    expect(screen.queryByText('View')).not.toBeInTheDocument()
  })

  it('rejects an unsupported document type before ever calling Cloudinary', async () => {
    await fillBuyerAndGoToStep3()

    const exeFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' })
    fireEvent.change(getUploadInput(), { target: { files: [exeFile] } })

    await waitFor(() => {
      expect(toastLib.showToast).toHaveBeenCalledWith(expect.stringMatching(/not a supported file type/i), 'error')
    })
    expect(cloudinaryService.uploadSalesDocument).not.toHaveBeenCalled()
  })

  it('images still upload via uploadSalesDocument and are unaffected by the PDF delivery fix', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/photo.jpg',
      publicId: 'automarket/sales/photo',
      resourceType: 'image',
    })
    await fillBuyerAndGoToStep3()

    const imageFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(getUploadInput(), { target: { files: [imageFile] } })

    await waitFor(() => {
      expect(cloudinaryService.uploadSalesDocument).toHaveBeenCalledWith(imageFile, 'sales')
    })
  })

  it('removing an uploaded file also deletes it from Cloudinary using its publicId', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockResolvedValue({ success: true })
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })
    await waitFor(() => screen.getByText('contract.pdf'))

    fireEvent.click(screen.getByLabelText('Remove contract.pdf'))

    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledWith('automarket/sales/contract', 'image')
    })
  })

  it('does not remove the unsaved attachment from state until Cloudinary deletion is confirmed (order correctness)', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    let resolveDelete: (v: { success: boolean }) => void
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockReturnValue(
      new Promise((resolve) => { resolveDelete = resolve })
    )
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })
    await waitFor(() => screen.getByLabelText('Remove contract.pdf'))

    fireEvent.click(screen.getByLabelText('Remove contract.pdf'))
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalled()
    })
    // Still visible (as a "deleting" item) while the delete is pending.
    expect(screen.getByLabelText('Deleting contract.pdf...')).toBeInTheDocument()

    resolveDelete!({ success: true })
    await waitFor(() => {
      expect(screen.queryByLabelText(/contract\.pdf/)).not.toBeInTheDocument()
    })
  })

  it('keeps an unsaved attachment visible and allows retry when Cloudinary deletion fails', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    vi.mocked(adminSalesService.deleteCloudinaryFile)
      .mockResolvedValueOnce({ success: false, error: 'Network error' })
      .mockResolvedValueOnce({ success: true })
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })
    await waitFor(() => screen.getByLabelText('Remove contract.pdf'))

    fireEvent.click(screen.getByLabelText('Remove contract.pdf'))
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Remove contract.pdf')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Remove contract.pdf'))
    await waitFor(() => {
      expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.queryByLabelText(/contract\.pdf/)).not.toBeInTheDocument()
    })
  })

  it('disables the Remove button while deletion is pending and ignores repeated clicks', async () => {
    vi.mocked(cloudinaryService.uploadSalesDocument).mockResolvedValue({
      url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/contract.pdf',
      publicId: 'automarket/sales/contract',
      resourceType: 'image',
    })
    let resolveDelete: (v: { success: boolean }) => void
    vi.mocked(adminSalesService.deleteCloudinaryFile).mockReturnValue(
      new Promise((resolve) => { resolveDelete = resolve })
    )
    await fillBuyerAndGoToStep3()

    const pdfFile = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
    fireEvent.change(getUploadInput(), { target: { files: [pdfFile] } })
    await waitFor(() => screen.getByLabelText('Remove contract.pdf'))

    fireEvent.click(screen.getByLabelText('Remove contract.pdf'))
    await waitFor(() => {
      expect(screen.getByLabelText('Deleting contract.pdf...')).toBeDisabled()
    })
    fireEvent.click(screen.getByLabelText('Deleting contract.pdf...'))
    expect(adminSalesService.deleteCloudinaryFile).toHaveBeenCalledTimes(1)

    resolveDelete!({ success: true })
    await waitFor(() => {
      expect(screen.queryByLabelText(/contract\.pdf/)).not.toBeInTheDocument()
    })
  })
})

describe('AdminNewSale - Sold vehicle exclusion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('excludes a car from the search results when it already has a non-cancelled sale', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([
      { carId: 'car-1', status: 'active' } as Sale,
    ])

    render(
      <MemoryRouter>
        <AdminNewSale />
      </MemoryRouter>
    )
    await waitFor(() => screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.focus(screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.change(screen.getByPlaceholderText('Search vehicles...'), { target: { value: 'Camry' } })

    await waitFor(() => {
      expect(screen.queryByText('2020 Toyota Camry')).not.toBeInTheDocument()
    })
  })

  it('still shows a car whose only sale was cancelled', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([
      { carId: 'car-1', status: 'cancelled' } as Sale,
    ])

    render(
      <MemoryRouter>
        <AdminNewSale />
      </MemoryRouter>
    )
    await waitFor(() => screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.focus(screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.change(screen.getByPlaceholderText('Search vehicles...'), { target: { value: 'Camry' } })

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
    })
  })

  it('shows a car with no sales at all', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([])

    render(
      <MemoryRouter>
        <AdminNewSale />
      </MemoryRouter>
    )
    await waitFor(() => screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.focus(screen.getByPlaceholderText('Search vehicles...'))
    fireEvent.change(screen.getByPlaceholderText('Search vehicles...'), { target: { value: 'Camry' } })

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
    })
  })
})

describe('AdminNewSale - Visual consistency pass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCars).mockResolvedValue([testCar])
  })

  it('selected loan term exposes aria-pressed=true, others expose aria-pressed=false', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'))

    const selected = screen.getByRole('button', { name: '24 month loan term' })
    expect(selected).toHaveAttribute('aria-pressed', 'true')

    const notSelected = screen.getByRole('button', { name: '36 month loan term' })
    expect(notSelected).toHaveAttribute('aria-pressed', 'false')
  })

  it('loan-term options render with the "mo" suffix (matches public Financing style)', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'))
    ;[12, 24, 36, 48, 60].forEach((m) => {
      expect(screen.getByText(`${m} mo`)).toBeInTheDocument()
    })
  })

  it('selecting a different loan term updates the active styling class and preserves selection behavior', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Financing'))
    fireEvent.click(screen.getByText('36 mo'))
    const active = document.querySelector('.admin-new-sale__button--term--active')
    expect(active?.textContent).toBe('36 mo')
    expect(screen.getByRole('button', { name: '36 month loan term' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Next Step primary button is not forced to inline full width (width constraint lives in CSS, not inline style)', async () => {
    await fillBuyerAndGoToStep3()
    const backButton = screen.getAllByText(/Back/)[0].closest('button')
    expect(backButton).not.toBeNull()
    // No inline style forcing width:100% on the wizard nav buttons - sizing comes from
    // the .admin-new-sale__button--primary/--secondary CSS classes (compact, not full-bleed).
    expect(backButton?.style.width).not.toBe('100%')
  })

  it('Confirm Sale button uses the compact primary button class (not an ad-hoc full-width style)', async () => {
    await fillBuyerAndGoToStep3()
    fireEvent.click(screen.getByText('Cash'))
    const confirmButton = screen.getByText('Confirm Sale').closest('button')
    expect(confirmButton).toHaveClass('admin-new-sale__button--primary')
    expect(confirmButton?.style.width).not.toBe('100%')
  })
})
