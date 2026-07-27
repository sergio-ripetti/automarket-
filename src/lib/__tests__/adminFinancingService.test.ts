import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'mock-token-123'),
    },
  })),
}))

import { getFinancingApplications, updateFinancingStatus, deleteFinancingApplication } from '../adminFinancingService'

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})

describe('adminFinancingService', () => {
  describe('getFinancingApplications', () => {
    it('calls GET /api/financing/applications with Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, applications: [] }),
      })

      await getFinancingApplications()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/financing/applications',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
        })
      )
    })

    it('returns applications on success', async () => {
      const mockApps = [
        { id: 'fin-1', firstName: 'John', lastName: 'Doe', status: 'pending' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, applications: mockApps }),
      })

      const result = await getFinancingApplications()

      expect(result.success).toBe(true)
      expect(result.applications).toEqual(mockApps)
    })

    it('returns error on 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      const result = await getFinancingApplications()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Server error')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network down'))

      const result = await getFinancingApplications()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('updateFinancingStatus', () => {
    it('calls PATCH /api/financing/:id/status with Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updateFinancingStatus('fin-123', 'approved')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/financing/fin-123/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
          body: JSON.stringify({ status: 'approved' }),
        })
      )
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updateFinancingStatus('fin-123', 'approved')

      expect(result.success).toBe(true)
    })

    it('returns error on 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid status' }),
      })

      const result = await updateFinancingStatus('fin-123', 'invalid' as unknown as import('../financingService').FinancingRequest['status'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Financing not found' }),
      })

      const result = await updateFinancingStatus('missing', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Financing not found')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection lost'))

      const result = await updateFinancingStatus('fin-123', 'approved')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('deleteFinancingApplication', () => {
    it('calls DELETE /api/financing/:id with Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteFinancingApplication('fin-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/financing/fin-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
        })
      )
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await deleteFinancingApplication('fin-123')

      expect(result.success).toBe(true)
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Financing not found' }),
      })

      const result = await deleteFinancingApplication('missing')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await deleteFinancingApplication('fin-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })
})
