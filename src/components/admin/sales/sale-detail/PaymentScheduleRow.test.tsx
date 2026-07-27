import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentScheduleRow } from './PaymentScheduleRow'
import type { PaymentRecord } from '../../../../lib/salesService'

function createPayment(status: 'pending' | 'paid' | 'overdue' = 'pending'): PaymentRecord {
  return {
    id: 'payment-1',
    dueDate: '2024-02-15',
    amount: 1000,
    paidDate: status === 'paid' ? '2024-02-10' : undefined,
    status,
  }
}

describe('PaymentScheduleRow', () => {
  describe('pending payment', () => {
    it('renders pending status with icon', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('renders Mark Paid button', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('Mark Paid')).toBeInTheDocument()
    })

    it('calls onMarkPaid when button clicked', () => {
      const onMarkPaid = vi.fn()
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={onMarkPaid}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      fireEvent.click(screen.getByText('Mark Paid'))
      expect(onMarkPaid).toHaveBeenCalledWith('payment-1')
    })

    it('disables Mark Paid button when marking', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={true}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      const button = screen.getByText('...')
      expect(button).toBeDisabled()
    })
  })

  describe('paid payment', () => {
    it('renders paid status with icon', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('Paid')).toBeInTheDocument()
    })

    it('displays paid date', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText(/10 Feb 2024/)).toBeInTheDocument()
    })

    it('renders Undo button initially', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('calls onRequestUndo when Undo clicked', () => {
      const onRequestUndo = vi.fn()
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={onRequestUndo}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      fireEvent.click(screen.getByText('Undo'))
      expect(onRequestUndo).toHaveBeenCalledWith('payment-1')
    })

    it('shows OK/Cancel buttons when confirming', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={true}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('OK')).toBeInTheDocument()
      expect(screen.getByText('X')).toBeInTheDocument()
    })

    it('calls onConfirmUndo when OK clicked during confirmation', () => {
      const onConfirmUndo = vi.fn()
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={true}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={onConfirmUndo}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      fireEvent.click(screen.getByText('OK'))
      expect(onConfirmUndo).toHaveBeenCalledWith('payment-1')
    })

    it('calls onCancelUndo when X clicked during confirmation', () => {
      const onCancelUndo = vi.fn()
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('paid')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={true}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={onCancelUndo}
            />
          </tbody>
        </table>
      )
      fireEvent.click(screen.getByText('X'))
      expect(onCancelUndo).toHaveBeenCalled()
    })
  })

  describe('formatting', () => {
    it('formats amount as currency', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('$1,000')).toBeInTheDocument()
    })

    it('formats due date', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={1}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText(/15 Feb 2024/)).toBeInTheDocument()
    })

    it('displays month number', () => {
      render(
        <table>
          <tbody>
            <PaymentScheduleRow
              payment={createPayment('pending')}
              monthNumber={5}
              isMarking={false}
              isUndoing={false}
              isConfirmingUndo={false}
              onMarkPaid={vi.fn()}
              onRequestUndo={vi.fn()}
              onConfirmUndo={vi.fn()}
              onCancelUndo={vi.fn()}
            />
          </tbody>
        </table>
      )
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })
})
