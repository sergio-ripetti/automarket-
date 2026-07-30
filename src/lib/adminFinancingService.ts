import { getAuth } from 'firebase/auth'
import type { FinancingRequest } from './financingService'
import { apiUrl, parseJsonResponse } from './apiClient'

interface GetApplicationsResponse {
  success: boolean
  applications?: FinancingRequest[]
  error?: string
  status?: number
}

interface UpdateFinancingStatusResponse {
  success: boolean
  error?: string
}

interface DeleteFinancingResponse {
  success: boolean
  error?: string
}

/**
 * Fetch all financing applications from authenticated backend endpoint
 * Uses Firebase ID token for authorization
 */
export async function getFinancingApplications(): Promise<GetApplicationsResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated', status: 401 }
    }

    const response = await fetch(apiUrl('/api/financing/applications'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await parseJsonResponse<GetApplicationsResponse>(response)

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to fetch financing applications',
        status: response.status,
      }
    }

    return { ...data, status: response.status }
  } catch (err) {
    console.error('Failed to fetch financing applications:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}

/**
 * Update financing application status via authenticated backend endpoint
 */
export async function updateFinancingStatus(
  id: string,
  status: FinancingRequest['status'],
): Promise<UpdateFinancingStatusResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(apiUrl(`/api/financing/${id}/status`), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    const data = await parseJsonResponse<{ error?: string }>(response)

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to update financing status',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to update financing status:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}

/**
 * Delete a financing application via authenticated backend endpoint
 */
export async function deleteFinancingApplication(id: string): Promise<DeleteFinancingResponse> {
  try {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(apiUrl(`/api/financing/${id}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await parseJsonResponse<{ error?: string }>(response)

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete financing application',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to delete financing application:', err)
    return {
      success: false,
      error: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    }
  }
}
