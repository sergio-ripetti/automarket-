import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUserRole } from '../useUserRole'

const mockUseAuth = vi.fn()
vi.mock('../useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockAuthenticatedFetch = vi.fn()
vi.mock('../../lib/authService', () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}))

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns role null and not loading while auth itself is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { result } = renderHook(() => useUserRole())
    expect(result.current.role).toBeNull()
    expect(result.current.isDemo).toBe(false)
  })

  it('returns role null when there is no signed-in user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { result } = renderHook(() => useUserRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
  })

  it('resolves role "demo" via GET /api/me and sets isDemo true', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockAuthenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, role: 'demo' })),
    )
    const { result } = renderHook(() => useUserRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith('/api/me')
    expect(result.current.role).toBe('demo')
    expect(result.current.isDemo).toBe(true)
  })

  it('resolves role "admin" and sets isDemo false', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockAuthenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, role: 'admin' })),
    )
    const { result } = renderHook(() => useUserRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('admin')
    expect(result.current.isDemo).toBe(false)
  })

  it('fails closed to role null on a network/parse error', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockAuthenticatedFetch.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useUserRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
    expect(result.current.isDemo).toBe(false)
  })
})
