import { useState } from 'react'
import type { FormData } from '../types/saleForm'

export interface UIState {
  orcExpanded: boolean
  accessoriesExpanded: boolean
  financingFeesExpanded: boolean
  warrantyExpanded: boolean
}

const initialUIState: UIState = {
  orcExpanded: false,
  accessoriesExpanded: false,
  financingFeesExpanded: false,
  warrantyExpanded: false,
}

const initialFormData: FormData = {
  carId: '',
  vin: '',
  plate: '',
  isNZNew: true,
  originCountry: 'Japan',
  previousOwners: 0,
  hasMaintenanceHistory: false,
  buyerName: '',
  buyerIdNumber: '',
  buyerLicense: '',
  buyerEmail: '',
  buyerPhone: '',
  buyerAddress: '',
  saleDate: new Date().toISOString().split('T')[0],
  paymentType: 'cash',
  salePrice: 0,
  downPayment: 0,
  loanTerm: 24,
  firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  notes: '',
  orcIncluded: false,
  driveAwayPrice: false,
  orcWof: 0,
  orcRegistration: 0,
  orcRegistrationMonths: 6,
  orcGrooming: 0,
  orcOwnershipTransfer: 0,
  orcMechanicalInspection: 0,
  orcOtherLabel: '',
  orcOtherAmount: 0,
  accessories: [],
  ffEstablishment: 0,
  ffPpsr: 10,
  ffMonthlyAccount: 0,
  ffDealerOrigination: 0,
  warrantyIncluded: false,
  warrantyMonths: 3,
  warrantyProvider: '',
  mechInsuranceIncluded: false,
  mechInsuranceMonths: 3,
  mechInsuranceProvider: '',
  uploadingFiles: new Map(),
  uploadedDocuments: [],
}

/**
 * Custom hook for managing admin sale form state, including form data and UI expansion states
 */
export function useAdminSaleForm() {
  const [form, setForm] = useState<FormData>(initialFormData)
  const [uiState, setUiState] = useState<UIState>(initialUIState)

  const toggleSection = (section: keyof UIState) => {
    setUiState((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const resetForm = () => {
    setForm(initialFormData)
    setUiState(initialUIState)
  }

  return {
    form,
    setForm,
    uiState,
    toggleSection,
    resetForm,
  }
}
