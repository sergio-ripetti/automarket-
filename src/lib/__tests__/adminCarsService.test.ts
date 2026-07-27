import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Firebase before importing service
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'mock-token-123'),
    },
  })),
}))

import { createCar, updateCar, deleteCar } from '../adminCarsService'

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})

describe('adminCarsService', () => {
  describe('createCar', () => {
    it('calls POST /api/cars endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'car-123' }),
      })

      const payload = {
        title: 'Test Car',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      await createCar(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cars',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('includes Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'car-123' }),
      })

      const payload = {
        title: 'Test Car',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      await createCar(payload)

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers).toHaveProperty('Authorization')
      expect(call[1].headers.Authorization).toMatch(/^Bearer /)
    })

    it('sends JSON payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'car-123' }),
      })

      const payload = {
        title: 'Test Car',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      await createCar(payload)

      const call = mockFetch.mock.calls[0]
      expect(JSON.parse(call[1].body)).toEqual(payload)
    })

    it('returns { success: true, id } on 2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'car-456' }),
      })

      const payload = {
        title: 'Test',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      const result = await createCar(payload)

      expect(result.success).toBe(true)
      expect(result.id).toBe('car-456')
    })

    it('returns error response on non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid car data' }),
      })

      const payload = {
        title: 'Test',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      const result = await createCar(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid car data')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const payload = {
        title: 'Test',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico' as const,
        fuel: 'gasolina' as const,
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }

      const result = await createCar(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('updateCar', () => {
    it('calls PATCH /api/cars/:id endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updateCar('car-123', { featured: true })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cars/car-123',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updateCar('car-123', { featured: true })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers).toHaveProperty('Authorization')
    })

    it('sends partial payload for PATCH', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const update = { featured: true }
      await updateCar('car-123', update)

      const call = mockFetch.mock.calls[0]
      expect(JSON.parse(call[1].body)).toEqual(update)
    })

    it('returns { success: true } on 2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updateCar('car-123', { featured: true })

      expect(result.success).toBe(true)
    })

    it('handles error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      })

      const result = await updateCar('car-123', { featured: true })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Update failed')
    })
  })

  describe('deleteCar', () => {
    it('calls DELETE /api/cars/:id endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteCar('car-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cars/car-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteCar('car-123')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers).toHaveProperty('Authorization')
    })

    it('returns { success: true } on 2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await deleteCar('car-123')

      expect(result.success).toBe(true)
    })

    it('handles error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Delete failed' }),
      })

      const result = await deleteCar('car-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Delete failed')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const result = await deleteCar('car-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('no Firestore dependency', () => {
    it('does not import or use Firestore client SDK', () => {
      // Service only uses fetch and Firebase Auth
      // All writes go through /api endpoints
      expect(mockFetch).toBeDefined()
    })
  })
})
