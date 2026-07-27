import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as carsService from '../../lib/carsService'
import * as messagesService from '../../lib/messagesService'
import CarDetail from '../CarDetail'
import type { Car } from '../../types'

vi.mock('../../lib/carsService')
vi.mock('../../lib/messagesService')

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
  featured: false,
  isOnSale: false,
} as unknown as Car

function renderCarDetail() {
  return render(
    <MemoryRouter initialEntries={['/cars/car-1']}>
      <Routes>
        <Route path="/cars/:id" element={<CarDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CarDetail - offer submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsService.getCarById).mockResolvedValue(car)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('reaches submitPublicMessage with a valid offer payload', async () => {
    vi.mocked(messagesService.submitPublicMessage).mockResolvedValue({ success: true })
    renderCarDetail()

    await waitFor(() => screen.getByText("I'm Interested / Make an Offer"))
    fireEvent.click(screen.getByText("I'm Interested / Make an Offer"))

    await waitFor(() => screen.getByPlaceholderText('John'))
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('+64 21 123 4567'), { target: { value: '0211234567' } })
    fireEvent.change(screen.getByPlaceholderText('32000'), { target: { value: '20000' } })

    fireEvent.click(screen.getByText('Send My Offer →'))

    await waitFor(() => {
      expect(messagesService.submitPublicMessage).toHaveBeenCalledTimes(1)
    })
    expect(messagesService.submitPublicMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'offer', carId: 'car-1', offerPrice: 20000 })
    )
  })

  it('shows visible error feedback (not console-only) when the offer submission fails', async () => {
    vi.mocked(messagesService.submitPublicMessage).mockResolvedValue({ success: false, error: 'Backend error' })
    renderCarDetail()

    await waitFor(() => screen.getByText("I'm Interested / Make an Offer"))
    fireEvent.click(screen.getByText("I'm Interested / Make an Offer"))

    await waitFor(() => screen.getByPlaceholderText('John'))
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('+64 21 123 4567'), { target: { value: '0211234567' } })
    fireEvent.change(screen.getByPlaceholderText('32000'), { target: { value: '20000' } })

    fireEvent.click(screen.getByText('Send My Offer →'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled()
    })
  })
})
