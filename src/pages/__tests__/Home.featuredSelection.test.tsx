import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Car } from '../../types'
import * as useCarsHook from '../../hooks/useCars'
import * as useSoldCarIdsHook from '../../hooks/useSoldCarIds'
import Home from '../Home'

vi.mock('../../hooks/useCars')
vi.mock('../../hooks/useSoldCarIds')

function makeCar(overrides: Partial<Car>): Car {
  return {
    id: 'car-1',
    title: 'Toyota Corolla 2022',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    price: 28000,
    isOnSale: false,
    km: 28000,
    description: '',
    ownerDescription: '',
    images: ['https://example.com/car.jpg'],
    featured: false,
    transmission: 'automatico',
    fuel: 'gasolina',
    color: '#ffffff',
    ...overrides,
  }
}

function mockSoldStatus(soldCarIds: Set<string> = new Set(), loading = false, error: string | null = null) {
  vi.mocked(useSoldCarIdsHook.useSoldCarIds).mockReturnValue({ soldCarIds, loading, error })
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom lacks IntersectionObserver, which framer-motion's `whileInView` needs.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

describe('Home - vehicle selection (Featured > On Sale > general fallback, max 6)', () => {
  it('root cause of the previous "only two" result: 3 featured cars existed, 1 was sold, leaving 2 - not a code bug', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', featured: true }),
      makeCar({ id: 'car-2', title: 'Mazda CX-5 2023', featured: true }),
      makeCar({ id: 'car-3', title: 'Ford Mustang 2021', featured: true }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderHome()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.getByText('Ford Mustang 2021')).toBeInTheDocument()
    expect(screen.queryByText('Mazda CX-5 2023')).not.toBeInTheDocument()
  })

  it('excludes sold vehicles entirely from the Home selection', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', featured: true }),
      makeCar({ id: 'car-2', title: 'Sold Mazda CX-5', featured: true }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderHome()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.queryByText('Sold Mazda CX-5')).not.toBeInTheDocument()
  })

  it('selects available Featured vehicles first', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Non-Featured Civic', featured: false }),
      makeCar({ id: 'car-2', title: 'Featured Corolla', featured: true }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Featured Corolla')).toBeInTheDocument())
    const cardTitles = Array.from(document.querySelectorAll('h3')).map((el) => el.textContent)
    expect(cardTitles.indexOf('Featured Corolla')).toBeLessThan(cardTitles.indexOf('Non-Featured Civic'))
  })

  it('fills remaining slots with available On Sale vehicles when there are not enough Featured', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Featured Corolla', featured: true }),
      makeCar({ id: 'car-2', title: 'On Sale Mustang', featured: false, isOnSale: true }),
      makeCar({ id: 'car-3', title: 'Plain Civic', featured: false, isOnSale: false }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Featured Corolla')).toBeInTheDocument())
    expect(screen.getByText('On Sale Mustang')).toBeInTheDocument()
    expect(screen.getByText('Plain Civic')).toBeInTheDocument()
    const cardTitles = Array.from(document.querySelectorAll('h3')).map((el) => el.textContent)
    // Featured first, then On Sale fallback, then general fallback
    expect(cardTitles.indexOf('Featured Corolla')).toBeLessThan(cardTitles.indexOf('On Sale Mustang'))
    expect(cardTitles.indexOf('On Sale Mustang')).toBeLessThan(cardTitles.indexOf('Plain Civic'))
  })

  it('never renders the same vehicle twice even if it is both featured and on sale', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Featured And On Sale', featured: true, isOnSale: true })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Featured And On Sale')).toBeInTheDocument())
    expect(screen.getAllByText('Featured And On Sale')).toHaveLength(1)
  })

  it('caps the Home result at 12 vehicles when 13 or more are available', async () => {
    const cars = Array.from({ length: 15 }, (_, i) =>
      makeCar({ id: `car-${i + 1}`, title: `Available Car ${i + 1}`, featured: false })
    )
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Available Car 1')).toBeInTheDocument())
    const rendered = cars.filter((c) => screen.queryByText(c.title) !== null)
    expect(rendered).toHaveLength(12)
    expect(new Set(rendered.map((c) => c.id)).size).toBe(12)
  })

  it('returns exactly 12 when exactly 12 vehicles are available', async () => {
    const cars = Array.from({ length: 12 }, (_, i) =>
      makeCar({ id: `car-${i + 1}`, title: `Available Car ${i + 1}`, featured: false })
    )
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Available Car 1')).toBeInTheDocument())
    const rendered = cars.filter((c) => screen.queryByText(c.title) !== null)
    expect(rendered).toHaveLength(12)
  })

  it('applies the 12-item limit only after sold exclusion, prioritization and deduplication', async () => {
    // 8 sold featured cars (must be excluded before the limit is applied) + 12 available fallback
    const soldFeatured = Array.from({ length: 8 }, (_, i) =>
      makeCar({ id: `sold-${i + 1}`, title: `Sold Featured ${i + 1}`, featured: true })
    )
    const available = Array.from({ length: 12 }, (_, i) =>
      makeCar({ id: `avail-${i + 1}`, title: `Available Car ${i + 1}`, featured: false })
    )
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [...soldFeatured, ...available], loading: false, error: null })
    mockSoldStatus(new Set(soldFeatured.map((c) => c.id)))

    renderHome()

    await waitFor(() => expect(screen.getByText('Available Car 1')).toBeInTheDocument())
    soldFeatured.forEach((c) => expect(screen.queryByText(c.title)).not.toBeInTheDocument())
    const rendered = available.filter((c) => screen.queryByText(c.title) !== null)
    expect(rendered).toHaveLength(12)
  })

  it('renders correctly with fewer than 12 available vehicles (honest smaller result, no crash)', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Only Car', featured: true })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    expect(() => renderHome()).not.toThrow()
    await waitFor(() => expect(screen.getByText('Only Car')).toBeInTheDocument())
  })

  it('shows a clear empty state with a working Browse link when zero vehicles are available', async () => {
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [], loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText(/no vehicles available/i)).toBeInTheDocument())
    expect(screen.getByText(/browse all vehicles/i).closest('a')).toHaveAttribute('href', '/cars')
  })

  it('keeps the "Featured Vehicles" heading only when every rendered car is truly featured', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Featured Corolla', featured: true }),
      makeCar({ id: 'car-2', title: 'Featured Mustang', featured: true }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Featured Vehicles')).toBeInTheDocument())
    expect(screen.getByText('Hand-picked by our team')).toBeInTheDocument()
  })

  it('uses a truthful neutral heading when fallback (non-featured) vehicles are mixed in', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Featured Corolla', featured: true }),
      makeCar({ id: 'car-2', title: 'Plain Civic', featured: false, isOnSale: false }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderHome()

    await waitFor(() => expect(screen.getByText('Plain Civic')).toBeInTheDocument())
    expect(screen.queryByText('Featured Vehicles')).not.toBeInTheDocument()
    expect(screen.getByText('Recommended Vehicles')).toBeInTheDocument()
  })

  it('does not render vehicle results while sold-status is still loading (no flash of sold cars)', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', featured: true })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(), true, null)

    renderHome()

    expect(screen.queryByText('Toyota Corolla 2022')).not.toBeInTheDocument()
  })

  it('shows a controlled error, not the raw car list, if the sold-status fetch fails', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', featured: true })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(), false, 'Unable to verify vehicle availability right now.')

    renderHome()

    await waitFor(() => expect(screen.getByText(/unable to verify vehicle availability/i)).toBeInTheDocument())
    expect(screen.queryByText('Toyota Corolla 2022')).not.toBeInTheDocument()
  })

  it('provides a View All / Browse Cars navigation action to the public Cars catalog', async () => {
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [], loading: false, error: null })
    mockSoldStatus()

    renderHome()

    const links = await screen.findAllByRole('link', { name: /explore cars|browse all cars/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/cars'))
  })
})
