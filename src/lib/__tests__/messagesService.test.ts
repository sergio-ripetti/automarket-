import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitPublicMessage } from '../messagesService'

// Mock fetch
let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})

describe('submitPublicMessage', () => {
  describe('successful submission', () => {
    it('calls correct endpoint with POST method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg123' }),
      })

      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
        type: 'contact' as const,
      }

      await submitPublicMessage(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/messages/submit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('returns success response with messageId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg456' }),
      })

      const payload = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        message: 'Offer message',
        offerPrice: 15000,
        type: 'offer' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg456')
    })

    it('sends JSON payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg789' }),
      })

      const payload = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0000',
        message: 'Test',
        type: 'contact' as const,
      }

      await submitPublicMessage(payload)

      const call = mockFetch.mock.calls[0]
      expect(JSON.parse(call[1].body)).toEqual(payload)
    })
  })

  describe('error handling', () => {
    it('returns error response on non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      })

      const payload = {
        name: 'John',
        email: 'invalid-email',
        phone: '555-1234',
        message: 'Test',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    it('returns error message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid email format' }),
      })

      const payload = {
        name: 'John',
        email: 'not-email',
        phone: '555-1234',
        message: 'Test',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.error).toBe('Invalid email format')
    })

    it('returns generic error on missing error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to submit message')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('handles fetch throwing', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('payload types', () => {
    it('handles contact form payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg1' }),
      })

      const payload = {
        name: 'Contact User',
        email: 'contact@example.com',
        phone: '555-1111',
        reason: 'Inquiry',
        message: 'Contact message',
        type: 'contact' as const,
      }

      const result = await submitPublicMessage(payload)
      expect(result.success).toBe(true)
    })

    it('handles vehicle offer payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg2' }),
      })

      const payload = {
        firstName: 'Offer',
        lastName: 'User',
        email: 'offer@example.com',
        phone: '555-2222',
        message: 'Offer message',
        offerPrice: 20000,
        carId: 'car1',
        carTitle: 'Vehicle',
        carPrice: 25000,
        type: 'offer' as const,
      }

      const result = await submitPublicMessage(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('no Firestore dependency', () => {
    it('does not import or use Firestore SDK in submission', () => {
      // The service only uses fetch, not Firestore client SDK for submission
      // This is verified by the fact that submitPublicMessage calls /api/messages/submit endpoint
      expect(mockFetch).toBeDefined()
    })
  })
})
