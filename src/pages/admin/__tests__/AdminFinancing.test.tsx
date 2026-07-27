import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { FinancingRequest } from '../../../lib/financingService'
import * as adminFinancingService from '../../../lib/adminFinancingService'
import AdminFinancing from '../AdminFinancing'

vi.mock('../../../lib/adminFinancingService')
vi.mock('../../../components/admin/AdminToast', () => ({
  default: () => null,
}))

const createRequest = (overrides?: Partial<FinancingRequest>): FinancingRequest => ({
  id: 'fin-123',
  carId: 'car-1',
  carTitle: '2020 Toyota Camry',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  licenseNumber: 'LS123456',
  monthlyIncome: 5000,
  downPayment: 3000,
  loanTerm: 60,
  monthlyPayment: 400,
  totalAmount: 22000,
  totalInterest: 2000,
  status: 'pending',
  createdAt: { toDate: () => new Date('2025-01-01') } as unknown as FinancingRequest['createdAt'],
  ...overrides,
})

describe('AdminFinancing - Backend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('loads applications through getFinancingApplications', async () => {
    const requests = [createRequest()]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
      success: true,
      applications: requests,
    })

    render(<AdminFinancing />)

    await waitFor(() => {
      expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('shows a distinct server-error state (not the "no applications" empty state) when load fails', async () => {
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
      success: false,
      error: 'Failed to fetch',
      status: 500,
    })

    render(<AdminFinancing />)

    await waitFor(() => {
      expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
    })

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    expect(screen.getByText(/Failed to load financing requests/)).toBeInTheDocument()
    expect(screen.queryByText(/No financing requests/)).not.toBeInTheDocument()
  })

  describe('Authorization (403/401)', () => {
    it('renders one stable "You do not have administrator access." state on 403', async () => {
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: false,
        error: 'Forbidden - User is not authorized as admin',
        status: 403,
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('You do not have administrator access.')).toBeInTheDocument()
      })
      // Must not be conflated with the "no records" empty state
      expect(screen.queryByText(/No financing requests/)).not.toBeInTheDocument()
    })

    it('does not repeatedly call getFinancingApplications after a persistent 403 (no infinite loop)', async () => {
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: false,
        error: 'Forbidden - User is not authorized as admin',
        status: 403,
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('You do not have administrator access.')).toBeInTheDocument()
      })

      // Give any runaway effect loop a chance to fire extra requests
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
    })

    it('does not repeatedly trigger the error toast for a persistent 403 (one toast, not hundreds)', async () => {
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: false,
        error: 'Forbidden - User is not authorized as admin',
        status: 403,
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('You do not have administrator access.')).toBeInTheDocument()
      })

      await new Promise((resolve) => setTimeout(resolve, 300))

      // Only the single initial fetch should have happened - confirms no re-render/re-fetch loop
      expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
    })

    it('treats a 401 the same as 403 (authorization state, not a generic error)', async () => {
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401,
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('You do not have administrator access.')).toBeInTheDocument()
      })
    })
  })

  describe('Status Update', () => {
    it('calls updateFinancingStatus exactly once with correct id and status when Approve clicked', async () => {
      const requests = [createRequest({ status: 'pending' })]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.updateFinancingStatus).mockResolvedValue({ success: true })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getAllByText('Approve').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Approve')[0])

      await waitFor(() => {
        expect(adminFinancingService.updateFinancingStatus).toHaveBeenCalledTimes(1)
        expect(adminFinancingService.updateFinancingStatus).toHaveBeenCalledWith('fin-123', 'approved')
      })
    })

    it('updates displayed status after successful update', async () => {
      const requests = [createRequest({ status: 'pending' })]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.updateFinancingStatus).mockResolvedValue({ success: true })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getAllByText('Approve').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Approve')[0])

      await waitFor(() => {
        expect(document.querySelector('.financing-status-approved')).toBeInTheDocument()
      })
    })

    it('preserves existing status when backend update fails', async () => {
      const requests = [createRequest({ status: 'pending' })]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.updateFinancingStatus).mockResolvedValue({
        success: false,
        error: 'Update failed',
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getAllByText('Approve').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Approve')[0])

      await waitFor(() => {
        expect(adminFinancingService.updateFinancingStatus).toHaveBeenCalledTimes(1)
      })

      // Status badge should still show Pending, not Approved
      expect(document.querySelector('.financing-status-pending')).toBeInTheDocument()
      expect(document.querySelector('.financing-status-approved')).not.toBeInTheDocument()
    })
  })

  describe('Delete', () => {
    it('calls deleteFinancingApplication exactly once with correct id when Delete confirmed', async () => {
      const requests = [createRequest()]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.deleteFinancingApplication).mockResolvedValue({ success: true })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Delete')[0])

      await waitFor(() => {
        expect(adminFinancingService.deleteFinancingApplication).toHaveBeenCalledTimes(1)
        expect(adminFinancingService.deleteFinancingApplication).toHaveBeenCalledWith('fin-123')
      })
    })

    it('removes item from list after successful delete', async () => {
      const requests = [createRequest()]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.deleteFinancingApplication).mockResolvedValue({ success: true })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByText('Delete')[0])

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      })
    })

    it('preserves item in list when backend delete fails', async () => {
      const requests = [createRequest()]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })
      vi.mocked(adminFinancingService.deleteFinancingApplication).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByText('Delete')[0])

      await waitFor(() => {
        expect(adminFinancingService.deleteFinancingApplication).toHaveBeenCalledTimes(1)
      })

      // Item must still be present since delete failed
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('does not call deleteFinancingApplication when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const requests = [createRequest()]
      vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({
        success: true,
        applications: requests,
      })

      render(<AdminFinancing />)

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Delete')[0])

      expect(adminFinancingService.deleteFinancingApplication).not.toHaveBeenCalled()
    })
  })
})

