import { describe, it, expect } from 'vitest'
import {
  normalizeFinancingDocument,
  validateAttachmentUrl,
  sanitizeDownloadFilename,
  extensionFromResourceType,
  ALLOWED_DOWNLOAD_HOSTNAMES,
} from '../financingDocumentDownload.js'

describe('financingDocumentDownload helpers', () => {
  describe('normalizeFinancingDocument', () => {
    it('normalizes a legacy plain-string URL', () => {
      const result = normalizeFinancingDocument('https://res.cloudinary.com/demo/image/upload/a.jpg')
      expect(result).toEqual({ url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', filename: undefined })
    })

    it('passes through a full FinancingDocument object unchanged', () => {
      const doc = { url: 'https://res.cloudinary.com/demo/image/upload/payslip.pdf', type: 'payslip', filename: 'payslip.pdf' }
      expect(normalizeFinancingDocument(doc)).toBe(doc)
    })

    it('returns null for malformed input (no url, wrong type)', () => {
      expect(normalizeFinancingDocument(null)).toBeNull()
      expect(normalizeFinancingDocument(42)).toBeNull()
      expect(normalizeFinancingDocument({ type: 'payslip' })).toBeNull()
    })
  })

  describe('reused generic helpers (imported from saleDocumentDownload.js, not duplicated)', () => {
    it('validateAttachmentUrl accepts an approved Cloudinary HTTPS URL', () => {
      expect(validateAttachmentUrl('https://res.cloudinary.com/demo/image/upload/a.jpg').ok).toBe(true)
    })

    it('validateAttachmentUrl rejects an unapproved hostname', () => {
      const result = validateAttachmentUrl('https://evil.example.com/steal-me')
      expect(result.ok).toBe(false)
    })

    it('sanitizeDownloadFilename strips unsafe characters', () => {
      expect(sanitizeDownloadFilename('../../etc/passwd', 'fallback.jpg')).toBe('....etcpasswd')
    })

    it('extensionFromResourceType falls back to .pdf when there is no signal at all (Financing has no resourceType)', () => {
      expect(extensionFromResourceType(undefined, '/demo/raw/upload/a')).toBe('.pdf')
    })

    it('extensionFromResourceType still prefers the URL pathname extension when present', () => {
      expect(extensionFromResourceType(undefined, '/demo/image/upload/a.png')).toBe('.png')
    })

    it('exposes the same hostname allowlist as Sales', () => {
      expect(ALLOWED_DOWNLOAD_HOSTNAMES.has('res.cloudinary.com')).toBe(true)
    })
  })
})
