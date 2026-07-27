import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Edit } from 'lucide-react'
import { getSaleById, type Sale } from '../../lib/salesService'
import { updatePaymentStatus } from '../../lib/adminSalesService'
import { generateInvoice } from '../../lib/invoiceService'
import { showToast } from '../../lib/toast'
import {
  VehicleInfoCard,
  VehicleDetailsCard,
  BuyerInfoCard,
  PaymentSummaryCard,
  OrcDetailsCard,
  AccessoriesCard,
  FinancingFeesCard,
  WarrantyDetailsCard,
  SaleNotesSection,
  SaleDocumentsCard,
  PaymentProgressSummary,
  PaymentScheduleTable,
  PaymentPagination,
} from '../../components/admin/sales/sale-detail'

// Formats an ISO date string into a readable NZ date string
function fmtDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Admin page showing full detail for a single sale - vehicle, buyer, payment plan, and installment schedule;
// fetches the sale from Firestore by route param and lets staff mark payments paid/unpaid or download an invoice
export default function AdminSaleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingPayment, setMarkingPayment] = useState<string | null>(null)
  const [undoPaymentId, setUndoPaymentId] = useState<string | null>(null)
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)
  const [paymentPage, setPaymentPage] = useState(0)

  // Fetches the sale record from Firestore by id on mount (or when the id route param changes)
  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await getSaleById(id)
        setSale(data)
      } catch (err) {
        console.error('Failed to load sale:', err)
        showToast('Failed to load sale', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ fontFamily: 'Outfit', color: '#767676' }}>Loading...</p>
      </div>
    )
  }

  if (!sale) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontFamily: 'Outfit', color: '#767676', marginBottom: '1rem' }}>Sale not found</p>
        <button onClick={() => navigate('/admin/sales')} style={{
          padding: '0.75rem 1.5rem', borderRadius: 0,
          background: '#1A1A1A', color: "#0D1B2A",
          fontFamily: 'Outfit', cursor: 'pointer', border: 'none',
        }}>
          Back to Sales
        </button>
      </div>
    )
  }

  // Marks a payment installment as paid via backend endpoint
  const handleMarkPaid = async (paymentId: string) => {
    if (!id || !sale) return
    setMarkingPayment(paymentId)
    try {
      const result = await updatePaymentStatus(id, paymentId, 'paid')
      if (!result.success) {
        showToast(result.error || 'Failed to mark payment', 'error')
        setMarkingPayment(null)
        return
      }

      // Refetch sale to get updated data from backend
      try {
        const updatedSale = await getSaleById(id)
        if (updatedSale) {
          setSale(updatedSale)
          const allPaymentsPaid = updatedSale.payments.every((p) => p.status === 'paid')
          if (allPaymentsPaid && updatedSale.status === 'completed') {
            showToast('All payments completed! Sale marked as completed.', 'success')
          } else {
            showToast('Payment marked as paid', 'success')
          }
        }
      } catch (refetchErr) {
        console.error('Failed to refetch sale:', refetchErr)
        // Payment was marked successfully, UI refresh is optional
      }
    } catch (err) {
      console.error('Failed to mark payment:', err)
      showToast('Failed to mark payment', 'error')
    } finally {
      setMarkingPayment(null)
    }
  }

  // Reverts a payment installment back to unpaid via backend endpoint
  const handleMarkUnpaid = async (paymentId: string) => {
    if (!id || !sale) return
    setUndoPaymentId(paymentId)
    try {
      const result = await updatePaymentStatus(id, paymentId, 'pending')
      if (!result.success) {
        showToast(result.error || 'Failed to mark payment unpaid', 'error')
        setUndoPaymentId(null)
        setUndoConfirmId(null)
        return
      }

      // Refetch sale to get updated data from backend
      try {
        const updatedSale = await getSaleById(id)
        if (updatedSale) {
          setSale(updatedSale)
          showToast('Payment marked as unpaid', 'success')
        }
      } catch (refetchErr) {
        console.error('Failed to refetch sale:', refetchErr)
        // Payment was marked successfully, UI refresh is optional
      }
    } catch (err) {
      console.error('Failed to mark payment unpaid:', err)
      showToast('Failed to mark payment unpaid', 'error')
    } finally {
      setUndoPaymentId(null)
      setUndoConfirmId(null)
    }
  }

  const paidCount = sale.payments.filter((p) => p.status === 'paid').length
  const totalPayments = sale.payments.length
  const isCashSale = sale.paymentPlan.type === 'cash'

  return (
    <div
      id="admin-sales-detail-wrapper"
      className="admin-sales-detail-wrapper"
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "0",
      }}>
      <style>{`
        .sale-detail-header {
          margin-bottom: clamp(1.5rem, 4vw, 2rem);
        }
        .sale-detail-title {
          font-size: clamp(1.5rem, 5vw, 2rem);
          color: #0D1B2A;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }
        .sale-detail-grid {
          display: grid;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          gap: clamp(1.5rem, 3vw, 2rem);
          padding: 0;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .sale-detail-grid {
            grid-template-columns: 1fr 1fr;
            padding: 0;
          }
          /* Cash sales have no financing summary/payment schedule to justify a second
             column - a forced 1fr 1fr grid left a near-empty right column with excess
             blank space, so cash sales use one full-width column instead. */
          .sale-detail-grid--single-col {
            grid-template-columns: 1fr;
          }
        }
        .admin-sales-detail-left-col {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          padding: 0;
        }
        .admin-sales-detail-right-col {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          padding: 0;
        }
        .detail-card {
          background: #FFFFFF;
          border: 1px solid #E0E0DC;
          border-radius: 0.75rem;
          padding: clamp(1rem, 2.5vw, 1.5rem);
          margin-bottom: clamp(1.25rem, 3vw, 1.5rem);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          transition: box-shadow 0.2s ease;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          overflow-wrap: anywhere;
        }
        .detail-section-grid-2col > * {
          min-width: 0;
        }
        .detail-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .admin-sales-payment-table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 0.75rem;
          background: #FFFFFF;
          border: 1px solid #E0E0DC;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        @media (min-width: 1024px) {
          .admin-sales-payment-table-scroll {
            overflow-x: visible;
          }
        }
        .admin-sales-payment-table-scroll table {
          min-width: 500px;
          width: 100%;
          border-collapse: collapse;
        }
        .admin-sales-payment-table-scroll thead {
          background-color: #F7F7F5;
        }
        .admin-sales-payment-table-scroll th {
          padding: clamp(0.75rem, 2vw, 1rem);
          text-align: left;
          font-family: 'Outfit', sans-serif;
          font-size: clamp(0.7rem, 1.5vw, 0.8rem);
          color: #1A1A1A;
          letter-spacing: 0.05em;
          font-weight: 600;
          text-transform: uppercase;
          border-bottom: 1px solid #E0E0DC;
        }
        .admin-sales-payment-table-scroll td {
          padding: clamp(0.75rem, 2vw, 1rem);
          border-bottom: 1px solid #E0E0DC;
          color: #1A1A1A;
          background-color: #FFFFFF;
        }
        .admin-sales-payment-table-scroll tbody tr:nth-child(odd) td {
          background-color: #F7F7F5;
        }
        .detail-header-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
          width: 100%;
          margin-top: clamp(1.5rem, 4vw, 2rem);
          padding-top: clamp(1rem, 3vw, 1.5rem);
          border-top: 1px solid #E0E0DC;
        }
        .admin-sales-detail-btn {
          flex: 0 1 auto;
          min-height: 38px;
          min-width: 0;
          padding: 0.5rem 0.875rem;
          border: 1px solid #E0E0DC;
          background: #FFFFFF;
          color: #1A1A1A;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          text-align: center;
          overflow: hidden;
          white-space: nowrap;
        }
        .admin-sales-detail-btn:hover {
          border-color: #C4FF00;
          background: #FAFAF8;
        }
        .admin-sales-detail-btn:focus-visible {
          outline: 2px solid #1A1A1A;
          outline-offset: 2px;
        }
        .detail-section-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(1rem, 2.5vw, 1.5rem);
        }
        @media (min-width: 768px) {
          .detail-section-grid-2col {
            grid-template-columns: 1fr 1fr;
            gap: clamp(1.25rem, 3vw, 1.75rem);
          }
        }
        .payment-summary-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(1rem, 2.5vw, 1.5rem);
        }
        @media (min-width: 768px) {
          .payment-summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: clamp(1.25rem, 3vw, 1.75rem);
          }
        }
        .sale-detail-section {
          margin-bottom: clamp(1rem, 2.5vw, 1.25rem);
          padding-bottom: clamp(1rem, 2.5vw, 1.25rem);
          border-bottom: 1px solid #E0E0DC;
          min-width: 0;
        }
        .sale-detail-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .sale-detail-label {
          font-size: 0.7rem;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.4rem;
          display: block;
          font-weight: 600;
        }
        .sale-detail-value {
          font-size: 0.9rem;
          color: #0D1B2A;
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      `}</style>
      {/* Header */}
      <div
        id="admin-sales-detail-header"
        className="admin-sales-detail-header sale-detail-header"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 3vw, 1.5rem)",
          marginBottom: "clamp(1rem, 3vw, 1.5rem)",
          padding: "clamp(0.75rem, 3vw, 1.5rem)",
          width: "100%",
          boxSizing: "border-box",
        }}>
        <button
          onClick={() => navigate("/admin/sales")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            width: "fit-content",
            padding: "0.4rem 0.75rem",
            borderRadius: "0.5rem",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E0E0DC",
            color: "#6B7280",
            fontFamily: "Outfit",
            fontSize: "0.8rem",
            cursor: "pointer",
            marginBottom: "1.25rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#C4FF00";
            e.currentTarget.style.color = "#1A1A1A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#E0E0DC";
            e.currentTarget.style.color = "#6B7280";
          }}>
          <ArrowLeft size={14} />
          Back to Sales
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "clamp(0.75rem, 2vw, 1rem)",
            width: "100%",
            boxSizing: "border-box",
          }}>
          <div>
            <h1 className="font-bebas sale-detail-title">{sale.buyer.name}</h1>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.875rem",
                color: "#767676",
              }}>
              {fmtDate(sale.saleDate)} •{" "}
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.375rem",
                  backgroundColor:
                    sale.status === "active"
                      ? "rgba(29,78,216,0.2)"
                      : sale.status === "completed"
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(239,68,68,0.2)",
                  color:
                    sale.status === "active"
                      ? "#1A1A1A"
                      : sale.status === "completed"
                        ? "#22c55e"
                        : "#ef4444",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "Outfit",
                  textTransform: "capitalize",
                }}>
                {sale.status}
              </span>
            </p>
          </div>
          <div
            id="admin-sales-detail-header-actions"
            className="admin-sales-detail-header-actions detail-header-actions">
            <button
              id="admin-sales-detail-btn-invoice"
              className="admin-sales-detail-btn-invoice admin-sales-detail-btn"
              onClick={() => generateInvoice(sale)}>
              <Download size={16} />
              Download Invoice
            </button>
            <button
              id="admin-sales-detail-btn-edit"
              className="admin-sales-detail-btn-edit admin-sales-detail-btn"
              onClick={() => navigate(`/admin/sales/edit/${id}`)}>
              <Edit size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Layout: cash sales use one full-width column (no financing summary/schedule
          to justify a second column); financing/mixed keep the two-column layout. */}
      <div
        id="admin-sales-detail-grid"
        className={`admin-sales-detail-grid sale-detail-grid ${isCashSale ? 'sale-detail-grid--single-col' : ''}`}>
        {/* Left Column (full-width content column for cash) */}
        <div
          id="admin-sales-detail-left-col"
          className="admin-sales-detail-left-col"
          style={{}}>
          <VehicleInfoCard sale={sale} />

          <VehicleDetailsCard sale={sale} />

          <BuyerInfoCard sale={sale} />

          <OrcDetailsCard sale={sale} />

          <AccessoriesCard sale={sale} />

          <FinancingFeesCard sale={sale} />

          <WarrantyDetailsCard sale={sale} />

          <SaleNotesSection sale={sale} />

          {/* Documents */}
          <SaleDocumentsCard sale={sale} />

          {/* Cash sales: the payment summary sits full-width with the rest of the
              content instead of in an otherwise-empty second column. */}
          {isCashSale && <PaymentSummaryCard sale={sale} />}
        </div>

        {/* Right Column (financing/mixed only) */}
        {!isCashSale && (
        <div
          id="admin-sales-detail-right-col"
          className="admin-sales-detail-right-col"
          style={{ width: "100%", boxSizing: "border-box" }}>
          <PaymentSummaryCard sale={sale} />

          {/* Payment Schedule */}
          {sale.paymentPlan.type !== "cash" &&
            sale.payments.length > 0 &&
            (() => {
              const paymentsPerPage = 12;
              const totalPages = Math.ceil(
                sale.payments.length / paymentsPerPage,
              );
              const visiblePayments = sale.payments.slice(
                paymentPage * paymentsPerPage,
                (paymentPage + 1) * paymentsPerPage,
              );
              const pendingCount = sale.payments.filter(
                (p) => p.status === "pending",
              ).length;
              const remaining = sale.payments
                .filter((p) => p.status !== "paid")
                .reduce((sum, p) => sum + p.amount, 0);

              return (
                <div
                  id="admin-sales-detail-payment-schedule"
                  className="admin-sales-detail-payment-schedule"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "1rem",
                    padding: "clamp(0.75rem, 2vw, 1.5rem)",
                  }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <h3
                      className="font-bebas"
                      style={{
                        fontSize: "1.1rem",
                        color: "#1A1A1A",
                        marginBottom: "0.75rem",
                      }}>
                      Payment Schedule
                    </h3>
                    <PaymentProgressSummary
                      paidCount={paidCount}
                      totalPayments={totalPayments}
                      pendingCount={pendingCount}
                      remaining={remaining}
                    />
                  </div>

                  <PaymentScheduleTable
                    visiblePayments={visiblePayments}
                    pageNumber={paymentPage}
                    itemsPerPage={paymentsPerPage}
                    markingPaymentId={markingPayment}
                    undoPaymentId={undoPaymentId}
                    undoConfirmId={undoConfirmId}
                    onMarkPaid={handleMarkPaid}
                    onRequestUndo={(id) => setUndoConfirmId(id)}
                    onConfirmUndo={handleMarkUnpaid}
                    onCancelUndo={() => setUndoConfirmId(null)}
                  />
                  <PaymentPagination
                    currentPage={paymentPage}
                    totalPages={totalPages}
                    onPageChange={setPaymentPage}
                  />
                </div>
              );
            })()}
        </div>
        )}
      </div>
    </div>
  );
}


