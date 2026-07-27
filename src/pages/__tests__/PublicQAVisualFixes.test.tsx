import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as carsService from '../../lib/carsService'
import * as useCarsHook from '../../hooks/useCars'
import Favourites from '../Favourites'
import Home from '../Home'
import CarDetail from '../CarDetail'
import Financing from '../Financing'
import type { Car } from '../../types'

vi.mock('../../lib/carsService')
vi.mock('../../hooks/useCars')

const car: Car = {
  id: 'car-1',
  title: '2020 Toyota Camry',
  brand: 'Toyota',
  model: 'Camry',
  year: 2020,
  price: 25000,
  km: 42000,
  transmission: 'automatico',
  fuel: 'gasolina',
  color: 'Silver',
  description: '',
  ownerDescription: '',
  images: ['https://example.com/car.jpg'],
  featured: true,
  isOnSale: false,
} as unknown as Car

describe('Public QA - visual/contrast fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // framer-motion's viewport features require IntersectionObserver, which jsdom lacks
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  it('Favourites empty-state heart uses the red accent, not green', async () => {
    vi.mocked(carsService.getCars).mockResolvedValue([])
    render(
      <MemoryRouter>
        <Favourites />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('No Saved Vehicles Yet'))

    const heartSvg = document.querySelector('svg')
    expect(heartSvg?.getAttribute('stroke')).toBe('#DC2626')
    expect(heartSvg?.getAttribute('stroke')).not.toBe('#C4FF00')
  })

  it('Home Featured Vehicles heading no longer applies the green accent span to "Vehicles"', async () => {
    vi.mocked(useCarsHook.useCars).mockReturnValue({ cars: [car], loading: false, error: null })
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    const heading = await screen.findByText('Featured Vehicles')
    expect(heading.querySelector('.text-\\[\\#C4FF00\\]')).toBeNull()
    expect(document.querySelector('.text-\\[\\#C4FF00\\]')?.textContent).not.toBe('Vehicles')
  })

  it('CarDetail main price no longer uses the green price accent', async () => {
    vi.mocked(carsService.getCarById).mockResolvedValue(car)
    render(
      <MemoryRouter initialEntries={['/cars/car-1']}>
        <Routes>
          <Route path="/cars/:id" element={<CarDetail />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('$25,000'))
    const priceEl = screen.getByText('$25,000')
    expect(priceEl).toHaveStyle({ color: '#0D1B2A' })
  })

  it('Financing Loan Term label has a readable dark class/style, not clobbered by inline style override', () => {
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    const label = screen.getByText('LOAN TERM')
    const computedColor = (label as HTMLElement).style.color
    expect(computedColor).toBe('rgb(26, 26, 26)')
  })

  it('Financing inactive Application step label is readable dark grey', () => {
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    const label = screen.getByText('Application')
    expect((label as HTMLElement).style.color).toBe('rgb(118, 118, 118)')
  })

  it('Financing active Application step label becomes black (not white-on-white)', () => {
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Apply for Financing →'))

    const label = screen.getByText('Application')
    expect((label as HTMLElement).style.color).toBe('rgb(13, 27, 42)')
    expect((label as HTMLElement).style.color).not.toBe('rgb(255, 255, 255)')
  })
})
