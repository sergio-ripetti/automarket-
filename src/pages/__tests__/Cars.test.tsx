import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Car } from '../../types'
import * as useCarsHook from '../../hooks/useCars'
import * as useSoldCarIdsHook from '../../hooks/useSoldCarIds'
import Cars from '../Cars'

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

function renderCars() {
  return render(
    <MemoryRouter>
      <Cars />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Cars (public catalog) - sold-vehicle exclusion', () => {
  it('excludes a sold vehicle (the "sold Mazda" scenario) from the catalog', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Available Corolla' }),
      makeCar({ id: 'car-2', title: 'Sold Mazda CX-5', brand: 'Mazda', model: 'CX-5' }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderCars()

    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())
    expect(screen.queryByText('Sold Mazda CX-5')).not.toBeInTheDocument()
  })

  it('shows available vehicles normally', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Available Corolla' })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderCars()

    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())
  })

  it('searching for the sold vehicle by name never reintroduces it', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Available Corolla' }),
      makeCar({ id: 'car-2', title: 'Sold Mazda CX-5', brand: 'Mazda', model: 'CX-5' }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderCars()
    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText('Search by brand, model or title...')
    fireEvent.change(searchInput, { target: { value: 'Mazda CX 5' } })

    await waitFor(() => {
      expect(screen.getByText('No vehicles found matching your criteria')).toBeInTheDocument()
    })
    expect(screen.queryByText('Sold Mazda CX-5')).not.toBeInTheDocument()
  })

  it('clearing filters still excludes the sold vehicle', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Available Corolla' }),
      makeCar({ id: 'car-2', title: 'Sold Mazda CX-5', brand: 'Mazda', model: 'CX-5' }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderCars()
    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText('Search by brand, model or title...')
    fireEvent.change(searchInput, { target: { value: 'Corolla' } })
    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())
    fireEvent.change(searchInput, { target: { value: '' } })

    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())
    expect(screen.queryByText('Sold Mazda CX-5')).not.toBeInTheDocument()
  })

  it('a cancelled-sale vehicle (not sold) remains visible in the catalog', async () => {
    // getSoldCarIds already excludes cancelled sales - simulated here by simply not including
    // the car's id in soldCarIds, which is exactly what the shared helper would produce.
    const cars = [makeCar({ id: 'car-1', title: 'Formerly Reserved Corolla' })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set())

    renderCars()

    await waitFor(() => expect(screen.getByText('Formerly Reserved Corolla')).toBeInTheDocument())
  })

  it('the result count reflects only available vehicles, not the full catalog', async () => {
    const cars = [
      makeCar({ id: 'car-1', title: 'Available Corolla' }),
      makeCar({ id: 'car-2', title: 'Sold Mazda CX-5' }),
    ]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(['car-2']))

    renderCars()
    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText('Search by brand, model or title...')
    fireEvent.change(searchInput, { target: { value: 'a' } })

    await waitFor(() => {
      const heading = document.querySelector('h2')
      expect(heading?.textContent).toContain('1')
      expect(heading?.textContent).toContain('vehicles found')
    })
    expect(screen.queryByText('Sold Mazda CX-5')).not.toBeInTheDocument()
  })

  it('does not render vehicle results while sold-status is still loading', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Available Corolla' })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(), true, null)

    renderCars()

    expect(screen.queryByText('Available Corolla')).not.toBeInTheDocument()
  })

  it('shows a controlled error instead of the raw car list if sold-status fails to load', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Available Corolla' })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus(new Set(), false, 'Unable to verify vehicle availability right now.')

    renderCars()

    await waitFor(() => expect(screen.getByText(/unable to verify vehicle availability/i)).toBeInTheDocument())
    expect(screen.queryByText('Available Corolla')).not.toBeInTheDocument()
  })

  it('renders the public SALE and FEATURED badges correctly on available vehicles', async () => {
    const cars = [makeCar({ id: 'car-1', title: 'Available Corolla', isOnSale: true, featured: true })]
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars, loading: false, error: null })
    mockSoldStatus()

    renderCars()

    await waitFor(() => expect(screen.getByText('Available Corolla')).toBeInTheDocument())
    expect(screen.getByText('SALE')).toBeInTheDocument()
    expect(screen.getByText('FEATURED')).toBeInTheDocument()
  })
})
