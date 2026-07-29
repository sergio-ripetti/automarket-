import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import AdminAI from '../AdminAI'
import { AI_MESSAGES_STORAGE_KEY, loadAIConversation, saveAIConversation } from '../../../lib/aiConversationStorage'

const getIdToken = vi.fn(async () => 'mock-id-token')

// Mutable per-collection fixtures the firestore mock below reads from - tests set these via
// setFirestoreFixtures() before rendering to control what getBusinessContext sees.
const firestoreFixtures = vi.hoisted(() => ({
  cars: [] as Array<{ id: string; data: Record<string, unknown> }>,
  sales: [] as Array<{ id: string; data: Record<string, unknown> }>,
  messages: [] as Array<{ id: string; data: Record<string, unknown> }>,
}))

function setFirestoreFixtures(fixtures: Partial<typeof firestoreFixtures>) {
  Object.assign(firestoreFixtures, {
    cars: fixtures.cars ?? [],
    sales: fixtures.sales ?? [],
    messages: fixtures.messages ?? [],
  })
}

// Lets a test simulate GET /api/sales failing (e.g. a permission/auth error), independent of the
// firestoreFixtures data, so the resulting controlled-error behavior can be verified.
const salesFetchState = vi.hoisted(() => ({ shouldFail: false }))
function setSalesFetchShouldFail(shouldFail: boolean) {
  salesFetchState.shouldFail = shouldFail
}

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => name),
  getDocs: vi.fn(async (collectionName: string) => {
    const rows = (firestoreFixtures as Record<string, Array<{ id: string; data: Record<string, unknown> }>>)[collectionName] || []
    return { docs: rows.map((r) => ({ id: r.id, data: () => r.data })) }
  }),
}))

vi.mock('../../../lib/firebase', () => ({
  db: {},
  auth: { get currentUser() { return { getIdToken } } },
}))

vi.mock('../../../lib/authService', () => ({
  // getSales() (src/lib/salesService.ts) now calls authenticatedFetch('/api/sales') instead of
  // reading Firestore directly (firestore.rules denies all client Sales reads) - branch on the
  // URL so both the sales list and the financing-applications shape are served from this one mock.
  authenticatedFetch: vi.fn(async (url: string) => {
    if (String(url).includes('/api/sales')) {
      if (salesFetchState.shouldFail) {
        return new Response(JSON.stringify({ success: false, error: 'permission-denied' }), { status: 500 })
      }
      return new Response(JSON.stringify({ success: true, sales: firestoreFixtures.sales.map((r) => ({ id: r.id, ...r.data })) }))
    }
    return new Response(JSON.stringify({ success: true, applications: [] }))
  }),
}))

