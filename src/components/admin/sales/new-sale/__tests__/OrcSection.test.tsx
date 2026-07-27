import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrcSection } from '../OrcSection'
import type { FormData } from '../../../../../types/saleForm'

const mockFormData: FormData = {
  carId: '1',vin: 'ABC123',plate: 'ABC123',isNZNew: true,originCountry: 'Japan',previousOwners: 0,
  hasMaintenanceHistory: false,buyerName: 'John',buyerIdNumber: 'AB123456',buyerLicense: 'DL123456',
  buyerEmail: 'j@ex.com',buyerPhone: '021234567',buyerAddress: '123 St',saleDate: '2025-01-01',
  paymentType: 'cash',salePrice: 28000,downPayment: 0,loanTerm: 24,firstPaymentDate: '2025-02-01',
  notes: '',orcIncluded: false,driveAwayPrice: false,orcWof: 100,orcRegistration: 200,
  orcRegistrationMonths: 6,orcGrooming: 150,orcOwnershipTransfer: 50,orcMechanicalInspection: 75,
  orcOtherLabel: '',orcOtherAmount: 0,accessories: [],ffEstablishment: 0,ffPpsr: 0,ffMonthlyAccount: 0,
  ffDealerOrigination: 0,warrantyIncluded: false,warrantyMonths: 3,warrantyProvider: '',
  mechInsuranceIncluded: false,mechInsuranceMonths: 3,mechInsuranceProvider: '',
  uploadingFiles: new Map(),uploadedDocuments: [],
}

describe('OrcSection', () => {
  it('calls expand/collapse callback', () => {
    const onToggle = vi.fn()
    render(<OrcSection form={mockFormData} expanded={false} orcTotal={575} onToggle={onToggle} onFormChange={() => {}} />)
    fireEvent.click(screen.getByText('ORC - On Road Costs (Optional)'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('renders fields when expanded', () => {
    render(<OrcSection form={mockFormData} expanded={true} orcTotal={575} onToggle={() => {}} onFormChange={() => {}} />)
    expect(screen.getByText('WoF (NZD)')).toBeInTheDocument()
  })

  it('calls form-change callback', () => {
    const onFormChange = vi.fn()
    render(<OrcSection form={mockFormData} expanded={true} orcTotal={575} onToggle={() => {}} onFormChange={onFormChange} />)
    const input = screen.getByDisplayValue('100')
    fireEvent.change(input, { target: { value: '150' } })
    expect(onFormChange).toHaveBeenCalled()
  })

  it('renders ORC total', () => {
    render(<OrcSection form={mockFormData} expanded={true} orcTotal={575} onToggle={() => {}} onFormChange={() => {}} />)
    expect(screen.getByText(/575/)).toBeInTheDocument()
  })

  it('preserves included-cost behaviour', () => {
    const { rerender } = render(<OrcSection form={mockFormData} expanded={true} orcTotal={575} onToggle={() => {}} onFormChange={() => {}} />)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    rerender(<OrcSection form={{...mockFormData,orcIncluded:true}} expanded={true} orcTotal={0} onToggle={() => {}} onFormChange={() => {}} />)
    expect(screen.queryByDisplayValue('100')).not.toBeInTheDocument()
  })
})
