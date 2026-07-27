import { getAuth } from 'firebase/auth'

export interface AdminCarPayload {
  title: string
  brand: string
  model: string
  year: number
  price: number
  originalPrice?: number
  isOnSale: boolean
  km: number
  transmission: 'manual' | 'automatico'
  fuel: 'gasolina' | 'diesel' | 'electrico' | 'hibrido'
  description: string
  ownerDescription: string
  images: string[]
  featured: boolean
}

export interface AdminCarResponse {
  success: boolean
  id?: string
  error?: string
}

export interface AdminCarUpdateResponse {
  success: boolean
  error?: string
}

export interface AdminCarDeleteResponse {
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

// Creates a new car in the admin inventory
export async function createCar(payload: AdminCarPayload): Promise<AdminCarResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to create car' }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (err) {
    console.error('Error creating car:', err)
    return { success: false, error: 'Network error' }
  }
}

// Updates an existing car in the admin inventory
export async function updateCar(
  id: string,
  payload: Partial<AdminCarPayload>
): Promise<AdminCarUpdateResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/cars/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to update car' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error updating car:', err)
    return { success: false, error: 'Network error' }
  }
}

// Deletes a car from the admin inventory
export async function deleteCar(id: string): Promise<AdminCarDeleteResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`/api/cars/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to delete car' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error deleting car:', err)
    return { success: false, error: 'Network error' }
  }
}
