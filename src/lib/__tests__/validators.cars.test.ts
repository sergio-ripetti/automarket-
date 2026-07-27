import { describe, it, expect } from 'vitest'
import { validateCarPayload } from '../validators'

describe('validateCarPayload', () => {
  describe('valid payloads', () => {
    it('accepts valid full car creation payload', () => {
      const payload = {
        title: '2020 Toyota Camry',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico',
        fuel: 'gasolina',
        color: 'blue',
        description: 'Great condition',
        ownerDescription: 'Well maintained',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }
      expect(validateCarPayload(payload, false)).toBe(null)
    })

    it('accepts valid partial car update payload', () => {
      const payload = {
        featured: true,
      }
      expect(validateCarPayload(payload, true)).toBe(null)
    })

    it('accepts multiple field update', () => {
      const payload = {
        price: 27000,
        featured: true,
        isOnSale: true,
      }
      expect(validateCarPayload(payload, true)).toBe(null)
    })

    it('accepts all transmission types', () => {
      const manualPayload = { transmission: 'manual' }
      const automaticPayload = { transmission: 'automatico' }
      expect(validateCarPayload(manualPayload, true)).toBe(null)
      expect(validateCarPayload(automaticPayload, true)).toBe(null)
    })

    it('accepts all fuel types', () => {
      const fuelTypes = ['gasolina', 'diesel', 'electrico', 'hibrido']
      for (const fuel of fuelTypes) {
        expect(validateCarPayload({ fuel }, true)).toBe(null)
      }
    })

    it('accepts originalPrice as undefined or null', () => {
      const payload1 = { originalPrice: undefined }
      const payload2 = { originalPrice: null }
      expect(validateCarPayload(payload1, true)).toBe(null)
      expect(validateCarPayload(payload2, true)).toBe(null)
    })

    it('accepts originalPrice as valid number', () => {
      const payload = { originalPrice: 30000 }
      expect(validateCarPayload(payload, true)).toBe(null)
    })
  })

  describe('required field validation', () => {
    it('rejects POST without title', () => {
      const payload = {
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        price: 25000,
        km: 50000,
        transmission: 'automatico',
        fuel: 'gasolina',
        color: 'blue',
        description: 'Test',
        ownerDescription: 'Test',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }
      expect(validateCarPayload(payload, false)).toContain('title is required')
    })

    it('rejects empty title', () => {
      const payload = { title: '   ' }
      expect(validateCarPayload(payload, true)).toContain('Title is required')
    })

    it('rejects title over 255 characters', () => {
      const payload = { title: 'a'.repeat(256) }
      expect(validateCarPayload(payload, true)).toContain('cannot exceed 255')
    })

    it('rejects invalid transmission', () => {
      const payload = { transmission: 'cvt' }
      expect(validateCarPayload(payload, true)).toContain('manual')
    })

    it('rejects invalid fuel', () => {
      const payload = { fuel: 'hydrogen' }
      expect(validateCarPayload(payload, true)).toContain('gasolina')
    })

    it('rejects negative price', () => {
      const payload = { price: -1000 }
      expect(validateCarPayload(payload, true)).toContain('non-negative')
    })

    it('rejects negative mileage', () => {
      const payload = { km: -1000 }
      expect(validateCarPayload(payload, true)).toContain('non-negative')
    })

    it('rejects invalid year (before 1900)', () => {
      const payload = { year: 1800 }
      expect(validateCarPayload(payload, true)).toContain('Year must be')
    })

    it('rejects invalid year (after 2100)', () => {
      const payload = { year: 2101 }
      expect(validateCarPayload(payload, true)).toContain('Year must be')
    })

    it('rejects negative originalPrice', () => {
      const payload = { originalPrice: -1000 }
      expect(validateCarPayload(payload, true)).toContain('non-negative')
    })
  })

  describe('field validation', () => {
    it('rejects non-array images', () => {
      const payload = { images: 'not-an-array' }
      expect(validateCarPayload(payload, true)).toContain('array')
    })

    it('rejects empty images array', () => {
      const payload = { images: [] }
      expect(validateCarPayload(payload, true)).toContain('least one image')
    })

    it('rejects more than 10 images', () => {
      const payload = { images: Array(11).fill('https://example.com/img.jpg') }
      expect(validateCarPayload(payload, true)).toContain('Maximum 10')
    })

    it('rejects non-URL images', () => {
      const payload = { images: ['not-a-url'] }
      expect(validateCarPayload(payload, true)).toContain('valid URL')
    })

    it('rejects description over 2000 characters', () => {
      const payload = { description: 'a'.repeat(2001) }
      expect(validateCarPayload(payload, true)).toContain('cannot exceed 2000')
    })

    it('rejects ownerDescription over 2000 characters', () => {
      const payload = { ownerDescription: 'a'.repeat(2001) }
      expect(validateCarPayload(payload, true)).toContain('cannot exceed 2000')
    })

    it('rejects non-boolean featured', () => {
      const payload = { featured: 'yes' }
      expect(validateCarPayload(payload, true)).toContain('boolean')
    })

    it('rejects non-boolean isOnSale', () => {
      const payload = { isOnSale: 1 }
      expect(validateCarPayload(payload, true)).toContain('boolean')
    })

    it('rejects color over 50 characters', () => {
      const payload = { color: 'a'.repeat(51) }
      expect(validateCarPayload(payload, true)).toContain('cannot exceed 50')
    })
  })

  describe('mutation protection', () => {
    it('rejects id mutation', () => {
      const payload = { id: 'different-id' }
      expect(validateCarPayload(payload, true)).toContain('Cannot modify car id')
    })

    it('rejects createdAt mutation', () => {
      const payload = { createdAt: new Date() }
      expect(validateCarPayload(payload, true)).toContain('Cannot modify createdAt')
    })
  })

  describe('partial update validation', () => {
    it('rejects completely empty PATCH payload', () => {
      const payload = {}
      expect(validateCarPayload(payload, true)).toContain('least one field')
    })

    it('allows single field update in PATCH', () => {
      const payload = { price: 27000 }
      expect(validateCarPayload(payload, true)).toBe(null)
    })

    it('validates only supplied fields in PATCH', () => {
      const payload = { featured: true }
      // Should not require other fields like images, description, etc.
      expect(validateCarPayload(payload, true)).toBe(null)
    })
  })

  describe('payload structure', () => {
    it('rejects null payload', () => {
      expect(validateCarPayload(null, false)).toContain('Invalid car payload')
    })

    it('rejects non-object payload', () => {
      expect(validateCarPayload('string', false)).toContain('Invalid car payload')
    })

    it('rejects array payload', () => {
      expect(validateCarPayload([], false)).toContain('Invalid car payload')
    })
  })
})
