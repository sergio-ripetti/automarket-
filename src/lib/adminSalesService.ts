import { getAuth } from 'firebase/auth'
import type { PaymentRecord, UploadedDocument } from './salesService'

export interface AdminSalePayload {
  // Required by the backend validator as a top-level field (validateSalePayload in
  // src/lib/validators.js checks `'salePrice' in payload`). Kept in sync with
  // paymentPlan.salePrice, which is what Sales list/detail pages read for display.
  salePrice: number
  carId: string
  carTitle: string
  carBrand: string
  carModel: string
  carYear: number
  carColor: string
  carImages: string[]
  buyer: {
    name: string
    idNumber: string
    email: string
    phone: string
    address: string
    licenseNumber: string
  }
  paymentPlan: {
    type: 'cash' | 'financing' | 'mixed'
    salePrice: number
    downPayment: number
    financedAmount: number
    monthlyRate: number
    termMonths: number
    monthlyPayment: number
    totalPayment: number
    totalInterest: number
    firstPaymentDate: string
  }
  payments: PaymentRecord[]
  status: 'active' | 'completed' | 'cancelled'
  saleDate: string
  notes: string
  vehicleInfo: {
    vin: string
    plate: string
    isNZNew: boolean
    originCountry: string
    previousOwners: number
    hasMaintenanceHistory: boolean
  }
  orc: {
    wof: number
    registration: number
    registrationMonths: 6 | 12
    grooming: number
    ownershipTransfer: number
    mechanicalInspection: number
    otherLabel: string
    otherAmount: number
    orcTotal: number
    orcIncluded: boolean
    driveAwayPrice: boolean
  }
  extraAccessories: {
    items: Array<{ description: string; price: number }>
    total: number
  }
  financingFees?: {
    establishmentFee: number
    ppsr: number
    monthlyAccountFee: number
    dealerOriginationFee: number
    total: number
  }
  warranty?: {
    included: boolean
    months: number
    provider: string
  }
  mechanicalInsurance?: {
    included: boolean
    months: number
    provider: string
  }
  documents?: {
    vehiclePhotos?: string[]
    licensePhoto?: string
    signedContract?: string
    otherDocs?: string[]
    uploadedDocuments?: (string | UploadedDocument)[]
  }
}

export interface AdminSaleResponse {
  success: boolean
  id?: string
  error?: string
}

export interface AdminSaleUpdateResponse {
  success: boolean
  error?: string
}

export interface AdminSaleDeleteResponse {
  success: boolean
  error?: string
}

export interface AdminSalePaymentResponse {
  success: boolean
  error?: string
}

// Gets Firebase ID token for authenticated requests
async function getAuthToken(): Promise<string | null> {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) return null
  return await user.getIdToken()
}

// Creates a new sale via backend endpoint
export async function createSale(payload: AdminSalePayload): Promise<AdminSaleResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to create sale' }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (err) {
    console.error('Error creating sale:', err)
    return { success: false, error: 'Network error' }
  }
}

// Updates an existing sale via backend endpoint
export async function updateSale(
  id: string,
  payload: Partial<AdminSalePayload>,
): Promise<AdminSaleUpdateResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/sales/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to update sale' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error updating sale:', err)
    return { success: false, error: 'Network error' }
  }
}

// Updates a payment status (paid/unpaid)
export async function updatePaymentStatus(
  saleId: string,
  paymentId: string,
  status: 'pending' | 'paid' | 'overdue',
): Promise<AdminSalePaymentResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/sales/${saleId}/payments/${paymentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to update payment' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error updating payment:', err)
    return { success: false, error: 'Network error' }
  }
}

// Deletes a sale via backend endpoint
export async function deleteSale(id: string): Promise<AdminSaleDeleteResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/sales/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to delete sale' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error deleting sale:', err)
    return { success: false, error: 'Network error' }
  }
}

export interface CloudinaryDeleteResponse {
  success: boolean
  error?: string
}

// Deletes a single Cloudinary asset (Sales document/photo) via the backend Admin API, so files
// removed in Record New Sale / Edit Sale don't accumulate indefinitely in Cloudinary storage.
export async function deleteCloudinaryFile(publicId: string, resourceType: string): Promise<CloudinaryDeleteResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ publicId, resourceType }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to delete file from Cloudinary' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error deleting Cloudinary file:', err)
    return { success: false, error: 'Network error' }
  }
}
