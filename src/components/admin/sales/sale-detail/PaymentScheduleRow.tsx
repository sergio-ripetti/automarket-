import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import type { PaymentRecord } from '../../../../lib/salesService'

interface PaymentScheduleRowProps {
  payment: PaymentRecord
  monthNumber: number
  isMarking: boolean
  isUndoing: boolean
  isConfirmingUndo: boolean
  onMarkPaid: (paymentId: string) => void
  onRequestUndo: (paymentId: string) => void
  onConfirmUndo: (paymentId: string) => void
  onCancelUndo: () => void
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PaymentScheduleRow({
  payment,
  monthNumber,
  isMarking,
  isUndoing,
  isConfirmingUndo,
  onMarkPaid,
  onRequestUndo,
  onConfirmUndo,
  onCancelUndo,
}: PaymentScheduleRowProps) {
  return (
    <tr style={{ opacity: payment.status === 'paid' ? 0.6 : 1 }}>
      <td
        style={{
          fontFamily: 'Outfit',
          color: '#767676',
          padding: '0.75rem',
        }}>
        {monthNumber}
      </td>
      <td
        style={{
          color: '#0D1B2A',
          padding: '0.75rem',
        }}>
        {fmtDate(payment.dueDate)}
      </td>
      <td
        style={{
          fontFamily: 'Bebas',
          color: '#1A1A1A',
          padding: '0.75rem',
        }}>
        {fmt(payment.amount)}
      </td>
      <td
        style={{
          padding: '0.75rem',
        }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            minWidth: 0,
          }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
            {payment.status === 'paid' ? (
              <>
                <CheckCircle size={14} color="#22c55e" />
                <span
                  style={{
                    fontFamily: 'Outfit',
                    fontSize: '0.7rem',
                    color: '#22c55e',
                  }}>
                  Paid
                </span>
              </>
            ) : payment.status === 'overdue' ? (
              <>
                <AlertCircle size={14} color="#ef4444" />
                <span
                  style={{
                    fontFamily: 'Outfit',
                    fontSize: '0.7rem',
                    color: '#ef4444',
                  }}>
                  Overdue
                </span>
              </>
            ) : (
              <>
                <Clock size={14} color="#1A1A1A" />
                <span
                  style={{
                    fontFamily: 'Outfit',
                    fontSize: '0.7rem',
                    color: '#1A1A1A',
                  }}>
                  Pending
                </span>
              </>
            )}
          </div>
          {payment.status === 'paid' && payment.paidDate && (
            <span
              style={{
                fontFamily: 'Outfit',
                fontSize: '0.65rem',
                color: '#767676',
              }}>
              {fmtDate(payment.paidDate)}
            </span>
          )}
        </div>
      </td>
      <td
        style={{
          padding: '0.75rem',
        }}>
        {payment.status === 'pending' && (
          <button
            onClick={() => onMarkPaid(payment.id)}
            disabled={isMarking}
            aria-label={`Mark payment ${monthNumber} as paid`}
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #1A1A1A',
              backgroundColor: 'transparent',
              color: '#1A1A1A',
              fontFamily: 'Outfit',
              fontSize: '0.65rem',
              fontWeight: 600,
              cursor: isMarking ? 'not-allowed' : 'pointer',
              opacity: isMarking ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}>
            {isMarking ? '...' : 'Mark Paid'}
          </button>
        )}
        {payment.status === 'paid' &&
          (isConfirmingUndo ? (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => onConfirmUndo(payment.id)}
                disabled={isUndoing}
                aria-label={`Confirm undo payment ${monthNumber}`}
                style={{
                  padding: '0.25rem 0.375rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #22c55e',
                  backgroundColor: 'transparent',
                  color: '#22c55e',
                  fontFamily: 'Outfit',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: isUndoing ? 0.5 : 1,
                }}>
                OK
              </button>
              <button
                onClick={onCancelUndo}
                disabled={isUndoing}
                aria-label={`Cancel undo payment ${monthNumber}`}
                style={{
                  padding: '0.25rem 0.375rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'transparent',
                  color: '#767676',
                  fontFamily: 'Outfit',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                X
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestUndo(payment.id)}
              aria-label={`Undo payment ${monthNumber}`}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(220,38,38,0.3)',
                backgroundColor: 'transparent',
                color: 'rgba(220,38,38,0.6)',
                fontFamily: 'Outfit',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ef4444'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'
                e.currentTarget.style.color = 'rgba(220,38,38,0.6)'
              }}>
              Undo
            </button>
          ))}
      </td>
    </tr>
  )
}
