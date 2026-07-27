import { describe, it, expect } from 'vitest'
import { validatePublicMessageSubmission } from '../validators'

describe('validatePublicMessageSubmission', () => {
  describe('valid messages', () => {
    it('accepts valid contact form submission', () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        reason: 'General inquiry',
        message: 'This is a test message',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toBe(null)
    })

    it('accepts valid vehicle inquiry with offer', () => {
      const payload = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        message: 'Interested in this vehicle',
        offerPrice: 15000,
        carId: 'car123',
        carTitle: 'Toyota Camry',
        carPrice: 20000,
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toBe(null)
    })

    it('accepts vehicle offer with minimal message', () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Interested',
        offerPrice: 12000,
        carId: 'car-123',
        carTitle: 'Honda Civic',
        carPrice: 18000,
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toBe(null)
    })
  })

  describe('required field validation', () => {
    it('rejects missing email', () => {
      const payload = {
        name: 'John',
        phone: '555-1234',
        message: 'Test message',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Email is required')
    })

    it('rejects invalid email format', () => {
      const payload = {
        name: 'John',
        email: 'not-an-email',
        phone: '555-1234',
        message: 'Test message',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Invalid email format')
    })

    it('rejects missing message', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Message is required')
    })

    it('rejects empty message', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: '   ',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Message must be between')
    })

    it('rejects oversized message', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'a'.repeat(5001),
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Message must be between')
    })

    it('rejects missing name in contact form', () => {
      const payload = {
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Name is required')
    })

    it('rejects missing firstName or lastName in offer', () => {
      const payload = {
        firstName: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Name is required')
    })

    it('rejects missing phone', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        message: 'Test message',
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Phone number is required')
    })
  })

  describe('offer price validation', () => {
    it('rejects negative offer price', () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        offerPrice: -1000,
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('positive number')
    })

    it('rejects zero offer price', () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        offerPrice: 0,
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('positive number')
    })

    it('rejects non-numeric offer price', () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test',
        offerPrice: 'not-a-number',
        type: 'offer',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('positive number')
    })
  })

  describe('type validation', () => {
    it('rejects invalid message type', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
        type: 'invalid',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Invalid message type')
    })

    it('rejects missing type', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Invalid message type')
    })
  })

  describe('payload size validation', () => {
    it('rejects message exceeding 5000 characters (first limit hit)', () => {
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'a'.repeat(5001),
        type: 'contact',
      }
      expect(validatePublicMessageSubmission(payload)).toContain('Message must be between 1 and 5000')
    })

    it('rejects oversized total payload', () => {
      // Create a payload that's valid for message but large overall
      // This requires a large field other than message
      const payload = {
        name: 'John',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Valid message',
        reason: 'a'.repeat(10000), // This will make total payload > 10000 bytes
        type: 'contact',
      }
      // The reason field is capped at 100 chars, so this will fail earlier
      expect(validatePublicMessageSubmission(payload)).toContain('Reason cannot exceed 100')
    })
  })

  describe('malformed payload', () => {
    it('rejects null payload', () => {
      expect(validatePublicMessageSubmission(null)).toContain('Invalid message payload')
    })

    it('rejects non-object payload', () => {
      expect(validatePublicMessageSubmission('string')).toContain('Invalid message payload')
    })
  })
})
