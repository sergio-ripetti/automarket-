import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CarCard from '../CarCard'
import type { Car } from '../../types'

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

function renderCard(car: Car) {
  return render(
    <MemoryRouter>
      <CarCard car={car} />
    </MemoryRouter>
  )
}

describe('CarCard - public vehicle status badges', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the SALE badge with the approved semantic label when the vehicle is on sale', () => {
    renderCard(makeCar({ isOnSale: true }))
    expect(screen.getByText('SALE')).toBeInTheDocument()
  })

  it('renders the FEATURED badge with the approved semantic label when the vehicle is featured', () => {
    renderCard(makeCar({ featured: true }))
    expect(screen.getByText('FEATURED')).toBeInTheDocument()
  })

  it('renders both SALE and FEATURED together without duplicating either label', () => {
    renderCard(makeCar({ isOnSale: true, featured: true }))
    expect(screen.getAllByText('SALE')).toHaveLength(1)
    expect(screen.getAllByText('FEATURED')).toHaveLength(1)
  })

  it('renders no status badge for an available, non-sale, non-featured vehicle', () => {
    renderCard(makeCar({}))
    expect(screen.queryByText('SALE')).not.toBeInTheDocument()
    expect(screen.queryByText('FEATURED')).not.toBeInTheDocument()
  })

  it('marks the badge icons as decorative (aria-hidden), relying on visible text for meaning', () => {
    const { container } = renderCard(makeCar({ isOnSale: true, featured: true }))
    const decorativeIcons = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(decorativeIcons.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render an admin-only status such as SOLD or NOT AVAILABLE on the public card', () => {
    renderCard(makeCar({}))
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
    expect(screen.queryByText('NOT AVAILABLE')).not.toBeInTheDocument()
  })
})