describe('AdminFinancing - Chronological ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders applications newest first regardless of the order the backend returned them in', async () => {
    const requests = [
      createRequest({ id: 'old', firstName: 'Old', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as FinancingRequest['createdAt'] }),
      createRequest({ id: 'newest', firstName: 'Newest', createdAt: { toDate: () => new Date('2025-06-01') } as unknown as FinancingRequest['createdAt'] }),
      createRequest({ id: 'mid', firstName: 'Mid', createdAt: { toDate: () => new Date('2025-03-01') } as unknown as FinancingRequest['createdAt'] }),
    ]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })

    render(<AdminFinancing />)

    await waitFor(() => {
      expect(screen.getByText('Newest Doe')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/Doe$/).map((el) => el.textContent)
    expect(names).toEqual(['Newest Doe', 'Mid Doe', 'Old Doe'])
  })

  it('preserves newest-first order after switching to a status filter', async () => {
    const requests = [
      createRequest({ id: 'old', firstName: 'Old', status: 'pending', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as FinancingRequest['createdAt'] }),
      createRequest({ id: 'newest', firstName: 'Newest', status: 'pending', createdAt: { toDate: () => new Date('2025-06-01') } as unknown as FinancingRequest['createdAt'] }),
    ]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })

    render(<AdminFinancing />)

    await waitFor(() => {
      expect(screen.getByText('Newest Doe')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('admin-financing-tab-pending')!)

    const names = screen.getAllByText(/Doe$/).map((el) => el.textContent)
    expect(names).toEqual(['Newest Doe', 'Old Doe'])
  })

  it('places records with missing or invalid createdAt last, after all valid ones', async () => {
    const requests = [
      createRequest({ id: 'corrupt', firstName: 'Corrupt', createdAt: { _methodName: 'serverTimestamp' } as unknown as FinancingRequest['createdAt'] }),
      createRequest({ id: 'valid', firstName: 'Valid', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as FinancingRequest['createdAt'] }),
    ]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })

    render(<AdminFinancing />)

    await waitFor(() => {
      expect(screen.getByText('Valid Doe')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/Doe$/).map((el) => el.textContent)
    expect(names).toEqual(['Valid Doe', 'Corrupt Doe'])
  })
})

