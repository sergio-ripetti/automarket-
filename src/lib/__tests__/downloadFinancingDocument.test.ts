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

describe('downloadFinancingDocument', () => {
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
    const { downloadFinancingDocument, FinancingDocumentDownloadError } = await import('../downloadFinancingDocument')
    await expect(downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.jpg')).rejects.toThrow(
      FinancingDocumentDownloadError
    )
  })

  it('calls the protected local Financing endpoint with an Authorization header, not the Cloudinary URL directly', async () => {
    const fetchSpy: ReturnType<typeof vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>> = vi.fn(
      async () =>
        new Response('file-bytes', {
          status: 200,
          headers: { 'content-disposition': 'attachment; filename="payslip.pdf"', 'content-type': 'application/pdf' },
        })
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const { downloadFinancingDocument } = await import('../downloadFinancingDocument')
    await downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchSpy.mock.calls[0]
    expect(String(calledUrl)).toContain('/api/financing/fin1/documents/download?url=')
    expect(String(calledUrl)).not.toBe('https://res.cloudinary.com/a.pdf')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer mock-id-token' })
  })

  it('triggers a real browser download via an object URL, using the server-provided filename', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('file-bytes', {
        status: 200,
        headers: { 'content-disposition': 'attachment; filename="payslip.pdf"' },
      })
    ) as unknown as typeof fetch

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })

    const { downloadFinancingDocument } = await import('../downloadFinancingDocument')
    await downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('falls back to a safe filename when no Content-Disposition or suggested filename is available', async () => {
    globalThis.fetch = vi.fn(async () => new Response('file-bytes', { status: 200 })) as unknown as typeof fetch

    let capturedDownload = ''
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        el.click = vi.fn()
        Object.defineProperty(el, 'download', {
          get: () => capturedDownload,
          set: (v: string) => { capturedDownload = v },
        })
      }
      return el
    })

    const { downloadFinancingDocument } = await import('../downloadFinancingDocument')
    await downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')

    expect(capturedDownload).toBe('financing-document')
  })

  it('throws a controlled error with the backend message on failure', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, error: 'Attachment not found on this financing application' }), {
        status: 404,
      })
    ) as unknown as typeof fetch

    const { downloadFinancingDocument, FinancingDocumentDownloadError } = await import('../downloadFinancingDocument')
    await expect(downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')).rejects.toThrow(
      new FinancingDocumentDownloadError('Attachment not found on this financing application')
    )
  })

  it('falls back to a generic error message when the failure response is not JSON', async () => {
    globalThis.fetch = vi.fn(async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch

    const { downloadFinancingDocument } = await import('../downloadFinancingDocument')
    await expect(downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')).rejects.toThrow(
      /Failed to download/i
    )
  })

  it('prevents unhandled rejections by always rejecting with a FinancingDocumentDownloadError instance on backend failure', async () => {
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch

    const { downloadFinancingDocument, FinancingDocumentDownloadError } = await import('../downloadFinancingDocument')
    await expect(downloadFinancingDocument('fin1', 'https://res.cloudinary.com/a.pdf')).rejects.toBeInstanceOf(
      FinancingDocumentDownloadError
    )
  })
})
