import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FinancingApplicationForm from './FinancingApplicationForm'
import type { FinancingForm } from '../../types'

const mockForm: FinancingForm = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@example.com',
  phone: '+64 21 123 4567',
  licenseNumber: 'AB12345',
  income: '5000',
  downPayment: 20,
  months: 36,
  employer: 'Tech Corp',
  jobTitle: 'Developer',
  employmentType: 'fulltime',
  yearsEmployed: 5,
  monthlyExpenses: '2500',
  documents: [],
  creditHistoryConsent: false,
}

describe('FinancingApplicationForm', () => {
  describe('Rendering', () => {
    it('renders form header', () => {
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByText('Complete Your Application')).toBeInTheDocument()
      expect(screen.getByText(/All starred fields are required/)).toBeInTheDocument()
    })

    it('renders all required sections', () => {
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByText('Employment Details')).toBeInTheDocument()
      expect(screen.getByText('Monthly Expenses (NZD)')).toBeInTheDocument()
      expect(screen.getByText('Supporting Documents')).toBeInTheDocument()
      expect(screen.getByText(/I consent to a credit history check/)).toBeInTheDocument()
    })
  })

  describe('Field Rendering', () => {
    it('displays all personal detail fields with values', () => {
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+64 21 123 4567')).toBeInTheDocument()
      expect(screen.getByDisplayValue('AB12345')).toBeInTheDocument()
    })

    it('displays employment fields with values', () => {
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Developer')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })

    it('displays financial fields with values', () => {
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2500')).toBeInTheDocument()
    })

    it('displays credit consent checkbox', () => {
      render(
        <FinancingApplicationForm
          form={{...mockForm, creditHistoryConsent: true}}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })
  })

  describe('Error Display', () => {
    it('displays field errors', () => {
      const errors = {
        firstName: 'Required',
        email: 'Invalid email',
      }
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={errors}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByText('Required')).toBeInTheDocument()
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })

    it('displays credit consent error', () => {
      const errors = {
        creditHistoryConsent: 'You must consent to a credit check',
      }
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={errors}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByText('You must consent to a credit check')).toBeInTheDocument()
    })
  })

  describe('Callbacks', () => {
    it('calls onFieldChange when field value changes', () => {
      const onFieldChange = vi.fn()
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={onFieldChange}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      const firstNameInput = screen.getByDisplayValue('John') as HTMLInputElement
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } })
      expect(onFieldChange).toHaveBeenCalledWith('firstName', 'Jane')
    })

    it('calls onBack when Back button is clicked', () => {
      const onBack = vi.fn()
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={onBack}
          onSubmit={vi.fn()}
        />
      )
      const backButton = screen.getByText('← Back')
      fireEvent.click(backButton)
      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('calls onSubmit when Submit button is clicked', () => {
      const onSubmit = vi.fn()
      const { container } = render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={onSubmit}
        />
      )
      const form = container.querySelector('form')
      fireEvent.submit(form!)
      expect(onSubmit).toHaveBeenCalledOnce()
    })

    it('calls onFilesSelected when files are selected', () => {
      const onFilesSelected = vi.fn()
      render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={onFilesSelected}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      const fileInput = screen.getByLabelText(/Drop files here or click to browse/) as HTMLInputElement
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(fileInput, { target: { files: [file] } })
      expect(onFilesSelected).toHaveBeenCalled()
    })

    it('displays credit consent checkbox with correct initial state', () => {
      render(
        <FinancingApplicationForm
          form={{...mockForm, creditHistoryConsent: true}}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })
  })

  describe('Form Structure', () => {
    it('renders a form element', () => {
      const onSubmit = vi.fn()
      const { container } = render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={onSubmit}
        />
      )
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      fireEvent.submit(form!)
      expect(onSubmit).toHaveBeenCalled()
    })

    it('has correct button types', () => {
      const { container } = render(
        <FinancingApplicationForm
          form={mockForm}
          errors={{}}
          uploadingFiles={new Map()}
          onFieldChange={vi.fn()}
          onFilesSelected={vi.fn()}
          onDocumentTypeChange={vi.fn()}
          onRemoveDocument={vi.fn()}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
        />
      )
      const buttons = container.querySelectorAll('button')
      expect(buttons[0]).toHaveAttribute('type', 'button')
      expect(buttons[buttons.length - 1]).toHaveAttribute('type', 'submit')
    })
  })
})
