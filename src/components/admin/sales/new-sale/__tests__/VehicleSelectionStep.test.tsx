import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VehicleSelectionStep } from '../VehicleSelectionStep'
import type { FormData } from '../../../../../types/saleForm'
import type { Car } from '../../../../../types'

const mockCar: Car = {
  id: '1', title: '2020 Toyota Camry', brand: 'Toyota', model: 'Camry', year: 2020, km: 45000,
  price: 28000, isOnSale: false, description: 'Good car', ownerDescription: 'First owner',
  images: ['https://ex.com/car.jpg'], featured: false, transmission: 'automatico', fuel: 'gasolina', color: 'blue',
}

const mockFormData: FormData = {
  carId: '', vin: '', plate: '', isNZNew: true, originCountry: 'Japan', previousOwners: 0,
  hasMaintenanceHistory: false, buyerName: '', buyerIdNumber: '', buyerLicense: '', buyerEmail: '',
  buyerPhone: '', buyerAddress: '', saleDate: '2025-01-01', paymentType: 'cash', salePrice: 28000,
  downPayment: 0, loanTerm: 24, firstPaymentDate: '2025-02-01', notes: '', orcIncluded: false,
  driveAwayPrice: false, orcWof: 0, orcRegistration: 0, orcRegistrationMonths: 6, orcGrooming: 0,
  orcOwnershipTransfer: 0, orcMechanicalInspection: 0, orcOtherLabel: '', orcOtherAmount: 0, accessories: [],
  ffEstablishment: 0, ffPpsr: 0, ffMonthlyAccount: 0, ffDealerOrigination: 0, warrantyIncluded: false,
  warrantyMonths: 3, warrantyProvider: '', mechInsuranceIncluded: false, mechInsuranceMonths: 3,
  mechInsuranceProvider: '', uploadingFiles: new Map(), uploadedDocuments: [],
}

describe('VehicleSelectionStep', () => {
  it('renders vehicle search', () => {
    render(<VehicleSelectionStep selectedCar={null} searchInput="" filteredCars={[]} carsOpen={false} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    expect(screen.getByPlaceholderText('Search vehicles...')).toBeInTheDocument()
  })

  it('renders available options', () => {
    render(<VehicleSelectionStep selectedCar={null} searchInput="Toyota" filteredCars={[mockCar]} carsOpen={true} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
  })

  it('calls vehicle-selection callback', () => {
    const onCarSelect = vi.fn()
    render(<VehicleSelectionStep selectedCar={null} searchInput="Toyota" filteredCars={[mockCar]} carsOpen={true} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={onCarSelect} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    const carOption = screen.getByText('2020 Toyota Camry').closest('div')
    fireEvent.click(carOption!)
    expect(onCarSelect).toHaveBeenCalled()
  })

  it('renders selected vehicle state', () => {
    render(<VehicleSelectionStep selectedCar={mockCar} searchInput="" filteredCars={[]} carsOpen={false} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('Change Vehicle')).toBeInTheDocument()
  })

  it('calls deselection callback', () => {
    const onCarDeselect = vi.fn()
    render(<VehicleSelectionStep selectedCar={mockCar} searchInput="" filteredCars={[]} carsOpen={false} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={onCarDeselect} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    fireEvent.click(screen.getByText('Change Vehicle'))
    expect(onCarDeselect).toHaveBeenCalled()
  })

  it('Next button respects validation', () => {
    const { rerender } = render(<VehicleSelectionStep selectedCar={mockCar} searchInput="" filteredCars={[]} carsOpen={false} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Next Step')).toBeDisabled()
    rerender(<VehicleSelectionStep selectedCar={mockCar} searchInput="" filteredCars={[]} carsOpen={false} form={{...mockFormData, vin: 'ABC123', plate: 'ABC123'}} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={true} onNext={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Next Step')).not.toBeDisabled()
  })

  it('Cancel button calls callback', () => {
    const onCancel = vi.fn()
    render(<VehicleSelectionStep selectedCar={null} searchInput="" filteredCars={[]} carsOpen={false} form={mockFormData} onSearchChange={() => {}} onCarsOpenChange={() => {}} onCarSelect={() => {}} onCarDeselect={() => {}} onFormChange={() => {}} canNext={false} onNext={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
