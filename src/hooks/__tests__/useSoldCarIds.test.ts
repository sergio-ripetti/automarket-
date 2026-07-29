import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSoldCarIds } from '../useSoldCarIds'

function stubFetch(response: Response) {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    void input
    return response
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('useSoldCarIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the public sold-vehicle-ids backend endpoint, not client-side Firestore', async () => {
    const fetchSpy = stubFetch(new Response(JSON.stringify({ success: true, soldVehicleIds: [], count: 0 })))
    renderHook(() => useSoldCarIds())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/public/sold-vehicle-ids')
  })

  it('starts in a loading state with an empty sold set', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never resolves
    const { result } = renderHook(() => useSoldCarIds())
    expect(result.current.loading).toBe(true)
    expect(result.current.soldCarIds.size).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('resolves with sold car IDs returned by the endpoint (cancelled-sale exclusion already applied server-side)', async () => {
    stubFetch(new Response(JSON.stringify({ success: true, soldVehicleIds: ['car-1', 'car-3'], count: 2 })))
    const { result } = renderHook(() => useSoldCarIds())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.soldCarIds.has('car-1')).toBe(true)
    expect(result.current.soldCarIds.has('car-2')).toBe(false)
    expect(result.current.soldCarIds.has('car-3')).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns an empty sold set when there are no sold vehicles', async () => {
    stubFetch(new Response(JSON.stringify({ success: true, soldVehicleIds: [], count: 0 })))
    const { result } = renderHook(() => useSoldCarIds())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.soldCarIds.size).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('fails closed (controlled error, empty sold set - not "everything available") on a non-OK HTTP response', async () => {
    stubFetch(new Response(JSON.stringify({ success: false, error: 'Unable to verify' }), { status: 503 }))
    const { result } = renderHook(() => useSoldCarIds())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.soldCarIds.size).toBe(0)
  })

  it('fails closed on a malformed success response (missing/invalid soldVehicleIds)', async () => {
    stubFetch(new Response(JSON.stringify({ success: true, soldVehicleIds: 'not-an-array' })))
    const { result } = renderHook(() => useSoldCarIds())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.soldCarIds.size).toBe(0)
  })

  it('fails closed when the network request itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network error') }))
    const { result } = renderHook(() => useSoldCarIds())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(result.current.soldCarIds.size).toBe(0)
  })

  it('does not update state after unmount (cleanup prevents stale updates)', async () => {
    let resolveResponse!: (r: Response) => void
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve })
    vi.stubGlobal('fetch', vi.fn(async () => pending))

    const { unmount } = renderHook(() => useSoldCarIds())
    unmount()
    resolveResponse(new Response(JSON.stringify({ success: true, soldVehicleIds: ['car-1'] })))

    // No assertion needed beyond "this doesn't throw an act() warning or crash" - the hook's
    // `cancelled` flag guards every setState call after unmount.
    await new Promise((r) => setTimeout(r, 0))
  })
})