describe('AdminFinancing - Background polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates exactly one interval and refreshes the list at the configured tick, with the newest item first', async () => {
    vi.useFakeTimers()
    const initial = [createRequest({ id: 'fin-123', firstName: 'John', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as FinancingRequest['createdAt'] })]
    const refreshed = [
      createRequest({ id: 'brand-new', firstName: 'BrandNew', createdAt: { toDate: () => new Date('2030-01-01') } as unknown as FinancingRequest['createdAt'] }),
      ...initial,
    ]
    vi.mocked(adminFinancingService.getFinancingApplications)
      .mockResolvedValueOnce({ success: true, applications: initial })
      .mockResolvedValueOnce({ success: true, applications: refreshed })

    render(<AdminFinancing />)
    await vi.waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument())
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(20000)
    await vi.waitFor(() => expect(screen.getByText('BrandNew Doe')).toBeInTheDocument())

    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(2)
    const names = screen.getAllByText(/Doe$/).map((el) => el.textContent)
    expect(names[0]).toBe('BrandNew Doe')
  })

  it('does not fire overlapping requests within a single tick', async () => {
    vi.useFakeTimers()
    const initial = [createRequest()]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: initial })

    render(<AdminFinancing />)
    await vi.advanceTimersByTimeAsync(0)

    // Advance well past several tick boundaries in one jump - if overlapping/duplicate
    // intervals existed, the call count would be much higher than the tick count implies
    await vi.advanceTimersByTimeAsync(60000)

    // 1 initial + 3 ticks at 20s each = 4
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(4)
  })

  it('clears the interval on unmount (no further requests fire after unmounting)', async () => {
    vi.useFakeTimers()
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: [createRequest()] })

    const { unmount } = render(<AdminFinancing />)
    await vi.advanceTimersByTimeAsync(0)
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)

    unmount()
    await vi.advanceTimersByTimeAsync(60000)

    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
  })

  it('stops polling after a 401 response', async () => {
    vi.useFakeTimers()
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: false, error: 'Unauthorized', status: 401 })

    render(<AdminFinancing />)
    await vi.advanceTimersByTimeAsync(0)
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60000)

    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
  })

  it('stops polling after a 403 response', async () => {
    vi.useFakeTimers()
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: false, error: 'Forbidden', status: 403 })

    render(<AdminFinancing />)
    await vi.advanceTimersByTimeAsync(0)
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60000)

    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(1)
  })

  it('a persistent server error does not create repeated toasts across multiple poll ticks', async () => {
    vi.useFakeTimers()
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: false, error: 'Server error', status: 500 })

    render(<AdminFinancing />)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(60000)

    // Polling continues on generic server errors (only 401/403 stop it), but the toast/error
    // path is guarded so it does not re-fire on every tick
    expect(adminFinancingService.getFinancingApplications).toHaveBeenCalledTimes(4)
  })

  it('a background refresh failure does not clear the already-rendered list', async () => {
    vi.useFakeTimers()
    const initial = [createRequest({ firstName: 'Persisted' })]
    vi.mocked(adminFinancingService.getFinancingApplications)
      .mockResolvedValueOnce({ success: true, applications: initial })
      .mockResolvedValueOnce({ success: false, error: 'Server error', status: 500 })

    render(<AdminFinancing />)
    await vi.waitFor(() => expect(screen.getByText('Persisted Doe')).toBeInTheDocument())

    await vi.advanceTimersByTimeAsync(20000)

    // The list from the successful initial load must still be visible after the failed poll
    expect(screen.getByText('Persisted Doe')).toBeInTheDocument()
  })
})

