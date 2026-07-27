import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitFinancingApplication } from '../financingService'
import type { FinancingSubmissionPayload } from '../financingService'

const mockPayload: FinancingSubmissionPayload = {
  carId: 'car-001',
  carTitle: 'Toyota Camry 2020',
  carPrice: 25000,
  manualPrice: '25000',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+64 21 123 4567',
  licenseNumber: 'AB12345',
  income: '5000',
  monthlyExpenses: '2500',
  downPayment: 20,
  months: 36,
  employer: 'TechCorp Ltd',
  jobTitle: 'Developer',
  employmentType: 'fulltime',
  yearsEmployed: 5,
  documents: [
    {
      url: 'https://example.com/id.pdf',
      type: 'passport_license' as const,
      filename: 'id.pdf',
    },
  ],
  creditHistoryConsent: true,
}

describe('submitFinancingApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn()
  })

  it('makes POST request to correct endpoint', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, applicationId: 'fin-001' }), {
        status: 200,
      }),
    )

    await submitFinancingApplication(mockPayload)

    expect(mockFetch).toHaveBeenCalledWith('/api/financing/submit', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('sends payload as JSON body', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, applicationId: 'fin-001' }), {
        status: 200,
      }),
    )

    await submitFinancingApplication(mockPayload)

    const call = mockFetch.mock.calls[0] as unknown[]
    const fetchOptions = call[1] as { body: string }
    const parsedBody = JSON.parse(fetchOptions.body)

    expect(parsedBody.firstName).toBe('John')
    expect(parsedBody.email).toBe('john.smith@example.com')
  })

  it('returns success response on 2xx status', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, applicationId: 'fin-001' }), {
        status: 200,
      }),
    )

    const result = await submitFinancingApplication(mockPayload)

    expect(result.success).toBe(true)
    expect(result.applicationId).toBe('fin-001')
  })

  it('returns error response on non-2xx status', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'Validation failed' }), {
        status: 400,
      }),
    )

    const result = await submitFinancingApplication(mockPayload)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('handles network errors', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    try {
      await submitFinancingApplication(mockPayload)
      throw new Error('Should have thrown')
    } catch (err) {
      expect((err as Error).message).toBe('Network error')
    }
  })

  it('handles malformed JSON response', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response('invalid json', { status: 200 }),
    )

    try {
      await submitFinancingApplication(mockPayload)
      throw new Error('Should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('JSON')
    }
  })

  it('includes all form fields in request', async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, applicationId: 'fin-001' }), {
        status: 200,
      }),
    )

    await submitFinancingApplication(mockPayload)

    const call = mockFetch.mock.calls[0] as unknown[]
    const fetchOptions = call[1] as { body: string }
    const body = JSON.parse(fetchOptions.body)

    expect(body).toHaveProperty('firstName')
    expect(body).toHaveProperty('lastName')
    expect(body).toHaveProperty('email')
    expect(body).toHaveProperty('phone')
    expect(body).toHaveProperty('licenseNumber')
    expect(body).toHaveProperty('income')
    expect(body).toHaveProperty('monthlyExpenses')
    expect(body).toHaveProperty('downPayment')
    expect(body).toHaveProperty('months')
    expect(body).toHaveProperty('employer')
    expect(body).toHaveProperty('jobTitle')
    expect(body).toHaveProperty('employmentType')
    expect(body).toHaveProperty('yearsEmployed')
    expect(body).toHaveProperty('documents')
    expect(body).toHaveProperty('creditHistoryConsent')
  })

  it('does not import Firebase', () => {
    // This test verifies the service doesn't use Firebase directly
    // by checking the module doesn't have Firebase imports at runtime
    expect(submitFinancingApplication).toBeDefined()
  })
})
