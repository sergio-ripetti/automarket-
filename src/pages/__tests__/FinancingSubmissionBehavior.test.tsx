import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as financingService from '../../lib/financingService'
import Financing from '../Financing'

vi.mock('../../lib/financingService')

function goToStep2() {
  fireEvent.click(screen.getByText('Apply for Financing →'))
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
  fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Doe' } })
  fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('+64 21 123 4567'), { target: { value: '0211234567' } })
  fireEvent.change(screen.getByPlaceholderText('A12345678'), { target: { value: 'AB12345' } })
  fireEvent.change(screen.getByPlaceholderText('5,000'), { target: { value: '5000' } })
  fireEvent.change(screen.getByPlaceholderText('e.g., ABC Corp'), { target: { value: 'Acme Corp' } })
  fireEvent.change(screen.getByPlaceholderText('e.g., Manager'), { target: { value: 'Engineer' } })
  fireEvent.change(screen.getByPlaceholderText('e.g., 3'), { target: { value: '3' } })
  fireEvent.change(screen.getByPlaceholderText('2,000'), { target: { value: '2000' } })
  fireEvent.click(screen.getByText(/I consent to a credit history check/))
}

describe('Financing - submission behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('reaches the backend service with a valid application', async () => {
    vi.mocked(financingService.submitFinancingApplication).mockResolvedValue({ success: true })
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    goToStep2()
    await waitFor(() => screen.getByPlaceholderText('John'))
    fillRequiredFields()

    fireEvent.click(screen.getByText('Submit Application →'))

    await waitFor(() => {
      expect(financingService.submitFinancingApplication).toHaveBeenCalledTimes(1)
    })
    const payload = vi.mocked(financingService.submitFinancingApplication).mock.calls[0][0]
    expect(payload.firstName).toBe('Jane')
    expect(payload.documents).toEqual([])
  })

  it('shows readable UI feedback (not a duplicated error string) on backend failure', async () => {
    vi.mocked(financingService.submitFinancingApplication).mockResolvedValue({
      success: false,
      error: 'Failed to submit financing application',
    })
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    goToStep2()
    await waitFor(() => screen.getByPlaceholderText('John'))
    fillRequiredFields()

    fireEvent.click(screen.getByText('Submit Application →'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled()
    })
    const alertMessage = vi.mocked(window.alert).mock.calls[0][0] as string
    // Must not contain the duplicated phrasing "Failed to submit application: Failed to submit..."
    expect(alertMessage.match(/Failed to submit/g)?.length ?? 0).toBeLessThanOrEqual(1)
  })

  it('does not send a malformed document array when no valid files were uploaded', async () => {
    vi.mocked(financingService.submitFinancingApplication).mockResolvedValue({ success: true })
    render(
      <MemoryRouter>
        <Financing />
      </MemoryRouter>
    )

    goToStep2()
    await waitFor(() => screen.getByPlaceholderText('John'))
    fillRequiredFields()

    fireEvent.click(screen.getByText('Submit Application →'))

    await waitFor(() => {
      expect(financingService.submitFinancingApplication).toHaveBeenCalledTimes(1)
    })
    const payload = vi.mocked(financingService.submitFinancingApplication).mock.calls[0][0]
    expect(Array.isArray(payload.documents)).toBe(true)
    payload.documents.forEach((doc) => {
      expect(doc).toBeTruthy()
      expect(typeof doc.filename).toBe('string')
    })
  })
})
