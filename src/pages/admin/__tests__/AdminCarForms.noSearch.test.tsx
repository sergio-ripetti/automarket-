import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminAddCar from '../AdminAddCar'
import AdminEditCar from '../AdminEditCar'
import * as adminCarsService from '../../../lib/adminCarsService'

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { getIdToken: vi.fn(() => 'mock-token') } })),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({
        title: '2020 Toyota Camry',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: '#ffffff',
        price: 25000,
        km: 50000,
        transmission: 'automatico',
        fuel: 'gasolina',
        description: 'Great condition',
        ownerDescription: 'Well maintained',
        images: ['https://example.com/img.jpg'],
        featured: false,
        isOnSale: false,
      }),
    })
  ),
}))

vi.mock('../../../lib/firebase', () => ({
  db: {},
}))

vi.spyOn(adminCarsService, 'createCar').mockResolvedValue({ success: true, id: 'car-123' })
vi.spyOn(adminCarsService, 'updateCar').mockResolvedValue({ success: true })

const fetchSpy = vi.spyOn(globalThis, 'fetch')

describe('Inventory manual vehicle form (search removed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AdminAddCar', () => {
    it('does not render the vehicle-database search UI', () => {
      render(
        <MemoryRouter>
          <AdminAddCar />
        </MemoryRouter>
      )

      expect(screen.queryByText(/search vehicle database/i)).toBeNull()
      expect(screen.queryByText(/search api/i)).toBeNull()
      expect(screen.queryByText(/or fill manually/i)).toBeNull()
    })

    it('renders the manual form fields directly', () => {
      render(
        <MemoryRouter>
          <AdminAddCar />
        </MemoryRouter>
      )

      expect(screen.getByText('Add New Vehicle')).toBeTruthy()
      expect(screen.getByPlaceholderText('Toyota Corolla 2022')).toBeTruthy()
      expect(screen.getByPlaceholderText('Toyota')).toBeTruthy()
      expect(screen.getByPlaceholderText('Corolla')).toBeTruthy()
      expect(screen.getByPlaceholderText('2022')).toBeTruthy()
    })

    it('never calls the /api/cardata endpoint or an external vehicle provider', () => {
      render(
        <MemoryRouter>
          <AdminAddCar />
        </MemoryRouter>
      )

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('AdminEditCar', () => {
    it('does not render the vehicle-database search UI', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/cars/car-123/edit']}>
          <Routes>
            <Route path="/admin/cars/:id/edit" element={<AdminEditCar />} />
          </Routes>
        </MemoryRouter>
      )

      expect(await screen.findByText('Edit Vehicle')).toBeTruthy()
      expect(screen.queryByText(/search vehicle database/i)).toBeNull()
      expect(screen.queryByText(/update technical details from api/i)).toBeNull()
      expect(screen.queryByText(/search api/i)).toBeNull()
      expect(screen.queryByText(/or fill manually/i)).toBeNull()
    })

    it('renders existing values in the manual form', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/cars/car-123/edit']}>
          <Routes>
            <Route path="/admin/cars/:id/edit" element={<AdminEditCar />} />
          </Routes>
        </MemoryRouter>
      )

      expect(await screen.findByDisplayValue('2020 Toyota Camry')).toBeTruthy()
      expect(screen.getByDisplayValue('Toyota')).toBeTruthy()
      expect(screen.getByDisplayValue('Camry')).toBeTruthy()
    })

    it('never calls the /api/cardata endpoint or an external vehicle provider', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/cars/car-123/edit']}>
          <Routes>
            <Route path="/admin/cars/:id/edit" element={<AdminEditCar />} />
          </Routes>
        </MemoryRouter>
      )

      await screen.findByText('Edit Vehicle')
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
