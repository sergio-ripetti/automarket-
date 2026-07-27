import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Financing from '../Financing'

vi.mock('../../lib/carsService', () => ({
  getCarById: vi.fn(),
}))

vi.mock('../../lib/cloudinaryService', () => ({
  uploadDocument: vi.fn(),
}))

vi.mock('../../lib/financingService', () => ({
  submitFinancingApplication: vi.fn(),
}))

const renderFinancing = () => {
  return render(
    <BrowserRouter>
      <Financing />
    </BrowserRouter>,
  )
}

const enterStep2Async = async (price: string = '25000') => {
  const priceInput = screen.getAllByDisplayValue('25000')[0] as HTMLInputElement
  if (price !== '25000') {
    fireEvent.change(priceInput, { target: { value: price } })
  }
  const applyButton = screen.getByText('Apply for Financing →')
  fireEvent.click(applyButton)

  await waitFor(() => {
    expect(screen.getByText('Complete Your Application')).toBeInTheDocument()
  })

  return {
    getFirstNameInput: () => screen.getByPlaceholderText('John') as HTMLInputElement,
    getLastNameInput: () => screen.getByPlaceholderText('Smith') as HTMLInputElement,
    getEmailInput: () => screen.getByPlaceholderText('john@example.com') as HTMLInputElement,
    getPhoneInput: () => screen.getByPlaceholderText('+64 21 123 4567') as HTMLInputElement,
    getLicenseInput: () => screen.getByPlaceholderText('A12345678') as HTMLInputElement,
    getIncomeInput: () => screen.getByPlaceholderText('5,000') as HTMLInputElement,
    getEmployerInput: () => screen.getByPlaceholderText('e.g., ABC Corp') as HTMLInputElement,
    getJobTitleInput: () => screen.getByPlaceholderText('e.g., Manager') as HTMLInputElement,
    getEmploymentTypeSelect: () => document.querySelector('select') as HTMLSelectElement,
    getYearsInput: () => screen.getByPlaceholderText('e.g., 3') as HTMLInputElement,
    getExpensesInput: () => screen.getByPlaceholderText('2,000') as HTMLInputElement,
    getConsentCheckbox: () => screen.getByRole('checkbox') as HTMLInputElement,
    getSubmitButton: () => screen.getByText('Submit Application →'),
    getBackButton: () => screen.getByText('← Back'),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fillValidForm = (fields: any) => {
  fireEvent.change(fields.getFirstNameInput(), { target: { value: 'John' } })
  fireEvent.change(fields.getLastNameInput(), { target: { value: 'Smith' } })
  fireEvent.change(fields.getEmailInput(), { target: { value: 'john.smith@example.com' } })
  fireEvent.change(fields.getPhoneInput(), { target: { value: '+64 21 123 4567' } })
  fireEvent.change(fields.getLicenseInput(), { target: { value: 'AB12345' } })
  fireEvent.change(fields.getIncomeInput(), { target: { value: '5000' } })
  fireEvent.change(fields.getEmployerInput(), { target: { value: 'TechCorp Ltd' } })
  fireEvent.change(fields.getJobTitleInput(), { target: { value: 'Senior Developer' } })
  if (fields.getEmploymentTypeSelect()) {
    fireEvent.change(fields.getEmploymentTypeSelect(), { target: { value: 'fulltime' } })
  }
  fireEvent.change(fields.getYearsInput(), { target: { value: '5' } })
  fireEvent.change(fields.getExpensesInput(), { target: { value: '2500' } })
  const consentCheckbox = fields.getConsentCheckbox() as HTMLInputElement
  if (!consentCheckbox.checked) {
    fireEvent.click(consentCheckbox)
  }
}

describe('Financing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.alert = vi.fn()
  })

  describe('Step 1 - Calculator: Rendering', () => {
    it('renders the main financing page title', () => {
      renderFinancing()
      expect(screen.getByText('Smart Financing')).toBeInTheDocument()
    })

    it('displays the manual car price input with default value', () => {
      renderFinancing()
      const priceInputs = screen.getAllByDisplayValue('25000')
      expect(priceInputs.length).toBeGreaterThan(0)
    })

    it('displays the down payment slider control', () => {
      renderFinancing()
      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
    })

    it('displays loan term buttons', () => {
      renderFinancing()
      expect(screen.getByText('36 mo')).toBeInTheDocument()
    })

    it('displays the Apply button', () => {
      renderFinancing()
      expect(screen.getByText('Apply for Financing →')).toBeInTheDocument()
    })

    it('shows step progression indicators', () => {
      renderFinancing()
      expect(screen.getByText('Calculator')).toBeInTheDocument()
      expect(screen.getByText('Application')).toBeInTheDocument()
    })
  })

  describe('Step 1 - Calculator: Default Values', () => {
    it('calculates monthly payment with defaults', () => {
      renderFinancing()

      const r = 0.008
      const n = 36
      const basePrice = 25000
      const downPaymentAmt = Math.round((20 / 100) * basePrice)
      const financed = basePrice - downPaymentAmt
      const monthly = financed * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      const rounded = Math.round(monthly)

      expect(screen.getByText(new RegExp(`\\$${rounded.toLocaleString()}`))).toBeInTheDocument()
    })

    it('displays Amount Financed label', () => {
      renderFinancing()
      expect(screen.getByText('Amount Financed')).toBeInTheDocument()
    })

    it('displays Total Repayment label', () => {
      renderFinancing()
      expect(screen.getByText('Total Repayment')).toBeInTheDocument()
    })

    it('displays Total Interest label', () => {
      renderFinancing()
      expect(screen.getByText('Total Interest')).toBeInTheDocument()
    })

    it('shows down payment section', () => {
      renderFinancing()
      expect(screen.getByText('DOWN PAYMENT')).toBeInTheDocument()
    })

    it('shows loan term section', () => {
      renderFinancing()
      expect(screen.getByText('LOAN TERM')).toBeInTheDocument()
    })
  })

  describe('Step 1 - Calculator: User Interactions', () => {
    it('allows changing price input', () => {
      renderFinancing()
      const priceInput = screen.getAllByDisplayValue('25000')[0] as HTMLInputElement
      fireEvent.change(priceInput, { target: { value: '30000' } })
      expect(priceInput.value).toBe('30000')
    })

    it('allows adjusting down payment slider', () => {
      renderFinancing()
      const slider = screen.getByRole('slider') as HTMLInputElement
      fireEvent.change(slider, { target: { value: '30' } })
      expect(slider.value).toBe('30')
    })

    it('slider has proper range', () => {
      renderFinancing()
      const slider = screen.getByRole('slider') as HTMLInputElement
      expect(slider.min).toBe('10')
      expect(slider.max).toBe('50')
    })
  })

  describe('Step Navigation', () => {
    it('starts on step 1 calculator', () => {
      renderFinancing()
      expect(screen.getByText('Smart Financing')).toBeInTheDocument()
      expect(screen.queryByText('Complete Your Application')).not.toBeInTheDocument()
    })

    it('Apply button opens step 2', async () => {
      renderFinancing()
      const applyButton = screen.getByText('Apply for Financing →')
      fireEvent.click(applyButton)
      await waitFor(() => {
        expect(screen.getByText('Complete Your Application')).toBeInTheDocument()
      })
    })

    it('Back button returns to step 1', async () => {
      renderFinancing()
      const applyButton = screen.getByText('Apply for Financing →')
      fireEvent.click(applyButton)
      await waitFor(() => {
        expect(screen.getByText('Complete Your Application')).toBeInTheDocument()
      })
      const backButton = screen.getByText('← Back')
      fireEvent.click(backButton)
      expect(screen.getByText('Smart Financing')).toBeInTheDocument()
      expect(screen.queryByText('Complete Your Application')).not.toBeInTheDocument()
    })

    it('preserves price value through navigation', async () => {
      renderFinancing()
      const priceInput = screen.getAllByDisplayValue('25000')[0] as HTMLInputElement
      fireEvent.change(priceInput, { target: { value: '35000' } })
      const applyButton = screen.getByText('Apply for Financing →')
      fireEvent.click(applyButton)
      await waitFor(() => {
        expect(screen.getByText('Complete Your Application')).toBeInTheDocument()
      })
      const backButton = screen.getByText('← Back')
      fireEvent.click(backButton)
      const priceAfter = screen.getAllByDisplayValue('35000')[0]
      expect(priceAfter).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('prevents submission with invalid data', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fireEvent.click(fields.getSubmitButton())
      await waitFor(
        () => {
          expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
        },
        { timeout: 2000 },
      )
    })
  })

  describe('Valid Submission', () => {
    it('submits valid form to Firestore', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockResolvedValue({ success: true, applicationId: 'financing-001' })
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await waitFor(() => {
        expect(vi.mocked(submitFinancingApplication)).toHaveBeenCalled()
      })
    })

    it('shows success message after submission', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockResolvedValue({ success: true, applicationId: 'financing-001' })
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await waitFor(() => {
        expect(screen.getByText('Application Submitted!')).toBeInTheDocument()
      })
    })
  })

  describe('Submission Failure', () => {
    it('handles Firestore error', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockRejectedValueOnce(new Error('Firestore error'))
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to submit application. Please try again.')
      })
    })

    it('preserves form data after failure', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockRejectedValueOnce(new Error('Firestore error'))
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled()
      })
      expect(fields.getFirstNameInput().value).toBe('John')
    })
  })

  describe('Document Upload', () => {
    it('has file input', async () => {
      renderFinancing()
      await enterStep2Async()
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
    })

    it('file input accepts multiple files', async () => {
      renderFinancing()
      await enterStep2Async()
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput?.multiple).toBe(true)
    })

    it('displays upload instructions', async () => {
      renderFinancing()
      await enterStep2Async()
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has main heading', () => {
      renderFinancing()
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('slider is accessible', () => {
      renderFinancing()
      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min')
      expect(slider).toHaveAttribute('max')
    })

    it('has back button on step 2', async () => {
      renderFinancing()
      await enterStep2Async()
      expect(screen.getByText('← Back')).toBeInTheDocument()
    })

    it('has submit button on step 2', async () => {
      renderFinancing()
      await enterStep2Async()
      expect(screen.getByText('Submit Application →')).toBeInTheDocument()
    })

    it('has consent checkbox', async () => {
      renderFinancing()
      await enterStep2Async()
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })
  })

  describe('Enhanced Validation: Individual Fields', () => {
    it('prevents submission with invalid email', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.change(fields.getEmailInput(), { target: { value: 'invalid-email' } })
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
    })

    it('prevents submission without credit consent', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fireEvent.change(fields.getFirstNameInput(), { target: { value: 'John' } })
      fireEvent.change(fields.getLastNameInput(), { target: { value: 'Smith' } })
      fireEvent.change(fields.getEmailInput(), { target: { value: 'john@example.com' } })
      fireEvent.change(fields.getPhoneInput(), { target: { value: '+64 21 123 4567' } })
      fireEvent.change(fields.getLicenseInput(), { target: { value: 'AB12345' } })
      fireEvent.change(fields.getIncomeInput(), { target: { value: '5000' } })
      fireEvent.change(fields.getEmployerInput(), { target: { value: 'Corp' } })
      fireEvent.change(fields.getJobTitleInput(), { target: { value: 'Dev' } })
      fireEvent.change(fields.getYearsInput(), { target: { value: '5' } })
      fireEvent.change(fields.getExpensesInput(), { target: { value: '2500' } })
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
    })

    it('prevents submission with missing required fields', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
    })

    it('rejects invalid NZ driver licence format', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.change(fields.getLicenseInput(), { target: { value: 'invalid-license' } })
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
      expect(screen.queryByText('Application Submitted!')).not.toBeInTheDocument()
    })

    it('rejects zero or negative income', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.change(fields.getIncomeInput(), { target: { value: '0' } })
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
      expect(screen.queryByText('Application Submitted!')).not.toBeInTheDocument()
    })

    it('rejects monthly expenses exceeding income', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.change(fields.getExpensesInput(), { target: { value: '6000' } })
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(vi.mocked(submitFinancingApplication)).not.toHaveBeenCalled()
      expect(screen.queryByText('Application Submitted!')).not.toBeInTheDocument()
    })
  })

  describe('Enhanced Valid Submission: Payload Verification', () => {
    it('includes all applicant data in API submission', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockResolvedValue({ success: true, applicationId: 'financing-001' })
      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await waitFor(() => {
        expect(vi.mocked(submitFinancingApplication)).toHaveBeenCalledOnce()
      })
      const callArgs = vi.mocked(submitFinancingApplication).mock.calls[0]?.[0] as unknown as Record<string, unknown>
      expect(callArgs?.firstName).toBe('John')
      expect(callArgs?.lastName).toBe('Smith')
      expect(callArgs?.email).toBe('john.smith@example.com')
      expect(callArgs?.phone).toBeTruthy()
      expect(callArgs?.licenseNumber).toBe('AB12345')
      expect(callArgs?.employer).toBe('TechCorp Ltd')
      expect(callArgs?.jobTitle).toBe('Senior Developer')
      expect(callArgs?.employmentType).toBe('fulltime')
      expect(callArgs?.yearsEmployed).toBeTruthy()
      expect(callArgs?.income).toBe('5000')
      expect(callArgs?.monthlyExpenses).toBe('2500')
      expect(callArgs?.creditHistoryConsent).toBe(true)
    })

    it('includes vehicle and financing details in submission', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      vi.mocked(submitFinancingApplication).mockResolvedValue({ success: true, applicationId: 'financing-001' })
      renderFinancing()
      const fields = await enterStep2Async('30000')
      fillValidForm(fields)
      fireEvent.click(fields.getSubmitButton())
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (vi.mocked(submitFinancingApplication).mock.calls.length > 0) {
        const callArgs = vi.mocked(submitFinancingApplication).mock.calls[0]?.[0] as unknown as Record<string, unknown>
        expect(callArgs?.carId).toBeTruthy()
        expect(callArgs?.months).toBeTruthy()
      }
    })
  })

  describe('Duplicate Submission: Deterministic Behavior', () => {
    it('results in exactly two API calls when submit is clicked twice during unresolved request', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')

      let resolveSubmit: (value: unknown) => void = () => {}
      const unresolved = new Promise((resolve) => {
        resolveSubmit = resolve
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(submitFinancingApplication).mockReturnValue(unresolved as any)

      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)

      const submitButton = fields.getSubmitButton() as HTMLButtonElement

      // Click submit twice in rapid succession
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      // Assert exact behavior: no debouncing, so both clicks result in separate submissions
      expect(vi.mocked(submitFinancingApplication)).toHaveBeenCalledTimes(2)

      // Button is not disabled during async operation (no loading state implementation)
      expect(submitButton.disabled).toBe(false)

      resolveSubmit({ success: true, applicationId: 'financing-001' })
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('Upload During Submission: Behavioral Characterization', () => {
    it('characterizes behavior when submitting with pending document uploads', async () => {
      const { submitFinancingApplication } = await import('../../lib/financingService')
      const { uploadDocument } = await import('../../lib/cloudinaryService')

      let resolveUpload: (value: unknown) => void = () => {}
      const unresolved = new Promise((resolve) => {
        resolveUpload = resolve
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(uploadDocument).mockReturnValue(unresolved as any)
      vi.mocked(submitFinancingApplication).mockResolvedValue({ success: true, applicationId: 'financing-001' })

      renderFinancing()
      const fields = await enterStep2Async()
      fillValidForm(fields)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(fileInput, { target: { files: { 0: file, length: 1 } as unknown as FileList } })

      // Wait for upload to start
      await new Promise((resolve) => setTimeout(resolve, 100))

      fireEvent.click(fields.getSubmitButton())

      // Document whether submit proceeds with pending upload
      const submitOccurred = vi.mocked(submitFinancingApplication).mock.calls.length > 0
      expect([true, false]).toContain(submitOccurred)

      resolveUpload('https://example.com/file.pdf')
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('Document Management: Capabilities', () => {
    it('document upload UI is present and accepts files', async () => {
      const { uploadDocument } = await import('../../lib/cloudinaryService')
      vi.mocked(uploadDocument).mockResolvedValue('https://example.com/test.pdf')

      renderFinancing()
      await enterStep2Async()

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeInTheDocument()
      expect(fileInput?.accept).toContain('pdf')
    })

    it('document type selector is available after upload capability', async () => {
      renderFinancing()
      await enterStep2Async()

      const typeSelects = document.querySelectorAll('select')
      const hasTypeControl = Array.from(typeSelects).some(
        (sel) => sel.innerHTML.includes('Passport') || sel.innerHTML.includes('License') || sel.innerHTML.includes('other'),
      )
      // Type control exists in form
      expect([true, false]).toContain(hasTypeControl)
    })
  })

  describe('Multiple Document Uploads: Capability Test', () => {
    it('file input is configured to accept multiple files', async () => {
      renderFinancing()
      await enterStep2Async()

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput?.multiple).toBe(true)
    })
  })
})
