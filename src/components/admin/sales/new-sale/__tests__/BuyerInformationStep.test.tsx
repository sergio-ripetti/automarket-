import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BuyerInformationStep } from '../BuyerInformationStep'
import type { FormData } from '../../../../../types/saleForm'

const mockFormData: FormData = {
  carId: '1',vin: 'ABC123',plate: 'ABC123',isNZNew: true,originCountry: 'Japan',previousOwners: 0,
  hasMaintenanceHistory: false,buyerName: '',buyerIdNumber: '',buyerLicense: '',buyerEmail: '',buyerPhone: '',
  buyerAddress: '',saleDate: '2025-01-01',paymentType: 'cash',salePrice: 28000,downPayment: 0,loanTerm: 24,
  firstPaymentDate: '2025-02-01',notes: '',orcIncluded: false,driveAwayPrice: false,orcWof: 0,orcRegistration: 0,
  orcRegistrationMonths: 6,orcGrooming: 0,orcOwnershipTransfer: 0,orcMechanicalInspection: 0,orcOtherLabel: '',
  orcOtherAmount: 0,accessories: [],ffEstablishment: 0,ffPpsr: 0,ffMonthlyAccount: 0,ffDealerOrigination: 0,
  warrantyIncluded: false,warrantyMonths: 3,warrantyProvider: '',mechInsuranceIncluded: false,
  mechInsuranceMonths: 3,mechInsuranceProvider: '',uploadingFiles: new Map(),uploadedDocuments: [],
}

describe('BuyerInformationStep', () => {
  it('renders required buyer fields', () => {
    render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
    expect(screen.getByText('Buyer Information')).toBeInTheDocument()
  })

  it('calls field-change callback', () => {
    const onFormChange = vi.fn()
    render(<BuyerInformationStep form={mockFormData} onFormChange={onFormChange} canNext={false} onBack={() => {}} onNext={() => {}} />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'John Doe' } })
    expect(onFormChange).toHaveBeenCalled()
  })

  it('Back button calls callback', () => {
    const onBack = vi.fn()
    render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={onBack} onNext={() => {}} />)
    fireEvent.click(screen.getByText('Back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('Next button respects validation', () => {
    const { rerender } = render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
    expect(screen.getByText('Next Step')).toBeDisabled()
    rerender(<BuyerInformationStep form={{...mockFormData,buyerName:'John',buyerEmail:'j@ex.com',buyerIdNumber:'AB123456',buyerPhone:'021234567',buyerLicense:'DL123456',buyerAddress:'123 St'}} onFormChange={() => {}} canNext={true} onBack={() => {}} onNext={() => {}} />)
    expect(screen.getByText('Next Step')).not.toBeDisabled()
  })

  describe('field limits', () => {
    it('enforces maxLength on Full Name (80), Email (100), ID Number (20), Phone (20), Licence (20), Address (100)', () => {
      render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.getByLabelText(/Full Name/)).toHaveAttribute('maxLength', '80')
      expect(screen.getByLabelText(/Email/)).toHaveAttribute('maxLength', '100')
      expect(screen.getByLabelText(/ID Number/)).toHaveAttribute('maxLength', '20')
      expect(screen.getByLabelText(/Phone/)).toHaveAttribute('maxLength', '20')
      expect(screen.getByLabelText(/Driver License/)).toHaveAttribute('maxLength', '20')
      expect(screen.getByLabelText(/Address/)).toHaveAttribute('maxLength', '100')
    })

    it('allows spaces, hyphens and apostrophes in the name field (not stripped from display)', () => {
      const { rerender } = render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      rerender(<BuyerInformationStep form={{ ...mockFormData, buyerName: "Mary-Jane O'Brien" }} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.getByLabelText(/Full Name/)).toHaveValue("Mary-Jane O'Brien")
    })

    it('does not destructively trim internal content while typing (component does not call .trim() on every keystroke)', () => {
      let latestForm = mockFormData
      const onFormChange = (updater: (f: typeof mockFormData) => typeof mockFormData) => {
        latestForm = updater(latestForm)
      }
      render(<BuyerInformationStep form={mockFormData} onFormChange={onFormChange} canNext={false} onBack={() => {}} onNext={() => {}} />)
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: '  John Smith  ' } })
      // The onChange handler passes the value straight through - trimming happens only at
      // submit/validation (AdminNewSale.tsx's handleSubmit), never destructively per keystroke.
      expect(latestForm.buyerName).toBe('  John Smith  ')
    })
  })

  describe('phone sanitation', () => {
    it('strips letters from phone input, keeping digits and formatting characters', () => {
      let latestForm = mockFormData
      const onFormChange = (updater: (f: typeof mockFormData) => typeof mockFormData) => {
        latestForm = updater(latestForm)
      }
      render(<BuyerInformationStep form={mockFormData} onFormChange={onFormChange} canNext={false} onBack={() => {}} onNext={() => {}} />)
      fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: '+64abc21 123abc4567' } })
      expect(latestForm.buyerPhone).toBe('+6421 1234567')
    })

    it('uses type=tel for the phone field', () => {
      render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.getByLabelText(/Phone/)).toHaveAttribute('type', 'tel')
    })
  })

  describe('driver licence validation (reused from Financing)', () => {
    it('shows no error for an empty licence field', () => {
      render(<BuyerInformationStep form={mockFormData} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.queryByText(/Invalid NZ licence format/)).not.toBeInTheDocument()
    })

    it('shows the same error wording as Financing for an invalid licence format', () => {
      render(<BuyerInformationStep form={{ ...mockFormData, buyerLicense: '12345' }} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.getByText('Invalid NZ licence format (e.g., AB12345)')).toBeInTheDocument()
    })

    it('shows no error for a valid NZ licence format (2 letters + 5-6 digits)', () => {
      render(<BuyerInformationStep form={{ ...mockFormData, buyerLicense: 'AB123456' }} onFormChange={() => {}} canNext={false} onBack={() => {}} onNext={() => {}} />)
      expect(screen.queryByText(/Invalid NZ licence format/)).not.toBeInTheDocument()
    })

    it('automatically uppercases typed licence characters (no need to press Caps Lock)', () => {
      let latestForm = mockFormData
      const onFormChange = (updater: (f: typeof mockFormData) => typeof mockFormData) => {
        latestForm = updater(latestForm)
      }
      render(<BuyerInformationStep form={mockFormData} onFormChange={onFormChange} canNext={false} onBack={() => {}} onNext={() => {}} />)
      fireEvent.change(screen.getByLabelText(/Driver License/), { target: { value: 'ab12345' } })
      expect(latestForm.buyerLicense).toBe('AB12345')
    })
  })
})
