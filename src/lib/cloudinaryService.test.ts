import { describe, it, expect, vi, afterEach } from 'vitest'
import { uploadDocument, uploadImage, uploadSalesDocument } from './cloudinaryService'

function makeFile(name: string, type: string): File {
  return new File(['content'], name, { type })
}

describe('cloudinaryService', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('uploadDocument (PDF path)', () => {
    it('preserves the PDF MIME type in the upload request', async () => {
      let capturedFile: File | undefined
      globalThis.fetch = vi.fn(async (url, init) => {
        if (typeof url === 'string' && url.includes('/auto/upload')) {
          const formData = init!.body as FormData
          capturedFile = formData.get('file') as File
          return new Response(
            JSON.stringify({
              secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/test.pdf',
              resource_type: 'image',
              format: 'pdf',
              public_id: 'automarket/sales/test',
            }),
            { status: 200 }
          )
        }
        // HEAD reachability check
        return new Response(null, { status: 200 })
      }) as typeof fetch

      const file = makeFile('contract.pdf', 'application/pdf')
      const url = await uploadDocument(file, 'sales')

      expect(capturedFile?.type).toBe('application/pdf')
      expect(url).toBe('https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/test.pdf')
    })

    it('stores the secure_url (not the plain http url) returned by Cloudinary', async () => {
      globalThis.fetch = vi.fn(async (url) => {
        if (typeof url === 'string' && url.includes('/auto/upload')) {
          return new Response(
            JSON.stringify({
              url: 'http://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/test.pdf',
              secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/test.pdf',
            }),
            { status: 200 }
          )
        }
        return new Response(null, { status: 200 })
      }) as typeof fetch

      const result = await uploadDocument(makeFile('doc.pdf', 'application/pdf'), 'sales')
      expect(result.startsWith('https://')).toBe(true)
    })

    it('throws a clear error when the uploaded file is not actually retrievable (delivery blocked)', async () => {
      globalThis.fetch = vi.fn(async (url, init) => {
        if (typeof url === 'string' && url.includes('/auto/upload')) {
          return new Response(
            JSON.stringify({
              secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/automarket/sales/blocked.pdf',
            }),
            { status: 200 }
          )
        }
        // Simulate Cloudinary's account-level PDF/ZIP delivery restriction: 401 on the asset URL
        if (init?.method === 'HEAD') {
          return new Response(null, { status: 401 })
        }
        return new Response(null, { status: 200 })
      }) as typeof fetch

      await expect(uploadDocument(makeFile('blocked.pdf', 'application/pdf'), 'sales')).rejects.toThrow(
        /not retrievable/i
      )
    })

    it('does not silently succeed merely because the upload POST returned 200', async () => {
      let deliveryChecked = false
      globalThis.fetch = vi.fn(async (url, init) => {
        if (typeof url === 'string' && url.includes('/auto/upload')) {
          return new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/x/image/upload/v1/f.pdf' }), {
            status: 200,
          })
        }
        if (init?.method === 'HEAD') {
          deliveryChecked = true
          return new Response(null, { status: 200 })
        }
        return new Response(null, { status: 200 })
      }) as typeof fetch

      await uploadDocument(makeFile('a.pdf', 'application/pdf'), 'sales')
      expect(deliveryChecked).toBe(true)
    })
  })

  describe('uploadImage', () => {
    it('still uploads and returns secure_url for images (unaffected by the PDF delivery check)', async () => {
      globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/photo.jpg' }), {
          status: 200,
        })
      ) as typeof fetch

      const url = await uploadImage(makeFile('photo.jpg', 'image/jpeg'), 'sales')
      expect(url).toBe('https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/photo.jpg')
    })
  })

  describe('uploadSalesDocument', () => {
    it('returns full metadata (url, publicId, resourceType) for an image, not just a URL string', async () => {
      globalThis.fetch = vi.fn(async () =>
        new Response(
          JSON.stringify({
            secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/photo.jpg',
            public_id: 'automarket/sales/photo',
            resource_type: 'image',
          }),
          { status: 200 }
        )
      ) as typeof fetch

      const result = await uploadSalesDocument(makeFile('photo.jpg', 'image/jpeg'), 'sales')
      expect(result).toEqual({
        url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/photo.jpg',
        publicId: 'automarket/sales/photo',
        resourceType: 'image',
      })
    })

    it('checks delivery reachability for a PDF before resolving, and throws when blocked', async () => {
      globalThis.fetch = vi.fn(async (url, init) => {
        if (typeof url === 'string' && url.includes('/auto/upload')) {
          return new Response(
            JSON.stringify({
              secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/blocked.pdf',
              public_id: 'automarket/sales/blocked',
              resource_type: 'image',
            }),
            { status: 200 }
          )
        }
        if (init?.method === 'HEAD') return new Response(null, { status: 401 })
        return new Response(null, { status: 200 })
      }) as typeof fetch

      await expect(uploadSalesDocument(makeFile('blocked.pdf', 'application/pdf'), 'sales')).rejects.toThrow(
        /not retrievable/i
      )
    })

    it('skips the delivery reachability check for images (they are known to work)', async () => {
      let headCalled = false
      globalThis.fetch = vi.fn(async (_url, init) => {
        if (init?.method === 'HEAD') headCalled = true
        return new Response(
          JSON.stringify({
            secure_url: 'https://res.cloudinary.com/dlfgvbtzz/image/upload/v1/photo.jpg',
            public_id: 'automarket/sales/photo',
            resource_type: 'image',
          }),
          { status: 200 }
        )
      }) as typeof fetch

      await uploadSalesDocument(makeFile('photo.jpg', 'image/jpeg'), 'sales')
      expect(headCalled).toBe(false)
    })
  })
})
