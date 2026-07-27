import type { PaymentRecord } from '../../../../lib/salesService'
import { PaymentScheduleRow } from './PaymentScheduleRow'

interface PaymentScheduleTableProps {
  visiblePayments: PaymentRecord[]
  pageNumber: number
  itemsPerPage: number
  markingPaymentId: string | null
  undoPaymentId: string | null
  undoConfirmId: string | null
  onMarkPaid: (paymentId: string) => void
  onRequestUndo: (paymentId: string) => void
  onConfirmUndo: (paymentId: string) => void
  onCancelUndo: () => void
}

export function PaymentScheduleTable({
  visiblePayments,
  pageNumber,
  itemsPerPage,
  markingPaymentId,
  undoPaymentId,
  undoConfirmId,
  onMarkPaid,
  onRequestUndo,
  onConfirmUndo,
  onCancelUndo,
}: PaymentScheduleTableProps) {
  return (
    <>
      <style>{`
        .payment-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 1rem;
          border-radius: 0.625rem;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        .payment-table thead tr {
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .payment-table th {
          padding: 0.75rem;
          text-align: left;
          font-family: 'Outfit', sans-serif;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .payment-table td {
          padding: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 767px) {
          .payment-table {
            min-width: 500px;
            font-size: 0.7rem;
          }
          .payment-table th,
          .payment-table td {
            padding: 0.5rem;
            font-size: 0.65rem;
          }
        }
      `}</style>
      <div
        id="admin-sales-payment-table-scroll"
        className="admin-sales-payment-table-scroll payment-table-wrapper">
        <table className="payment-table">
          <thead>
            <tr>
              {['Month', 'Due Date', 'Amount', 'Status', 'Action'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiblePayments.map((p, i) => (
              <PaymentScheduleRow
                key={p.id}
                payment={p}
                monthNumber={pageNumber * itemsPerPage + i + 1}
                isMarking={markingPaymentId === p.id}
                isUndoing={undoPaymentId === p.id}
                isConfirmingUndo={undoConfirmId === p.id}
                onMarkPaid={onMarkPaid}
                onRequestUndo={onRequestUndo}
                onConfirmUndo={onConfirmUndo}
                onCancelUndo={onCancelUndo}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
