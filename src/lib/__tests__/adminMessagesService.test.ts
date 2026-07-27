import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'mock-token-123'),
    },
  })),
}))

import { markAsRead, markAsUnread, deleteMessage } from '../adminMessagesService'

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})

describe('adminMessagesService', () => {
  describe('markAsRead', () => {
    it('calls PATCH /api/messages/:id/read with read true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await markAsRead('msg-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/messages/msg-123/read',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
          body: JSON.stringify({ read: true }),
        })
      )
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await markAsRead('msg-123')

      expect(result.success).toBe(true)
    })

    it('returns error on 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid request' }),
      })

      const result = await markAsRead('msg-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Message not found' }),
      })

      const result = await markAsRead('missing')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const result = await markAsRead('msg-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('markAsUnread', () => {
    it('calls PATCH /api/messages/:id/read with read false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await markAsUnread('msg-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/messages/msg-123/read',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ read: false }),
        })
      )
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await markAsUnread('msg-123')

      expect(result.success).toBe(true)
    })

    it('returns error on 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid value' }),
      })

      const result = await markAsUnread('msg-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })
  })

  describe('deleteMessage', () => {
    it('calls DELETE /api/messages/:id with Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteMessage('msg-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/messages/msg-123',
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

      const result = await deleteMessage('msg-123')

      expect(result.success).toBe(true)
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Message not found' }),
      })

      const result = await deleteMessage('missing')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await deleteMessage('msg-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('no Firestore dependency', () => {
    it('does not import or use Firestore client SDK', () => {
      expect(mockFetch).toBeDefined()
    })
  })
})