// Stubs global fetch so requests to '/aiAssistant' resolve with `response`; anything else
// (e.g. the financing-applications fetch used to build business context) gets a harmless
// empty-success response. Returns the underlying spy so callers can assert on call count.
function stubFetch(response: Response) {
  const spy = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/aiAssistant')) return response
    return new Response(JSON.stringify({ success: true, applications: [] }))
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

async function typeAndSend(text: string) {
  const input = screen.getByPlaceholderText('Ask me anything...')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.click(document.querySelector('#admin-ai-send-button')!)
}

describe('AdminAI - request flow and rate-limit handling', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    // jsdom does not implement scrollIntoView; AdminAI calls it on every message-list update
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('one deliberate submit triggers exactly one call to the AI endpoint', async () => {
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'You sold 3 cars.' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')

    await waitFor(() => {
      expect(screen.getByText('You sold 3 cars.')).toBeInTheDocument()
    })

    const aiCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('/aiAssistant'))
    expect(aiCalls).toHaveLength(1)
  })

  it('disables the Send button while a request is active, preventing a duplicate click from firing a second request', async () => {
    let resolveResponse!: (r: Response) => void
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve })
    const fetchSpy = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/aiAssistant')) return pending
      return new Response(JSON.stringify({ success: true, applications: [] }))
    })
    vi.stubGlobal('fetch', fetchSpy)

    render(<AdminAI />)
    const input = screen.getByPlaceholderText('Ask me anything...')
    fireEvent.change(input, { target: { value: 'What is my total revenue?' } })
    const button = document.querySelector('#admin-ai-send-button') as HTMLButtonElement
    fireEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())

    // A second click while disabled must not add another AI request
    fireEvent.click(button)

    resolveResponse(new Response(JSON.stringify({ reply: 'Done' }), { status: 200 }))
    await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument())

    const aiCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('/aiAssistant'))
    expect(aiCalls).toHaveLength(1)
  })

  it('rejects empty and whitespace-only messages without calling the AI endpoint', async () => {
    const fetchSpy = stubFetch(new Response(JSON.stringify({ success: true, applications: [] })))

    render(<AdminAI />)
    const input = screen.getByPlaceholderText('Ask me anything...')
    const button = document.querySelector('#admin-ai-send-button') as HTMLButtonElement

    // Empty input: Send stays disabled
    expect(button).toBeDisabled()

    fireEvent.change(input, { target: { value: '   ' } })
    expect(button).toBeDisabled()

    const aiCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('/aiAssistant'))
    expect(aiCalls).toHaveLength(0)
  })

  it('shows a friendly message including retryAfter when the backend returns a controlled 429', async () => {
    stubFetch(
      new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMIT_EXCEEDED', retryAfter: 42 }),
        { status: 429 }
      )
    )

    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')

    await waitFor(() => {
      expect(screen.getByText(/Please wait 42s before trying again/)).toBeInTheDocument()
    })
  })

  it('does not log a console.error for the expected 429 case', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubFetch(
      new Response(
        JSON.stringify({ success: false, error: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED', retryAfter: 5 }),
        { status: 429 }
      )
    )

    render(<AdminAI />)
    await typeAndSend('What is my total revenue?')

    await waitFor(() => {
      expect(screen.getByText(/Please wait 5s before trying again/)).toBeInTheDocument()
    })

    const rateLimitLogs = consoleErrorSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('API returned error status'))
    )
    expect(rateLimitLogs).toHaveLength(0)
  })

  it('resets the loading state (Send re-enabled) after a failed request via the finally block', async () => {
    stubFetch(new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 }))

    render(<AdminAI />)
    await typeAndSend('Show me unread messages')

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Ask me anything...')
    fireEvent.change(input, { target: { value: 'another question' } })
    expect(document.querySelector('#admin-ai-send-button')).not.toBeDisabled()
  })
})

