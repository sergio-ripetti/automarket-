import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentProgressSummary } from './PaymentProgressSummary'

describe('PaymentProgressSummary', () => {
  it('renders progress bar', () => {
    const { container } = render(
      <PaymentProgressSummary paidCount={3} totalPayments={10} pendingCount={7} remaining={70000} />
    )
    const progressBar = container.querySelector('#admin-sales-payment-progress')
    expect(progressBar).toBeInTheDocument()
  })

  it('displays progress text', () => {
    render(
      <PaymentProgressSummary paidCount={3} totalPayments={10} pendingCount={7} remaining={70000} />
    )
    expect(screen.getByText('3 of 10 payments completed')).toBeInTheDocument()
  })

  it('displays summary stats', () => {
    render(
      <PaymentProgressSummary paidCount={3} totalPayments={10} pendingCount={7} remaining={70000} />
    )
    expect(screen.getByText(/3 payments completed · 7 pending · \$70,000 remaining/)).toBeInTheDocument()
  })

  it('calculates progress percentage correctly', () => {
    const { container } = render(
      <PaymentProgressSummary paidCount={5} totalPayments={10} pendingCount={5} remaining={50000} />
    )
    const filledBar = container.querySelector('#admin-sales-payment-progress div')
    expect(filledBar).toHaveStyle({ width: '50%' })
  })

  it('handles all payments paid', () => {
    render(
      <PaymentProgressSummary paidCount={10} totalPayments={10} pendingCount={0} remaining={0} />
    )
    expect(screen.getByText('10 of 10 payments completed')).toBeInTheDocument()
    expect(screen.getByText(/10 payments completed · 0 pending · \$0 remaining/)).toBeInTheDocument()
  })

  it('handles no payments paid', () => {
    render(
      <PaymentProgressSummary paidCount={0} totalPayments={10} pendingCount={10} remaining={100000} />
    )
    expect(screen.getByText('0 of 10 payments completed')).toBeInTheDocument()
  })

  it('formats currency correctly', () => {
    render(
      <PaymentProgressSummary paidCount={1} totalPayments={10} pendingCount={9} remaining={45000} />
    )
    expect(screen.getByText(/\$45,000 remaining/)).toBeInTheDocument()
  })
})
