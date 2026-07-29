import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Car } from '../../../types'
import type { Sale } from '../../../lib/salesService'
import * as salesService from '../../../lib/salesService'
import * as useCarsHook from '../../../hooks/useCars'
import AdminCars from '../AdminCars'

vi.mock('../../../hooks/useCars')
vi.mock('../../../lib/salesService', async () => {
  const actual = await vi.importActual<typeof salesService>('../../../lib/salesService')
  return { ...actual, getSales: vi.fn() }
})
vi.mock('../../../lib/adminCarsService')

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

function makeSale(overrides: Partial<Sale>): Sale {
  return { carId: 'car-1', status: 'active', ...overrides } as unknown as Sale
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminCars />
    </MemoryRouter>
  )
}

describe('AdminCars - Inventory sold status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a SOLD badge for a vehicle with an active sale, and none for an available vehicle', async () => {
    const soldCar = makeCar({ id: 'car-sold', title: 'Mazda CX-5 2023' })
    const availableCar = makeCar({ id: 'car-available', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [soldCar, availableCar], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-sold', status: 'active' })])

    renderPage()

    await waitFor(() => expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument())
    const soldCardTitle = screen.getByText('Mazda CX-5 2023')
    const soldCard = soldCardTitle.closest('.admin-inventory-card')
    const availableCardTitle = screen.getByText('Toyota Corolla 2022')
    const availableCard = availableCardTitle.closest('.admin-inventory-card')

    expect(soldCard).not.toBeNull()
    expect(availableCard).not.toBeNull()
    await waitFor(() => {
      expect(soldCard!.textContent).toContain('SOLD')
    })
    expect(availableCard!.textContent).not.toContain('SOLD')
  })

  it('a cancelled sale does not mark the vehicle as sold', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'cancelled' })])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    const card = screen.getByText('Toyota Corolla 2022').closest('.admin-inventory-card')
    expect(card!.textContent).not.toContain('SOLD')
  })

  it('empty Sales collection treats every car as available (no crash, no badge)', async () => {
    const car = makeCar({ id: 'car-1' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
  })

  it('a failed Sales fetch does not crash the page and does not mark any car sold', async () => {
    const car = makeCar({ id: 'car-1' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockRejectedValue(new Error('network error'))

    expect(() => renderPage()).not.toThrow()
    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify sold status/i)
  })

  describe('status filter', () => {
    async function setup() {
      const sold = makeCar({ id: 'car-sold', title: 'Mazda CX-5 2023', featured: true, isOnSale: true })
      const available = makeCar({ id: 'car-available', title: 'Toyota Corolla 2022', featured: true })
      vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [sold, available], loading: false, error: null })
      vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-sold', status: 'completed' })])
      renderPage()
      await waitFor(() => expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument())
    }

    it('All Vehicles shows both available and sold cars', async () => {
      await setup()
      expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument()
      expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument()
    })

    it('Available filter excludes sold cars', async () => {
      await setup()
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'available' } })
      expect(screen.queryByText('Mazda CX-5 2023')).not.toBeInTheDocument()
      expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument()
    })

    it('Sold filter excludes available cars', async () => {
      await setup()
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'sold' } })
      expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument()
      expect(screen.queryByText('Toyota Corolla 2022')).not.toBeInTheDocument()
    })

    it('clearing the status filter (back to All Vehicles) restores all cars', async () => {
      await setup()
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'sold' } })
      expect(screen.queryByText('Toyota Corolla 2022')).not.toBeInTheDocument()
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'all' } })
      expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument()
      expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument()
    })

    it('Sold + Featured Only combines to show only sold featured vehicles', async () => {
      await setup()
      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'sold' } })
      fireEvent.click(screen.getByText('Featured Only'))
      expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument()
      expect(screen.queryByText('Toyota Corolla 2022')).not.toBeInTheDocument()
    })

    it('Available + On Sale Only combines to show only available discounted vehicles', async () => {
      const sold = makeCar({ id: 'car-sold', title: 'Mazda CX-5 2023', isOnSale: true })
      const availableOnSale = makeCar({ id: 'car-avail-sale', title: 'Ford Mustang 2021', isOnSale: true })
      const availablePlain = makeCar({ id: 'car-avail-plain', title: 'Honda Civic 2020', isOnSale: false })
      vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [sold, availableOnSale, availablePlain], loading: false, error: null })
      vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-sold', status: 'active' })])
      renderPage()
      await waitFor(() => expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument())

      fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'available' } })
      fireEvent.click(screen.getByText('On Sale Only'))

      expect(screen.getByText('Ford Mustang 2021')).toBeInTheDocument()
      expect(screen.queryByText('Mazda CX-5 2023')).not.toBeInTheDocument()
      expect(screen.queryByText('Honda Civic 2020')).not.toBeInTheDocument()
    })
  })

  it('the SOLD badge remains correct after a re-render (refresh simulation)', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'active' })])

    const { rerender } = renderPage()
    await waitFor(() => {
      const card = screen.getByText('Toyota Corolla 2022').closest('.admin-inventory-card')
      expect(card!.textContent).toContain('SOLD')
    })

    rerender(
      <MemoryRouter>
        <AdminCars />
      </MemoryRouter>
    )

    await waitFor(() => {
      const card = screen.getByText('Toyota Corolla 2022').closest('.admin-inventory-card')
      expect(card!.textContent).toContain('SOLD')
    })
  })
})

describe('AdminCars - Status badge system (SALE / FEATURED / NOT AVAILABLE)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the SALE badge for an on-sale vehicle', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', isOnSale: true })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.getByText('SALE')).toBeInTheDocument()
  })

  it('renders the FEATURED badge for a featured vehicle', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', featured: true })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.getByText('FEATURED')).toBeInTheDocument()
  })

  it('renders NOT AVAILABLE alongside the SOLD ribbon for a sold vehicle', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'active' })])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(await screen.findByText('SOLD')).toBeInTheDocument()
    expect(screen.getByText('NOT AVAILABLE')).toBeInTheDocument()
  })

  it('an available vehicle renders neither SOLD nor NOT AVAILABLE', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
    expect(screen.queryByText('NOT AVAILABLE')).not.toBeInTheDocument()
  })

  it('a sold, on-sale, featured vehicle renders all four status labels once each, without duplicates', async () => {
    const car = makeCar({ id: 'car-1', title: 'Mazda CX-5 2023', isOnSale: true, featured: true })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'completed' })])

    renderPage()

    await waitFor(() => expect(screen.getByText('Mazda CX-5 2023')).toBeInTheDocument())
    expect(screen.getAllByText('SOLD')).toHaveLength(1)
    expect(screen.getAllByText('SALE')).toHaveLength(1)
    expect(screen.getAllByText('FEATURED')).toHaveLength(1)
    expect(screen.getAllByText('NOT AVAILABLE')).toHaveLength(1)
  })

  it('decorative badge icons are hidden from assistive technology', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022', isOnSale: true, featured: true })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'active' })])

    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    const badgeIcons = container.querySelectorAll('svg[aria-hidden="true"]')
    // Tag, Star, and Ban icons for SALE/FEATURED/NOT AVAILABLE must all be marked decorative -
    // the visible text label is what conveys meaning to screen readers.
    expect(badgeIcons.length).toBeGreaterThanOrEqual(3)
  })

  it('sold vehicles still render working Edit and Delete actions', async () => {
    const car = makeCar({ id: 'car-1', title: 'Toyota Corolla 2022' })
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    vi.mocked(salesService.getSales).mockResolvedValue([makeSale({ carId: 'car-1', status: 'active' })])

    renderPage()

    await waitFor(() => expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument())
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
