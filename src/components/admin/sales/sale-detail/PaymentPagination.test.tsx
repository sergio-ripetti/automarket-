import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentPagination } from './PaymentPagination'

describe('PaymentPagination', () => {
  it('returns null when totalPages <= 1', () => {
    const { container } = render(
      <PaymentPagination currentPage={0} totalPages={1} onPageChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders pagination controls for multiple pages', () => {
    render(
      <PaymentPagination currentPage={0} totalPages={5} onPageChange={vi.fn()} />
    )
    expect(screen.getByLabelText('Previous payments page')).toBeInTheDocument()
    expect(screen.getByLabelText('Next payments page')).toBeInTheDocument()
  })

  it('disables Previous button on first page', () => {
    render(
      <PaymentPagination currentPage={0} totalPages={5} onPageChange={vi.fn()} />
    )
    const prevButton = screen.getByLabelText('Previous payments page')
    expect(prevButton).toBeDisabled()
  })

  it('enables Previous button when not on first page', () => {
    render(
      <PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />
    )
    const prevButton = screen.getByLabelText('Previous payments page')
    expect(prevButton).not.toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(
      <PaymentPagination currentPage={4} totalPages={5} onPageChange={vi.fn()} />
    )
    const nextButton = screen.getByLabelText('Next payments page')
    expect(nextButton).toBeDisabled()
  })

  it('enables Next button when not on last page', () => {
    render(
      <PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />
    )
    const nextButton = screen.getByLabelText('Next payments page')
    expect(nextButton).not.toBeDisabled()
  })

  it('calls onPageChange with correct page on Previous click', () => {
    const onPageChange = vi.fn()
    render(
      <PaymentPagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByLabelText('Previous payments page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange with correct page on Next click', () => {
    const onPageChange = vi.fn()
    render(
      <PaymentPagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByLabelText('Next payments page'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('renders page number buttons', () => {
    render(
      <PaymentPagination currentPage={0} totalPages={5} onPageChange={vi.fn()} />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('marks current page button with aria-current', () => {
    render(
      <PaymentPagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    )
    const page2Button = screen.getByText('2')
    expect(page2Button).toHaveAttribute('aria-current', 'page')
  })

  it('calls onPageChange when page number clicked', () => {
    const onPageChange = vi.fn()
    render(
      <PaymentPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows correct number of page buttons with window of 5', () => {
    render(
      <PaymentPagination currentPage={0} totalPages={10} onPageChange={vi.fn()} />
    )
    // Should show pages 1, 2, 3, 4, 5 (indices 0-4)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('limits page window to 5 buttons in middle of range', () => {
    render(
      <PaymentPagination currentPage={5} totalPages={20} onPageChange={vi.fn()} />
    )
    // When on page 6, should center the window
    const buttons = screen.getAllByLabelText(/Go to payments page/)
    expect(buttons.length).toBeLessThanOrEqual(5)
  })

  it('shifts page window at end of range', () => {
    render(
      <PaymentPagination currentPage={18} totalPages={20} onPageChange={vi.fn()} />
    )
    // When near the end, should show last 5 pages
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  describe('visual consistency (Sales visual pass)', () => {
    it('renders a visible previous arrow icon (Lucide svg, not a text character)', () => {
      render(<PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const prevButton = screen.getByLabelText('Previous payments page')
      expect(prevButton.querySelector('svg')).toBeInTheDocument()
    })

    it('renders a visible next arrow icon (Lucide svg, not a text character)', () => {
      render(<PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const nextButton = screen.getByLabelText('Next payments page')
      expect(nextButton.querySelector('svg')).toBeInTheDocument()
    })

    it('disabled Previous arrow still renders its icon (not blank)', () => {
      render(<PaymentPagination currentPage={0} totalPages={5} onPageChange={vi.fn()} />)
      const prevButton = screen.getByLabelText('Previous payments page')
      expect(prevButton).toBeDisabled()
      expect(prevButton.querySelector('svg')).toBeInTheDocument()
    })

    it('disabled Next arrow still renders its icon (not blank)', () => {
      render(<PaymentPagination currentPage={4} totalPages={5} onPageChange={vi.fn()} />)
      const nextButton = screen.getByLabelText('Next payments page')
      expect(nextButton).toBeDisabled()
      expect(nextButton.querySelector('svg')).toBeInTheDocument()
    })

    it('active page number has a dark background and white text (readable selected state)', () => {
      render(<PaymentPagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
      const activePage = screen.getByText('2')
      expect(activePage.style.backgroundColor).toBe('rgb(26, 26, 26)')
      expect(activePage.style.color).toBe('rgb(255, 255, 255)')
    })

    it('inactive page number has a light background and dark text (readable)', () => {
      render(<PaymentPagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
      const inactivePage = screen.getByText('1')
      expect(inactivePage.style.backgroundColor).not.toBe('rgb(26, 26, 26)')
      expect(inactivePage.style.color).toBe('rgb(26, 26, 26)')
    })

    it('shows an explicit "Previous" text label next to the arrow (not an icon-only/dot-like control)', () => {
      render(<PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const prevButton = screen.getByLabelText('Previous payments page')
      expect(prevButton).toHaveTextContent('Previous')
    })

    it('shows an explicit "Next" text label next to the arrow (not an icon-only/dot-like control)', () => {
      render(<PaymentPagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />)
      const nextButton = screen.getByLabelText('Next payments page')
      expect(nextButton).toHaveTextContent('Next')
    })
  })
})

