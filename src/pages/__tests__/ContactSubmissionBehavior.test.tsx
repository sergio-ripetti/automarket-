import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as messagesService from '../../lib/messagesService'
import Contact from '../Contact'

vi.mock('../../lib/messagesService')

describe('Contact - submission behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('reaches submitPublicMessage with a valid contact payload', async () => {
    vi.mocked(messagesService.submitPublicMessage).mockResolvedValue({ success: true })
    render(<Contact />)

    fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('021 123 4567'), { target: { value: '0211234567' } })
    fireEvent.change(screen.getByPlaceholderText('Tell us how we can help you...'), {
      target: { value: 'This is a valid test message for contact.' },
    })
    const select = document.querySelector('select')!
    fireEvent.change(select, { target: { value: 'other' } })

    fireEvent.click(screen.getByText('Send Message →'))

    await waitFor(() => {
      expect(messagesService.submitPublicMessage).toHaveBeenCalledTimes(1)
    })
    expect(messagesService.submitPublicMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'contact', email: 'jane@example.com' })
    )
  })

  it('shows an inline/toast error when submission fails (not console-only)', async () => {
    vi.mocked(messagesService.submitPublicMessage).mockResolvedValue({ success: false, error: 'Backend error' })
    render(<Contact />)

    fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('021 123 4567'), { target: { value: '0211234567' } })
    fireEvent.change(screen.getByPlaceholderText('Tell us how we can help you...'), {
      target: { value: 'This is a valid test message for contact.' },
    })
    const select = document.querySelector('select')!
    fireEvent.change(select, { target: { value: 'other' } })

    fireEvent.click(screen.getByText('Send Message →'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled()
    })
  })
})