describe('AdminAI - session persistence (navigation-safe conversation)', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('shows the welcome screen when there is no stored conversation', () => {
    render(<AdminAI />)
    expect(screen.getByText("Hello! I'm your AI Assistant")).toBeInTheDocument()
  })

  it('restores a previously stored conversation on mount, suppressing the welcome screen', () => {
    saveAIConversation([
      { role: 'user', content: 'How many cars have I sold?', id: 'u1' },
      { role: 'assistant', content: 'You have sold 12 cars.', id: 'a1' },
    ])

    render(<AdminAI />)

    expect(screen.getByText('How many cars have I sold?')).toBeInTheDocument()
    expect(screen.getByText('You have sold 12 cars.')).toBeInTheDocument()
    expect(screen.queryByText("Hello! I'm your AI Assistant")).not.toBeInTheDocument()
  })

  it('unmounting and remounting (simulating navigating away and back) preserves the conversation', async () => {
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'You sold 3 cars.' }), { status: 200 }))
    const { unmount } = render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')
    await waitFor(() => expect(screen.getByText('You sold 3 cars.')).toBeInTheDocument())

    unmount() // simulates React Router unmounting AdminAI on navigation to another admin page
    cleanup()

    render(<AdminAI />) // simulates navigating back to /admin/ai
    expect(screen.getByText('How many cars have I sold?')).toBeInTheDocument()
    expect(screen.getByText('You sold 3 cars.')).toBeInTheDocument()

    // No extra AI request should have been made just by remounting
    const aiCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('/aiAssistant'))
    expect(aiCalls).toHaveLength(1)
  })

  it('sending a message updates session storage', async () => {
    stubFetch(new Response(JSON.stringify({ reply: 'You sold 3 cars.' }), { status: 200 }))
    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')

    await waitFor(() => {
      const stored = loadAIConversation()
      expect(stored.some((m) => m.content === 'How many cars have I sold?')).toBe(true)
    })
  })

  it('the assistant response is also persisted to session storage', async () => {
    stubFetch(new Response(JSON.stringify({ reply: 'You sold 3 cars.' }), { status: 200 }))
    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')

    await waitFor(() => {
      const stored = loadAIConversation()
      expect(stored.some((m) => m.role === 'assistant' && m.content === 'You sold 3 cars.')).toBe(true)
    })
  })

  it('Clear removes the stored conversation and returns to the welcome state', async () => {
    saveAIConversation([{ role: 'user', content: 'Custom stored question about revenue', id: 'u1' }])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<AdminAI />)
    expect(screen.getByText('Custom stored question about revenue')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Clear'))

    expect(screen.queryByText('Custom stored question about revenue')).not.toBeInTheDocument()
    expect(screen.getByText("Hello! I'm your AI Assistant")).toBeInTheDocument()
    expect(sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)).toBeNull()
  })

  it('after Clear, a remount stays empty (does not resurrect the old conversation)', () => {
    saveAIConversation([{ role: 'user', content: 'old question', id: 'u1' }])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { unmount } = render(<AdminAI />)
    fireEvent.click(screen.getByText('Clear'))
    unmount()
    cleanup()

    render(<AdminAI />)
    expect(screen.queryByText('old question')).not.toBeInTheDocument()
    expect(screen.getByText("Hello! I'm your AI Assistant")).toBeInTheDocument()
  })

  it('a page-refresh-equivalent fresh mount restores messages written by a previous mount', () => {
    saveAIConversation([{ role: 'assistant', content: 'Restored after refresh', id: 'a1' }])
    render(<AdminAI />)
    expect(screen.getByText('Restored after refresh')).toBeInTheDocument()
  })

  it('does not crash when sessionStorage.getItem throws (storage unavailable/private browsing)', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => { throw new DOMException('SecurityError') }

    expect(() => render(<AdminAI />)).not.toThrow()
    expect(screen.getByText("Hello! I'm your AI Assistant")).toBeInTheDocument()

    Storage.prototype.getItem = original
  })

  it('does not crash when sessionStorage.setItem throws (quota exceeded)', async () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new DOMException('QuotaExceededError') }
    stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await expect(typeAndSend('a question')).resolves.not.toThrow()
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    Storage.prototype.setItem = original
  })

  it('does not log message state/content to the console during normal operation', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    stubFetch(new Response(JSON.stringify({ reply: 'You sold 3 cars.' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')
    await waitFor(() => expect(screen.getByText('You sold 3 cars.')).toBeInTheDocument())

    const messageStateLogs = consoleLogSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('Messages state updated'))
    )
    expect(messageStateLogs).toHaveLength(0)
  })
})

// Extracts and parses the `businessContext` field from the JSON body of the '/aiAssistant' call
function getSentBusinessContext(fetchSpy: ReturnType<typeof vi.fn>) {
  const call = fetchSpy.mock.calls.find((args: unknown[]) => String(args[0]).includes('/aiAssistant'))
  if (!call) return null
  const init = call[1] as RequestInit
  return JSON.parse(init.body as string).businessContext
}

const baseCarFields = {
  isOnSale: false,
  km: 10000,
  description: 'A great car with leather seats and a sunroof',
  ownerDescription: 'Owner says it runs perfectly, no issues',
  images: ['https://res.cloudinary.com/demo/image/upload/car1.jpg'],
  featured: false,
  transmission: 'automatico' as const,
  fuel: 'gasolina' as const,
  color: 'red',
}

