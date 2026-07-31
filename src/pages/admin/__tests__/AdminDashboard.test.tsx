import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboard from '../AdminDashboard'
import * as salesService from '../../../lib/salesService'
import * as messagesService from '../../../lib/messagesService'
import type { Sale } from '../../../lib/salesService'
import type { Message } from '../../../lib/messagesService'

vi.mock('../../../lib/salesService')
vi.mock('../../../lib/messagesService')

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'cars'),
  getDocs: vi.fn(async () => ({ size: 3, docs: [] })),
}))
vi.mock('../../../lib/firebase', () => ({ db: {} }))

const mockAuthenticatedFetch = vi.fn()
vi.mock('../../../lib/authService', () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}))

function createSale(overrides?: Partial<Sale>): Sale {
  return {
    id: 's1',
    carId: 'car-1',
    carTitle: 'Toyota Camry',
    carBrand: 'Toyota',
    carModel: 'Camry',
    carYear: 2020,
    carColor: 'Silver',
    carImages: [],
    buyer: { name: 'Jane Doe', idNumber: 'X1', email: 'jane@example.com', phone: '555', address: '', licenseNumber: '' },
    paymentPlan: {
      type: 'financing', salePrice: 25000, downPayment: 5000, financedAmount: 20000,
      monthlyRate: 6, termMonths: 60, monthlyPayment: 400, totalPayment: 24000, totalInterest: 4000,
      firstPaymentDate: '2025-01-01',
    },
    payments: [],
    status: 'active',
    saleDate: '2025-01-01',
    notes: '',
    vehicleInfo: { vin: '', plate: '', isNZNew: true, originCountry: '', previousOwners: 0, hasMaintenanceHistory: true },
    orc: { wof: 0, registration: 0, registrationMonths: 12, grooming: 0, ownershipTransfer: 0, mechanicalInspection: 0, otherLabel: '', otherAmount: 0, orcTotal: 0, orcIncluded: false, driveAwayPrice: false },
    extraAccessories: { items: [], total: 0 },
    createdAt: { toDate: () => new Date('2025-06-01') } as unknown as Sale['createdAt'],
    ...overrides,
  }
}

function createMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'm1',
    senderName: 'John Smith',
    email: 'john@example.com',
    reason: 'purchase',
    message: 'Interested',
    read: false,
    type: 'contact',
    createdAt: { toDate: () => new Date('2025-06-01') } as unknown as Message['createdAt'],
    ...overrides,
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  )
}

describe('AdminDashboard - resilience (one data source failing must not blank the rest)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, applications: [{ status: 'pending' }] }))
    )
  })

  it('renders full stats when every data source succeeds', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([createSale()])
    vi.mocked(messagesService.getMessages).mockResolvedValue([createMessage()])

    const { container } = renderDashboard()

    await waitFor(() => {
      const carsCard = container.querySelector('#admin-dashboard-stat-card-1')
      expect(carsCard?.textContent).toContain('3')
    })

    const salesCard = container.querySelector('#admin-dashboard-stat-card-2')
    expect(salesCard?.textContent).toContain('1')
  })

  it('a Messages fetch failure does not reset Cars/Sales/Financing stats to zero', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([createSale(), createSale({ id: 's2' })])
    vi.mocked(messagesService.getMessages).mockRejectedValue(new Error('Messages unavailable'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = renderDashboard()

    await waitFor(() => {
      const salesCard = container.querySelector('#admin-dashboard-stat-card-2')
      expect(salesCard?.textContent).toContain('2')
    })

    // Cars metric (from the unrelated, still-successful Firestore getDocs call) must also
    // still be correct - not reset to zero by the unrelated Messages rejection.
    const carsCard = container.querySelector('#admin-dashboard-stat-card-1')
    expect(carsCard?.textContent).toContain('3')

    expect(errorSpy).toHaveBeenCalledWith('Dashboard: failed to load messages:', expect.any(Error))
    errorSpy.mockRestore()
  })

  it('a Sales fetch failure does not prevent Cars/Financing stats or Messages from rendering', async () => {
    vi.mocked(salesService.getSales).mockRejectedValue(new Error('Sales unavailable'))
    vi.mocked(messagesService.getMessages).mockResolvedValue([createMessage()])
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = renderDashboard()

    await waitFor(() => {
      const carsCard = container.querySelector('#admin-dashboard-stat-card-1')
      expect(carsCard?.textContent).toContain('3')
    })

    // Sales-derived stat falls back to 0 rather than crashing the whole dashboard.
    const salesCard = container.querySelector('#admin-dashboard-stat-card-2')
    expect(salesCard?.textContent).toContain('0')

    expect(errorSpy).toHaveBeenCalledWith('Dashboard: failed to load sales:', expect.any(Error))
    errorSpy.mockRestore()
  })

  it('a Financing fetch failure does not blank Cars/Sales stats', async () => {
    vi.mocked(salesService.getSales).mockResolvedValue([createSale()])
    vi.mocked(messagesService.getMessages).mockResolvedValue([])
    mockAuthenticatedFetch.mockRejectedValue(new Error('Financing unavailable'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = renderDashboard()

    await waitFor(() => {
      const salesCard = container.querySelector('#admin-dashboard-stat-card-2')
      expect(salesCard?.textContent).toContain('1')
    })

    const carsCard = container.querySelector('#admin-dashboard-stat-card-1')
    expect(carsCard?.textContent).toContain('3')

    expect(errorSpy).toHaveBeenCalledWith('Dashboard: failed to load financing:', expect.any(Error))
    errorSpy.mockRestore()
  })
})
