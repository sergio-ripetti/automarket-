import { describe, it, expect, vi, afterEach } from 'vitest'

// import.meta.env is read at call time inside getApiBaseUrl/apiUrl, so we can mutate it between
// tests via vi.stubEnv instead of needing per-test module resets.
import { getApiBaseUrl, apiUrl, parseJsonResponse, ApiResponseError } from '../apiClient'

describe('getApiBaseUrl / apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back to a relative path when VITE_API_BASE_URL is not configured (local dev via Vite proxy)', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('')
    expect(apiUrl('/api/sales')).toBe('/api/sales')
  })

  it('uses the configured production backend origin when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com')
    expect(getApiBaseUrl()).toBe('https://backend.example.com')
    expect(apiUrl('/api/sales')).toBe('https://backend.example.com/api/sales')
  })

  it('strips a trailing slash from the configured base URL to avoid a double slash', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com/')
    expect(apiUrl('/api/public/sold-vehicle-ids')).toBe('https://backend.example.com/api/public/sold-vehicle-ids')
  })

  it('does not produce a double slash when the path is missing its leading slash', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com')
    expect(apiUrl('api/messages/submit')).toBe('https://backend.example.com/api/messages/submit')
  })

  it('never hardcodes localhost in the resolved base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com')
    expect(getApiBaseUrl()).not.toContain('localhost')
  })

  it('treats whitespace-only VITE_API_BASE_URL as unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '   ')
    expect(getApiBaseUrl()).toBe('')
  })
})

describe('parseJsonResponse', () => {
  it('parses a well-formed JSON response', async () => {
    const response = new Response(JSON.stringify({ success: true, value: 42 }), {
      headers: { 'content-type': 'application/json' },
    })
    const data = await parseJsonResponse<{ success: boolean; value: number }>(response)
    expect(data).toEqual({ success: true, value: 42 })
  })

  it('parses JSON bodies from test doubles that omit a content-type header', async () => {
    const response = new Response(JSON.stringify({ success: true }))
    const data = await parseJsonResponse<{ success: boolean }>(response)
    expect(data).toEqual({ success: true })
  })

  it('throws a controlled ApiResponseError (not a raw SyntaxError) when the response is HTML', async () => {
    const response = new Response('<!doctype html><html><body>Not Found</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
    await expect(parseJsonResponse(response)).rejects.toBeInstanceOf(ApiResponseError)
  })

  it('the controlled error message does not leak the raw HTML body', async () => {
    const response = new Response('<!doctype html><html><body>Not Found</body></html>', {
      headers: { 'content-type': 'text/html' },
    })
    await expect(parseJsonResponse(response)).rejects.toThrow(
      /unavailable or misconfigured/i,
    )
  })

  it('throws a controlled ApiResponseError when the body claims JSON but fails to parse', async () => {
    const response = new Response('not actually json', {
      headers: { 'content-type': 'application/json' },
    })
    await expect(parseJsonResponse(response)).rejects.toBeInstanceOf(ApiResponseError)
  })
})
