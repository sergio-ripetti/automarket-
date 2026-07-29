import { describe, it, expect } from 'vitest'
import {
  ALLOWED_DOWNLOAD_HOSTNAMES,
  normalizeSaleDocument,
  sanitizeDownloadFilename,
  extensionFromResourceType,
  validateAttachmentUrl,
} from '../saleDocumentDownload.js'

describe('saleDocumentDownload helpers', () => {
  describe('normalizeSaleDocument', () => {
    it('normalizes a legacy plain-string URL', () => {
      const result = normalizeSaleDocument('https://res.cloudinary.com/demo/image/upload/a.jpg')
      expect(result).toEqual({
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        publicId: '',
        resourceType: '',
        filename: undefined,
      })
    })

    it('passes through a full attachment object unchanged', () => {
      const doc = { url: 'https://res.cloudinary.com/demo/raw/upload/a.pdf', publicId: 'a', resourceType: 'raw', filename: 'a.pdf' }
      expect(normalizeSaleDocument(doc)).toBe(doc)
    })

    it('returns null for malformed non-object, non-string input', () => {
      expect(normalizeSaleDocument(null)).toBeNull()
      expect(normalizeSaleDocument(42)).toBeNull()
      expect(normalizeSaleDocument(undefined)).toBeNull()
    })
  })

  describe('sanitizeDownloadFilename', () => {
    it('returns the fallback when name is missing', () => {
      expect(sanitizeDownloadFilename(undefined, 'fallback.jpg')).toBe('fallback.jpg')
      expect(sanitizeDownloadFilename('', 'fallback.jpg')).toBe('fallback.jpg')
    })

    it('strips path traversal and separators', () => {
      expect(sanitizeDownloadFilename('../../etc/passwd', 'fallback.jpg')).toBe('....etcpasswd')
    })

    it('strips invalid Windows filename characters', () => {
      expect(sanitizeDownloadFilename('bad<>:"|?*name.jpg', 'fallback.jpg')).toBe('badname.jpg')
    })

    it('strips control characters (header injection defense)', () => {
      expect(sanitizeDownloadFilename('evil\r\nSet-Cookie: x=1.jpg', 'fallback.jpg')).toBe('evilSet-Cookie x=1.jpg')
    })

    it('falls back when the cleaned name is empty or just dots', () => {
      expect(sanitizeDownloadFilename('///', 'fallback.jpg')).toBe('fallback.jpg')
      expect(sanitizeDownloadFilename('.', 'fallback.jpg')).toBe('fallback.jpg')
      expect(sanitizeDownloadFilename('..', 'fallback.jpg')).toBe('fallback.jpg')
    })

    it('preserves a normal safe filename', () => {
      expect(sanitizeDownloadFilename('drivers-licence.pdf', 'fallback.pdf')).toBe('drivers-licence.pdf')
    })

    it('truncates excessively long filenames', () => {
      const long = 'a'.repeat(300) + '.jpg'
      expect(sanitizeDownloadFilename(long, 'fallback.jpg').length).toBe(150)
    })
  })

  describe('extensionFromResourceType', () => {
    it('prefers the extension found in the URL pathname', () => {
      expect(extensionFromResourceType('image', '/demo/image/upload/a.png')).toBe('.png')
    })

    it('falls back to .jpg for image resource type with no URL extension', () => {
      expect(extensionFromResourceType('image', '/demo/image/upload/a')).toBe('.jpg')
    })

    it('falls back to .pdf for non-image resource types with no URL extension', () => {
      expect(extensionFromResourceType('raw', '/demo/raw/upload/a')).toBe('.pdf')
    })
  })

  describe('validateAttachmentUrl', () => {
    it('accepts an approved Cloudinary HTTPS URL', () => {
      const result = validateAttachmentUrl('https://res.cloudinary.com/demo/image/upload/a.jpg')
      expect(result.ok).toBe(true)
    })

    it('rejects a malformed URL', () => {
      const result = validateAttachmentUrl('not a url')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/invalid URL/)
    })

    it('rejects non-HTTPS protocols', () => {
      const result = validateAttachmentUrl('http://res.cloudinary.com/demo/image/upload/a.jpg')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/HTTPS/)
    })

    it('rejects an unapproved hostname (SSRF defense)', () => {
      const result = validateAttachmentUrl('https://evil.example.com/steal-me')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/approved provider/)
    })

    it('rejects file:// and other unsupported protocols', () => {
      const result = validateAttachmentUrl('file:///etc/passwd')
      expect(result.ok).toBe(false)
    })

    it('exposes the exact hostname allowlist', () => {
      expect(ALLOWED_DOWNLOAD_HOSTNAMES.has('res.cloudinary.com')).toBe(true)
      expect(ALLOWED_DOWNLOAD_HOSTNAMES.has('evil.example.com')).toBe(false)
    })
  })
})