describe('AdminAI - detailed inventory context sent to the AI', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('includes available vehicles and excludes sold ones, but keeps a car whose only sale was cancelled', async () => {
    setFirestoreFixtures({
      cars: [
        { id: 'car-1', data: { ...baseCarFields, title: 'Mazda CX-5 2023', brand: 'Mazda', model: 'CX-5', year: 2023, price: 25500 } },
        { id: 'car-2', data: { ...baseCarFields, title: 'Toyota RAV4 2022', brand: 'Toyota', model: 'RAV4', year: 2022, price: 40000 } },
        { id: 'car-3', data: { ...baseCarFields, title: 'Honda Civic 2021', brand: 'Honda', model: 'Civic', year: 2021, price: 22000 } },
      ],
      sales: [
        { id: 'sale-1', data: { carId: 'car-2', status: 'active' } },
        { id: 'sale-2', data: { carId: 'car-3', status: 'cancelled' } },
      ],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('Which cars are still available?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const vehicles = JSON.parse(context.availableVehiclesJSON) as Array<{ id: string; title: string }>
    const ids = vehicles.map((v) => v.id)

    expect(ids).toContain('car-1')
    expect(ids).toContain('car-3') // cancelled sale -> still available
    expect(ids).not.toContain('car-2') // active sale -> sold, excluded
    expect(context.soldCars).toBe(1)
    expect(context.availableCars).toBe(2)
  })

  it('preserves brand, model, year, price, featured and onSale flags for each vehicle', async () => {
    setFirestoreFixtures({
      cars: [
        { id: 'car-1', data: { ...baseCarFields, title: 'Mazda CX-5 2023', brand: 'Mazda', model: 'CX-5', year: 2023, price: 25500, featured: true, isOnSale: true } },
      ],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('Which vehicles are featured?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const [vehicle] = JSON.parse(context.availableVehiclesJSON)
    expect(vehicle).toMatchObject({
      id: 'car-1', title: 'Mazda CX-5 2023', brand: 'Mazda', model: 'CX-5',
      year: 2023, price: 25500, featured: true, onSale: true,
    })
    expect(context.featuredAvailableCars).toBe(1)
    expect(context.onSaleAvailableCars).toBe(1)
  })

  it('never includes image URLs, descriptions, seller notes, or customer data in the vehicle context', async () => {
    setFirestoreFixtures({
      cars: [{ id: 'car-1', data: { ...baseCarFields, title: 'Mazda CX-5 2023', brand: 'Mazda', model: 'CX-5', year: 2023, price: 25500 } }],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('Which cars are still available?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    expect(context.availableVehiclesJSON).not.toContain('cloudinary')
    expect(context.availableVehiclesJSON).not.toContain('leather seats')
    expect(context.availableVehiclesJSON).not.toContain('Owner says')
    expect(context.availableVehiclesJSON).not.toContain('images')
    expect(context.availableVehiclesJSON).not.toContain('description')
    expect(context.availableVehiclesJSON).not.toMatch(/buyer|email|phone/i)
  })

  it('does not crash on a malformed car document (missing id) and simply excludes it', async () => {
    setFirestoreFixtures({
      cars: [
        { id: '', data: { ...baseCarFields, title: 'Broken record', brand: 'X', model: 'Y', year: 2020, price: 1 } },
        { id: 'car-ok', data: { ...baseCarFields, title: 'Honda Civic 2021', brand: 'Honda', model: 'Civic', year: 2021, price: 22000 } },
      ],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await expect(typeAndSend('Which cars are still available?')).resolves.not.toThrow()
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const vehicles = JSON.parse(context.availableVehiclesJSON) as Array<{ id: string }>
    expect(vehicles.some((v) => v.id === 'car-ok')).toBe(true)
  })

  it('bounds the context to the max vehicle cap and reports truncation metadata', async () => {
    setFirestoreFixtures({
      cars: Array.from({ length: 160 }, (_, i) => ({
        id: `car-${i}`,
        data: { ...baseCarFields, title: `Car ${String(i).padStart(3, '0')}`, brand: 'Brand', model: 'Model', year: 2020, price: 10000 + i },
      })),
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('Which cars are still available?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const vehicles = JSON.parse(context.availableVehiclesJSON) as unknown[]
    expect(vehicles.length).toBeLessThanOrEqual(150)
    expect(context.availableVehicleCount).toBe(160)
    expect(context.vehiclesIncludedInContext).toBeLessThanOrEqual(150)
    expect(context.isInventoryTruncated).toBe(true)
  })

  it('does not duplicate a car whose id appears in more than one sale record', async () => {
    setFirestoreFixtures({
      cars: [{ id: 'car-1', data: { ...baseCarFields, title: 'Mazda CX-5 2023', brand: 'Mazda', model: 'CX-5', year: 2023, price: 25500 } }],
      sales: [
        { id: 'sale-1', data: { carId: 'car-1', status: 'active' } },
        { id: 'sale-2', data: { carId: 'car-1', status: 'active' } },
      ],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('Which cars are still available?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const vehicles = JSON.parse(context.availableVehiclesJSON) as unknown[]
    expect(vehicles).toHaveLength(0) // sold, and only counted once
    expect(context.soldCars).toBe(1)
  })
})

describe('AdminAI - accessibility', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
  })

  it('the chat input has a programmatic accessible name (fixed: was placeholder-only)', () => {
    render(<AdminAI />)
    const input = screen.getByRole('textbox', { name: 'Ask the AI Assistant a question' })
    expect(input).toHaveAttribute('id', 'admin-ai-input-field')
    expect(document.querySelectorAll('#admin-ai-input-field')).toHaveLength(1)
  })
})

describe('AdminAI - recent-sales PII minimization', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('the request body sent to the browser never contains buyer name/email/phone/address/licence, but still preserves vehicle/price/status business fields', async () => {
    setFirestoreFixtures({
      sales: [
        {
          id: 'sale-1',
          data: {
            carTitle: '2020 Toyota Camry', carBrand: 'Toyota', carModel: 'Camry', carYear: 2020,
            status: 'completed', createdAt: '2026-01-01',
            paymentPlan: { type: 'cash', salePrice: 25000, downPayment: 5000 },
            buyer: { name: 'John Doe', email: 'john@example.com', phone: '021234567', address: '123 Main St', idNumber: 'ID999', licenseNumber: 'DL123456' },
          },
        },
      ],
    })
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('What is my total revenue?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const context = getSentBusinessContext(fetchSpy)
    const raw = context.recentSalesJSON as string

    expect(raw).not.toMatch(/John Doe/)
    expect(raw).not.toMatch(/john@example\.com/)
    expect(raw).not.toMatch(/021234567/)
    expect(raw).not.toMatch(/123 Main St/)
    expect(raw).not.toMatch(/ID999/)
    expect(raw).not.toMatch(/DL123456/)
    expect(raw).not.toMatch(/buyer/i)

    const [sale] = JSON.parse(raw)
    expect(sale).toMatchObject({
      carTitle: '2020 Toyota Camry', carBrand: 'Toyota', carModel: 'Camry', carYear: 2020,
      salePrice: 25000, paymentType: 'cash', downPayment: 5000, status: 'completed',
    })
  })
})

describe('AdminAI - business context no longer reads Sales directly from client Firestore', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    setFirestoreFixtures({})
    setSalesFetchShouldFail(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
    setSalesFetchShouldFail(false)
  })

  it('does not call Firestore getDocs for the sales collection (regression: was denied by firestore.rules, causing "0 cars sold")', async () => {
    const { getDocs } = await import('firebase/firestore')
    stubFetch(new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())

    const salesCalls = vi.mocked(getDocs).mock.calls.filter(([name]) => (name as unknown as string) === 'sales')
    expect(salesCalls).toHaveLength(0)
  })

  it('shows a controlled error instead of a fabricated "0 cars" answer when the sales fetch fails (e.g. a permission error)', async () => {
    setSalesFetchShouldFail(true)
    // If getBusinessContext incorrectly swallowed the failure, this response would be sent back
    // to the chat as a real, confident answer - the assertions below prove that never happens.
    const fetchSpy = stubFetch(new Response(JSON.stringify({ reply: 'should not be reached' }), { status: 200 }))

    render(<AdminAI />)
    await typeAndSend('How many cars have I sold?')

    await waitFor(() => {
      expect(screen.getByText(/Unable to load current business data/)).toBeInTheDocument()
    })
    expect(screen.queryByText('should not be reached')).not.toBeInTheDocument()
    // The AI endpoint must never even be called once business-context loading has failed
    const aiCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes('/aiAssistant'))
    expect(aiCalls).toHaveLength(0)

    setSalesFetchShouldFail(false)
  })
})