describe('AdminFinancing - Details modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderWithRequest(overrides?: Partial<FinancingRequest>) {
    const requests = [createRequest(overrides)]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })
    render(<AdminFinancing />)
    await waitFor(() => screen.getByText('View Details'))
    fireEvent.click(screen.getByText('View Details'))
    await waitFor(() => screen.getByRole('dialog'))
  }

  it('the summary card remains unchanged (still shows name, email, application id prefix, vehicle, loan amount, monthly payment, term, status)', async () => {
    const requests = [createRequest()]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })
    render(<AdminFinancing />)

    await waitFor(() => screen.getByText('John Doe'))
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('ID: FIN-123')).toBeInTheDocument()
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('$22,000')).toBeInTheDocument()
    expect(screen.getByText('$400')).toBeInTheDocument()
    expect(screen.getByText('60 months')).toBeInTheDocument()
    expect(document.querySelector('.financing-status-pending')).toBeInTheDocument()
  })

  it('View Details opens the modal as an accessible dialog', async () => {
    await renderWithRequest()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'admin-financing-modal-title')
  })

  it('renders all applicant fields', async () => {
    await renderWithRequest()
    expect(screen.getByText('Applicant Information')).toBeInTheDocument()
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    expect(screen.getAllByText('john@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('LS123456')).toBeInTheDocument()
  })

  it('renders all employment fields', async () => {
    await renderWithRequest({ employer: 'Acme Corp', jobTitle: 'Engineer', employmentType: 'fulltime', yearsEmployed: 3 })
    expect(screen.getByText('Employment Information')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('fulltime')).toBeInTheDocument()
    expect(screen.getByText('3 years')).toBeInTheDocument()
  })

  it('renders financial fields with NZD formatting (no raw numbers or scientific notation)', async () => {
    await renderWithRequest({ monthlyIncome: 5000, monthlyExpenses: 1200 })
    expect(screen.getByText('Financial Information')).toBeInTheDocument()
    expect(screen.getByText('$5,000')).toBeInTheDocument()
    expect(screen.getByText('$1,200')).toBeInTheDocument()
  })

  it('renders vehicle and loan fields including derived vehicle price and total repayment', async () => {
    // totalAmount(financed)=22000, downPayment=3000 -> vehicle price = 25000
    // monthlyPayment=400, loanTerm=60, downPayment=3000 -> total repayment = 400*60+3000 = 27000
    await renderWithRequest()
    expect(screen.getByText('Vehicle and Financing Information')).toBeInTheDocument()
    expect(screen.getByText('$25,000')).toBeInTheDocument()
    expect(screen.getByText('$27,000')).toBeInTheDocument()
    expect(screen.getByText('$2,000')).toBeInTheDocument()
    expect(screen.getByText('$3,000')).toBeInTheDocument()
  })

  it('shows the application ID and submitted date', async () => {
    await renderWithRequest()
    expect(screen.getByText('fin-123')).toBeInTheDocument()
    expect(screen.getByText('Application ID')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders consent as Yes when accepted', async () => {
    await renderWithRequest({ creditHistoryConsent: true })
    expect(screen.getByText('Credit history consent: Yes')).toBeInTheDocument()
  })

  it('renders consent as No when not accepted or missing', async () => {
    await renderWithRequest({ creditHistoryConsent: false })
    expect(screen.getByText('Credit history consent: No')).toBeInTheDocument()
  })

  it('renders every uploaded document with a safe View link and a Download action', async () => {
    await renderWithRequest({
      documents: [
        { url: 'https://res.cloudinary.com/demo/doc1.pdf', type: 'payslip', filename: 'payslip.pdf' },
        { url: 'https://res.cloudinary.com/demo/doc2.pdf', type: 'bank_statement', filename: 'bank-statement.pdf' },
      ],
    })

    expect(screen.getByText('payslip.pdf')).toBeInTheDocument()
    expect(screen.getByText('bank-statement.pdf')).toBeInTheDocument()

    const viewLinks = screen.getAllByText('View')
    expect(viewLinks.length).toBe(2)
    viewLinks.forEach((link) => {
      expect(link.closest('a')).toHaveAttribute('target', '_blank')
      expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
    })

    const downloadLinks = screen.getAllByText('Download')
    expect(downloadLinks.length).toBe(2)
  })

  it('shows "No supporting documents provided" when there are no documents', async () => {
    await renderWithRequest({ documents: [] })
    expect(screen.getByText('No supporting documents provided')).toBeInTheDocument()
  })

  it('renders "Not provided" for legacy records missing employment/financial fields', async () => {
    await renderWithRequest({
      employer: undefined,
      jobTitle: undefined,
      employmentType: undefined,
      yearsEmployed: undefined,
      monthlyExpenses: undefined,
    })

    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0)
  })

  it('does not render NaN for an invalid/missing numeric field', async () => {
    await renderWithRequest({ monthlyExpenses: undefined })
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('does not crash for an invalid createdAt value', async () => {
    await renderWithRequest({ createdAt: 'not-a-real-timestamp' as unknown as FinancingRequest['createdAt'] })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the modal via the close button', async () => {
    await renderWithRequest()
    fireEvent.click(screen.getByLabelText('Close application details'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the modal with the Escape key', async () => {
    await renderWithRequest()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('the Print Application action calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderWithRequest()
    fireEvent.click(screen.getByText('Print Application'))
    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('existing status actions inside the modal still work', async () => {
    const requests = [createRequest({ status: 'pending' })]
    vi.mocked(adminFinancingService.getFinancingApplications).mockResolvedValue({ success: true, applications: requests })
    vi.mocked(adminFinancingService.updateFinancingStatus).mockResolvedValue({ success: true })

    render(<AdminFinancing />)
    await waitFor(() => screen.getByText('View Details'))
    fireEvent.click(screen.getByText('View Details'))
    await waitFor(() => screen.getByRole('dialog'))

    fireEvent.click(screen.getByRole('dialog').querySelector('.modal-btn-approve')!)

    await waitFor(() => {
      expect(adminFinancingService.updateFinancingStatus).toHaveBeenCalledWith('fin-123', 'approved')
    })
  })
})
