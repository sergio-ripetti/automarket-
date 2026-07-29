import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getIdToken = vi.fn(async () => 'mock-id-token')
let currentUser: { getIdToken: typeof getIdToken } | null = { getIdToken }

vi.mock('../firebase', () => ({
  get auth() {
    return { get currentUser() { return currentUser } }
  },
}))

const originalFetch = globalThis.fetch
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

describe('downloadSaleDocument', () => {
  beforeEach(() => {
    currentUser = { getIdToken }
    getIdToken.mockClear()
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  it('rejects when no user is signed in', async () => {
    currentUser = null
    const { downloadSaleDocument, SaleDocumentDownloadError } = await import('../downloadSaleDocument')
    await expect(downloadSaleDocument('sale1', 'https://res.cloudinary.com/a.jpg')).rejects.toThrow(SaleDocumentDownloadError)
  })

  it('calls the protected local endpoint with an Authorization header, not the Cloudinary URL directly', async () => {
    const fetchSpy: ReturnType<typeof vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>> = vi.fn(
      async () =>
        new Response('file-bytes', {
          status: 200,
          headers: { 'content-disposition': 'attachment; filename="doc.pdf"', 'content-type': 'application/pdf' },
        })
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const { downloadSaleDocument } = await import('../downloadSaleDocument')
    await downloadSaleDocument('sale1', 'https://res.cloudinary.com/a.pdf')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchSpy.mock.calls[0]
    expect(String(calledUrl)).toContain('/api/sales/sale1/documents/download?url=')
    expect(String(calledUrl)).not.toBe('https://res.cloudinary.com/a.pdf')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer mock-id-token' })
  })

  it('triggers a real browser download via an object URL, using the server-provided filename', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('file-bytes', {
        status: 200,
        headers: { 'content-disposition': 'attachment; filename="license.pdf"' },
      })
    ) as unknown as typeof fetch

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })

    const { downloadSaleDocument } = await import('../downloadSaleDocument')
    await downloadSaleDocument('sale1', 'https://res.cloudinary.com/a.pdf')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('throws a controlled error with the backend message on failure', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, error: 'Attachment not found on this sale' }), { status: 404 })
    ) as unknown as typeof fetch

    const { downloadSaleDocument, SaleDocumentDownloadError } = await import('../downloadSaleDocument')
    await expect(downloadSaleDocument('sale1', 'https://res.cloudinary.com/a.pdf')).rejects.toThrow(
      new SaleDocumentDownloadError('Attachment not found on this sale')
    )
  })

  it('falls back to a generic error message when the failure response is not JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch

    const { downloadSaleDocument } = await import('../downloadSaleDocument')
    await expect(downloadSaleDocument('sale1', 'https://res.cloudinary.com/a.pdf')).rejects.toThrow(
      /Failed to download/i
    )
  })
})
