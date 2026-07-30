import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
}))

import { authenticatedFetch } from '../authService'
import { auth } from '../firebase'

describe('authenticatedFetch - backend base URL resolution', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn(async () => new Response(JSON.stringify({ success: true })))
    vi.stubGlobal('fetch', mockFetch)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(auth as any).currentUser = { getIdToken: vi.fn(async () => 'mock-token') }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('calls the local relative /api path when VITE_API_BASE_URL is not configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    await authenticatedFetch('/api/sales')
    expect(mockFetch.mock.calls[0][0]).toBe('/api/sales')
  })

  it('calls the configured production backend origin when VITE_API_BASE_URL is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com')
    await authenticatedFetch('/api/sales')
    expect(mockFetch.mock.calls[0][0]).toBe('https://backend.example.com/api/sales')
  })

  it('rejects when there is no authenticated user, without making a request', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(auth as any).currentUser = null
    await expect(authenticatedFetch('/api/sales')).rejects.toThrow('User not authenticated')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
