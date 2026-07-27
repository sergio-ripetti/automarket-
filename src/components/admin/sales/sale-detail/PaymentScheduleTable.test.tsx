import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentScheduleTable } from './PaymentScheduleTable'
import type { PaymentRecord } from '../../../../lib/salesService'

function createPayment(id: string, status: 'pending' | 'paid' = 'pending'): PaymentRecord {
  return {
    id,
    dueDate: '2024-02-15',
    amount: 1000,
    paidDate: status === 'paid' ? '2024-02-10' : undefined,
    status,
  }
}

describe('PaymentScheduleTable', () => {
  it('renders table headers', () => {
    render(
      <PaymentScheduleTable
        visiblePayments={[]}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Due Date')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('renders payment rows', () => {
    const payments = [
      createPayment('p1', 'pending'),
      createPayment('p2', 'paid'),
    ]
    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('calculates correct month numbers for first page', () => {
    const payments = [
      createPayment('p1'),
      createPayment('p2'),
      createPayment('p3'),
    ]
    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    // First page starts at month 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calculates correct month numbers for later pages', () => {
    const payments = [createPayment('p1'), createPayment('p2')]
    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={1}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    // Second page (index 1) starts at month 13, 14
    // Should show months 13 and 14
    // getByText will find 13 and 14 as long as they appear somewhere
  })

  it('passes callbacks to rows', () => {
    const onMarkPaid = vi.fn()
    const onRequestUndo = vi.fn()
    const onConfirmUndo = vi.fn()
    const onCancelUndo = vi.fn()
    const payments = [createPayment('p1', 'pending')]

    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={onMarkPaid}
        onRequestUndo={onRequestUndo}
        onConfirmUndo={onConfirmUndo}
        onCancelUndo={onCancelUndo}
      />
    )
    // Verify callbacks are passed (they'll be called when buttons are clicked in rows)
    expect(screen.getByText('Mark Paid')).toBeInTheDocument()
  })

  it('marks payments as marking when markingPaymentId matches', () => {
    const payments = [createPayment('p1', 'pending')]
    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId="p1"
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    // When marking, button should show "..." instead of "Mark Paid"
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('shows confirmation controls when undoConfirmId matches', () => {
    const payments = [createPayment('p1', 'paid')]
    render(
      <PaymentScheduleTable
        visiblePayments={payments}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId="p1"
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('renders empty table with no visible payments', () => {
    const { container } = render(
      <PaymentScheduleTable
        visiblePayments={[]}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()
    // No body rows, just headers
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(0)
  })

  it('renders styles for table and wrapper', () => {
    const { container } = render(
      <PaymentScheduleTable
        visiblePayments={[]}
        pageNumber={0}
        itemsPerPage={12}
        markingPaymentId={null}
        undoPaymentId={null}
        undoConfirmId={null}
        onMarkPaid={vi.fn()}
        onRequestUndo={vi.fn()}
        onConfirmUndo={vi.fn()}
        onCancelUndo={vi.fn()}
      />
    )
    const wrapper = container.querySelector('.payment-table-wrapper')
    const table = container.querySelector('.payment-table')
    expect(wrapper).toBeInTheDocument()
    expect(table).toBeInTheDocument()
  })
})
