import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, AlertCircle, Download, Edit } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { getSaleById, markPaymentPaid, markPaymentUnpaid, type Sale } from '../../lib/salesService'
import { generateInvoice } from '../../lib/invoiceService'
import { showToast } from '../../lib/toast'
import { db } from '../../lib/firebase'

// Formats a number as NZD currency for display
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

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
        <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
      </div>
    )
  }

  if (!sale) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Sale not found</p>
        <button onClick={() => navigate('/admin/sales')} style={{
          padding: '0.75rem 1.5rem', borderRadius: '0.625rem',
          background: 'linear-gradient(135deg, #2E86AB, #256E8C)', color: 'white',
          fontFamily: 'Outfit', cursor: 'pointer', border: 'none',
        }}>
          Back to Sales
        </button>
      </div>
    )
  }

  // Marks a payment installment as paid in Firestore, refetches the sale, and auto-completes the sale
  // status once every installment has been paid
  const handleMarkPaid = async (paymentId: string) => {
    if (!id) return
    setMarkingPayment(paymentId)
    try {
      await markPaymentPaid(id, paymentId)
      const updated = await getSaleById(id)
      if (updated) {
        setSale(updated)
        const allPaid = updated.payments.every((p) => p.status === 'paid')
        if (allPaid && updated.status !== 'completed') {
          await updateDoc(doc(db, 'sales', id), { status: 'completed' })
          setSale({ ...updated, status: 'completed' })
          showToast('All payments completed! Sale marked as completed.', 'success')
        } else {
          showToast('Payment marked as paid', 'success')
        }
      }
    } catch (err) {
      console.error('Failed to mark payment:', err)
      showToast('Failed to mark payment', 'error')
    } finally {
      setMarkingPayment(null)
    }
  }

  // Reverts a payment installment back to unpaid in Firestore and refetches the sale to sync local state
  const handleMarkUnpaid = async (paymentId: string) => {
    if (!id) return
    setUndoPaymentId(paymentId)
    try {
      await markPaymentUnpaid(id, paymentId)
      const updated = await getSaleById(id)
      if (updated) setSale(updated)
      showToast('Payment marked as unpaid', 'success')
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

  return (
    <div
      id="admin-sales-detail-wrapper"
      className="admin-sales-detail-wrapper"
      style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden', padding: '0' }}
    >
      <style>{`
        .sale-detail-header {
          margin-bottom: 2rem;
        }
        .sale-detail-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          color: white;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .sale-detail-grid {
          display: grid;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          gap: clamp(1rem, 3vw, 1.5rem);
          padding: 0;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .sale-detail-grid {
            grid-template-columns: 1fr 1fr;
            padding: 0;
          }
        }
        .admin-sales-detail-left-col {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          padding: clamp(0.5rem, 2vw, 1rem);
        }
        .admin-sales-detail-right-col {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          padding: clamp(0.5rem, 2vw, 1rem);
        }
        .admin-sales-payment-table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 0.5rem;
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
        @media (max-width: 640px) {
          .admin-sales-payment-table-scroll {
            background: linear-gradient(to right, transparent 85%, rgba(0,0,0,0.3) 100%);
          }
        }
        .detail-header-actions {
          display: flex;
          gap: clamp(0.5rem, 2vw, 1rem);
          flex-wrap: wrap;
          width: 100%;
          margin-top: clamp(1.5rem, 4vw, 2rem);
          padding-top: clamp(1rem, 3vw, 1.5rem);
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        @media (min-width: 1024px) {
          .admin-sales-detail-btn {
            flex: 0 0 auto;
          }
        }
        .admin-sales-detail-btn {
          flex: 1 1 calc(50% - 0.5rem);
          min-height: 44px;
          min-width: 0;
          padding: clamp(0.75rem, 2vw, 1rem) clamp(0.5rem, 2vw, 1.25rem);
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          color: #e5e7eb;
          border-radius: 0.375rem;
          font-size: clamp(0.75rem, 2vw, 1rem);
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-align: center;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .admin-sales-detail-btn {
            white-space: nowrap;
          }
        }
        .admin-sales-detail-btn:hover {
          border-color: rgba(29,78,216,0.5);
          background: rgba(29,78,216,0.1);
          color: #2E86AB;
          box-shadow: 0 0 10px rgba(29,78,216,0.2);
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
          margin-bottom: 1.25rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sale-detail-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .sale-detail-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.4rem;
          display: block;
        }
        .sale-detail-value {
          font-size: 0.9rem;
          color: white;
          font-weight: 500;
        }
      `}</style>
      {/* Header */}
      <div
        id="admin-sales-detail-header"
        className="admin-sales-detail-header sale-detail-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(1rem, 3vw, 1.5rem)',
          marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
          padding: 'clamp(0.75rem, 3vw, 1.5rem)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => navigate('/admin/sales')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '0.625rem',
            backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontSize: '0.875rem',
            cursor: 'pointer', marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Sales
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'clamp(0.75rem, 2vw, 1rem)', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <h1 className="font-bebas sale-detail-title">
              {sale.buyer.name}
            </h1>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
              {fmtDate(sale.saleDate)} •{' '}
              <span style={{
                display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '0.375rem',
                backgroundColor: sale.status === 'active' ? 'rgba(29,78,216,0.2)' : sale.status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: sale.status === 'active' ? '#2E86AB' : sale.status === 'completed' ? '#22c55e' : '#ef4444',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Outfit', textTransform: 'capitalize',
              }}>
                {sale.status}
              </span>
            </p>
          </div>
          <div
            id="admin-sales-detail-header-actions"
            className="admin-sales-detail-header-actions detail-header-actions"
          >
            <button
              id="admin-sales-detail-btn-invoice"
              className="admin-sales-detail-btn-invoice admin-sales-detail-btn"
              onClick={() => generateInvoice(sale)}
            >
              <Download size={16} />
              Download Invoice
            </button>
            <button
              id="admin-sales-detail-btn-edit"
              className="admin-sales-detail-btn-edit admin-sales-detail-btn"
              onClick={() => navigate(`/admin/sales/edit/${id}`)}
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div
        id="admin-sales-detail-grid"
        className="admin-sales-detail-grid sale-detail-grid"
      >
        {/* Left Column */}
        <div
          id="admin-sales-detail-left-col"
          className="admin-sales-detail-left-col"
          style={{  }}
        >
          {/* Vehicle Card */}
          <div
            id="admin-sales-detail-vehicle"
            className="admin-sales-detail-vehicle"
            style={{
            width: '100%', boxSizing: 'border-box', overflow: 'hidden',
            backgroundColor: '#FFFFFF', border: '1px solid rgba(29,78,216,0.1)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: '1.5rem',
          }}>
            <img src={sale.carImages[0]} alt="" style={{
              width: '100%', maxWidth: '100%', height: 'auto', display: 'block',
              borderRadius: '0.75rem', marginBottom: '1rem',
            }} />
            <h2 className="font-bebas" style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
              {sale.carTitle}
            </h2>
            <div className="detail-section-grid-2col" style={{ marginBottom: '1rem' }}>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Year • KM</p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>
                  {sale.carYear} • {0} km
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Color</p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.carColor}</p>
              </div>
            </div>
            <p className="font-bebas" style={{ fontSize: '1.25rem', color: '#2E86AB' }}>
              {fmt(sale.paymentPlan.salePrice)}
            </p>
          </div>

          {/* Vehicle Extended Details */}
          {sale.vehicleInfo && (
            <div
              id="admin-sales-detail-vehicle-details"
              className="admin-sales-detail-vehicle-details"
              style={{
              backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            }}>
              <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
                Vehicle Details
              </h3>
              <div className="detail-section-grid-2col" style={{ marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>VIN</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.vehicleInfo?.vin}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>License Plate</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.vehicleInfo?.plate}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Origin</p>
                  <span style={{
                    display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '0.375rem',
                    backgroundColor: sale.vehicleInfo?.isNZNew ? 'rgba(34,197,94,0.2)' : 'rgba(29,78,216,0.2)',
                    color: sale.vehicleInfo?.isNZNew ? '#22c55e' : '#2E86AB',
                    fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Outfit',
                  }}>
                    {sale.vehicleInfo?.isNZNew ? 'NZ New' : 'Used Import'}
                  </span>
                </div>
                {!sale.vehicleInfo?.isNZNew && (
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Country</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.vehicleInfo?.originCountry}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Previous Owners</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.vehicleInfo?.previousOwners}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Maintenance History</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.vehicleInfo?.hasMaintenanceHistory ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Info Card */}
          <div
            id="admin-sales-detail-buyer"
            className="admin-sales-detail-buyer"
            style={{
            backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
              Buyer Information
            </h3>
            <div className="detail-section-grid-2col">
              {[
                { label: 'Full Name', value: sale.buyer.name },
                { label: 'ID Number', value: sale.buyer.idNumber },
                { label: 'License', value: sale.buyer.licenseNumber },
                { label: 'Email', value: sale.buyer.email },
                { label: 'Phone', value: sale.buyer.phone },
                { label: 'Address', value: sale.buyer.address },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ORC Section */}
          {sale.orc && (sale.orc?.orcTotal > 0 || sale.orc?.orcIncluded) && (
            <div
              id="admin-sales-detail-orc"
              className="admin-sales-detail-orc"
              style={{
              backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            }}>
              <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
                On Road Costs (ORC)
              </h3>
              {sale.orc?.orcIncluded ? (
                <span style={{
                  display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '0.5rem',
                  backgroundColor: 'rgba(34,197,94,0.2)', color: '#22c55e',
                  fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Outfit',
                }}>
                  ORC Included in Price
                </span>
              ) : (
                <div style={{ fontSize: '0.875rem' }}>
                  {sale.orc?.wof > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>WoF: {fmt(sale.orc?.wof)}</p>}
                  {sale.orc?.registration > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>Registration: {fmt(sale.orc?.registration)}</p>}
                  {sale.orc?.grooming > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>Grooming: {fmt(sale.orc?.grooming)}</p>}
                  {sale.orc?.ownershipTransfer > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>Ownership Transfer: {fmt(sale.orc?.ownershipTransfer)}</p>}
                  {sale.orc?.mechanicalInspection > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>Mechanical Inspection: {fmt(sale.orc?.mechanicalInspection)}</p>}
                  {sale.orc?.otherAmount > 0 && <p style={{ color: 'white', marginBottom: '0.5rem' }}>{sale.orc?.otherLabel}: {fmt(sale.orc?.otherAmount)}</p>}
                  <p style={{ color: '#2E86AB', fontWeight: 600, marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    Total: {fmt(sale.orc?.orcTotal)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Accessories Section */}
          {sale.extraAccessories && sale.extraAccessories?.items?.length > 0 && (
            <div
              id="admin-sales-detail-accessories"
              className="admin-sales-detail-accessories"
              style={{
              backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            }}>
              <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
                Extra Accessories
              </h3>
              <div style={{ fontSize: '0.875rem' }}>
                {sale.extraAccessories?.items?.map((item, idx) => (
                  <p key={idx} style={{ color: 'white', marginBottom: '0.5rem' }}>
                    {item.description}: {fmt(item.price)}
                  </p>
                ))}
                <p style={{ color: '#2E86AB', fontWeight: 600, marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  Total: {fmt(sale.extraAccessories?.total)}
                </p>
              </div>
            </div>
          )}

          {/* Financing Fees Section */}
          {sale.financingFees && (
            <div
              id="admin-sales-detail-financing-fees"
              className="admin-sales-detail-financing-fees"
              style={{
              backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            }}>
              <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
                Financing Fees
              </h3>
              <div style={{ fontSize: '0.875rem' }}>
                <p style={{ color: 'white', marginBottom: '0.5rem' }}>Establishment: {fmt(sale.financingFees?.establishmentFee)}</p>
                <p style={{ color: 'white', marginBottom: '0.5rem' }}>PPSR: {fmt(sale.financingFees?.ppsr)}</p>
                <p style={{ color: 'white', marginBottom: '0.5rem' }}>Monthly Account Fee: {fmt(sale.financingFees?.monthlyAccountFee)}</p>
                <p style={{ color: 'white', marginBottom: '0.75rem' }}>Dealer Origination: {fmt(sale.financingFees?.dealerOriginationFee)}</p>
                <p style={{ color: '#2E86AB', fontWeight: 600, paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  Total: {fmt(sale.financingFees?.total)}
                </p>
              </div>
            </div>
          )}

          {/* Warranty & Insurance Section */}
          {(sale.warranty || sale.mechanicalInsurance) && (
            <div
              id="admin-sales-detail-warranty"
              className="admin-sales-detail-warranty"
              style={{
              backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            }}>
              <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '1rem' }}>
                Warranty & Insurance
              </h3>
              <div style={{ fontSize: '0.875rem' }}>
                {sale.warranty && (
                  <p style={{ color: 'white', marginBottom: '0.5rem' }}>
                    Warranty: {sale.warranty?.months} months - {sale.warranty?.provider}
                  </p>
                )}
                {sale.mechanicalInsurance && (
                  <p style={{ color: 'white', marginBottom: '0.5rem' }}>
                    Insurance: {sale.mechanicalInsurance?.months} months - {sale.mechanicalInsurance?.provider}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div style={{
              backgroundColor: '#FFFFFF', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem',
            }}>
              <h4 style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Notes
              </h4>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                {sale.notes}
              </p>
            </div>
          )}

          {/* Documents */}
          {sale.documents && (sale.documents as any).uploadedDocuments && ((sale.documents as any).uploadedDocuments.length > 0) && (
            <div style={{
              backgroundColor: '#FFFFFF', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem',
            }}>
              <h4 style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Documents & Photos ({(sale.documents as any).uploadedDocuments.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                {((sale.documents as any).uploadedDocuments as string[]).map((url, i) => (
                  <div key={i} style={{
                    backgroundColor: '#EEF2F7',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    border: '1px solid rgba(29,78,216,0.2)',
                    position: 'relative',
                  }}>
                    {url.includes('image') && !url.includes('.pdf') ? (
                      <img src={url} alt={`Doc ${i + 1}`} style={{
                        width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer',
                      }} />
                    ) : (
                      <div style={{
                        height: '100px',
                        backgroundColor: '#EEF2F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2E86AB',
                        fontSize: '2rem',
                      }}>
                        📄
                      </div>
                    )}
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'block',
                      padding: '0.5rem',
                      fontFamily: 'Outfit',
                      fontSize: '0.65rem',
                      color: '#2E86AB',
                      textDecoration: 'none',
                      textAlign: 'center',
                      borderTop: '1px solid rgba(29,78,216,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div
          id="admin-sales-detail-right-col"
          className="admin-sales-detail-right-col"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          {/* Payment Summary Card */}
          <div
            id="admin-sales-detail-payment"
            className="admin-sales-detail-payment"
            style={{
            background: 'linear-gradient(135deg, #E4EAF0, #FFFFFF)', border: '1px solid rgba(29,78,216,0.15)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            <span style={{
              display: 'inline-block', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
              backgroundColor: sale.paymentPlan.type === 'cash'
                ? 'rgba(34, 197, 94, 0.2)' : sale.paymentPlan.type === 'financing'
                  ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
              color: sale.paymentPlan.type === 'cash'
                ? '#22c55e' : sale.paymentPlan.type === 'financing'
                  ? '#3b82f6' : '#9333ea',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Outfit', marginBottom: '1rem',
            }}>
              {sale.paymentPlan.type === 'cash' ? 'Cash Payment' : sale.paymentPlan.type === 'financing' ? 'Full Financing' : 'Down Payment + Financing'}
            </span>

            {sale.paymentPlan.type === 'cash' ? (
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                  Sale Price
                </p>
                <p className="font-bebas" style={{ fontSize: '2.5rem', color: '#2E86AB', lineHeight: 1 }}>
                  {fmt(sale.paymentPlan.salePrice)}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>Sale Price</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: 'white' }}>{fmt(sale.paymentPlan.salePrice)}</p>
                </div>
                {sale.paymentPlan.downPayment > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>Down Payment</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#22c55e' }}>{fmt(sale.paymentPlan.downPayment)}</p>
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>Amount Financed</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: 'white' }}>{fmt(sale.paymentPlan.financedAmount)}</p>
                </div>
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.75rem', padding: '1rem',
                  border: '1px solid rgba(29,78,216,0.1)', marginBottom: '1rem',
                }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                    Monthly Payment
                  </p>
                  <p className="font-bebas" style={{ fontSize: '2rem', color: '#2E86AB', lineHeight: 1 }}>
                    {fmt(sale.paymentPlan.monthlyPayment)}
                  </p>
                </div>
                <div className="payment-summary-grid" style={{
                  paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>
                      Total Interest
                    </p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#ef4444' }}>{fmt(sale.paymentPlan.totalInterest)}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>
                      Total Repayment
                    </p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: 'white' }}>{fmt(sale.paymentPlan.totalPayment)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Schedule */}
          {sale.paymentPlan.type !== 'cash' && sale.payments.length > 0 && (() => {
            const paymentsPerPage = 12
            const totalPages = Math.ceil(sale.payments.length / paymentsPerPage)
            const visiblePayments = sale.payments.slice(
              paymentPage * paymentsPerPage,
              (paymentPage + 1) * paymentsPerPage
            )
            const pendingCount = sale.payments.filter(p => p.status === 'pending').length
            const remaining = sale.payments
              .filter(p => p.status !== 'paid')
              .reduce((sum, p) => sum + p.amount, 0)

            return (
              <div
                id="admin-sales-detail-payment-schedule"
                className="admin-sales-detail-payment-schedule"
                style={{
                width: '100%', boxSizing: 'border-box', overflow: 'hidden',
                backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '0.75rem' }}>
                    Payment Schedule
                  </h3>
                  <div
                    id="admin-sales-payment-progress"
                    style={{
                    width: '100%', height: 'clamp(6px, 1.5vw, 10px)',
                    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '999px',
                    overflow: 'hidden', marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                  }}>
                    <div style={{
                      height: '100%', backgroundColor: '#22c55e',
                      width: `${(paidCount / totalPayments) * 100}%`, transition: 'width 0.3s',
                    }} />
                  </div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                    {paidCount} of {totalPayments} payments completed
                  </p>
                </div>

                {/* Summary Row */}
                <div style={{
                  backgroundColor: 'rgba(29,78,216,0.05)', border: '1px solid rgba(29,78,216,0.1)',
                  borderRadius: '0.625rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                  fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                }}>
                  {paidCount} payments completed · {pendingCount} pending · {fmt(remaining)} remaining
                </div>

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
                  className="admin-sales-payment-table-scroll payment-table-wrapper"
                >
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
                        <tr key={p.id} style={{ opacity: p.status === 'paid' ? 0.6 : 1 }}>
                          <td style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.6)' }}>
                            {paymentPage * paymentsPerPage + i + 1}
                          </td>
                          <td style={{ fontFamily: 'Outfit', color: 'white' }}>
                            {fmtDate(p.dueDate)}
                          </td>
                          <td style={{ fontFamily: 'Bebas', color: '#2E86AB' }}>
                            {fmt(p.amount)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {p.status === 'paid' ? (
                                  <>
                                    <CheckCircle size={14} color="#22c55e" />
                                    <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#22c55e' }}>Paid</span>
                                  </>
                                ) : p.status === 'overdue' ? (
                                  <>
                                    <AlertCircle size={14} color="#ef4444" />
                                    <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#ef4444' }}>Overdue</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={14} color='#2E86AB' />
                                    <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#2E86AB' }}>Pending</span>
                                  </>
                                )}
                              </div>
                              {p.status === 'paid' && p.paidDate && (
                                <span style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                  {fmtDate(p.paidDate)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {p.status === 'pending' && (
                              <button
                                onClick={() => handleMarkPaid(p.id)}
                                disabled={markingPayment === p.id}
                                style={{
                                  padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                                  border: '1px solid #2E86AB', backgroundColor: 'transparent',
                                  color: '#2E86AB', fontFamily: 'Outfit', fontSize: '0.65rem',
                                  fontWeight: 600, cursor: markingPayment === p.id ? 'not-allowed' : 'pointer',
                                  opacity: markingPayment === p.id ? 0.5 : 1,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {markingPayment === p.id ? '...' : 'Mark Paid'}
                              </button>
                            )}
                            {p.status === 'paid' && (
                              undoConfirmId === p.id ? (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => handleMarkUnpaid(p.id)}
                                    disabled={undoPaymentId === p.id}
                                    style={{
                                      padding: '0.25rem 0.375rem', borderRadius: '0.375rem',
                                      border: '1px solid #22c55e', backgroundColor: 'transparent',
                                      color: '#22c55e', fontFamily: 'Outfit', fontSize: '0.6rem',
                                      fontWeight: 600, cursor: 'pointer',
                                      opacity: undoPaymentId === p.id ? 0.5 : 1,
                                    }}
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => setUndoConfirmId(null)}
                                    disabled={undoPaymentId === p.id}
                                    style={{
                                      padding: '0.25rem 0.375rem', borderRadius: '0.375rem',
                                      border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent',
                                      color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontSize: '0.6rem',
                                      fontWeight: 600, cursor: 'pointer',
                                    }}
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setUndoConfirmId(p.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                                    border: '1px solid rgba(220,38,38,0.3)', backgroundColor: 'transparent',
                                    color: 'rgba(220,38,38,0.6)', fontFamily: 'Outfit', fontSize: '0.65rem',
                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#ef4444'
                                    e.currentTarget.style.color = '#ef4444'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'
                                    e.currentTarget.style.color = 'rgba(220,38,38,0.6)'
                                  }}
                                >
                                  Undo
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <button
                      onClick={() => setPaymentPage(Math.max(0, paymentPage - 1))}
                      disabled={paymentPage === 0}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px',
                        backgroundColor: '#E4EAF0', border: 'rgba(255,255,255,0.08)',
                        borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
                        color: paymentPage === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
                        cursor: paymentPage === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>

                    {(() => {
                      const pages = []
                      const maxButtons = 5
                      let start = Math.max(0, paymentPage - Math.floor(maxButtons / 2))
                      const end = Math.min(totalPages, start + maxButtons)
                      if (end - start < maxButtons) start = Math.max(0, end - maxButtons)

                      for (let i = start; i < end; i++) {
                        pages.push(i)
                      }
                      return pages.map(p => (
                        <button
                          key={p}
                          onClick={() => setPaymentPage(p)}
                          style={{
                            width: '32px', height: '32px',
                            backgroundColor: paymentPage === p ? '#2E86AB' : '#E4EAF0',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
                            color: paymentPage === p ? 'black' : 'rgba(255,255,255,0.6)',
                            fontWeight: paymentPage === p ? 700 : 400,
                            fontFamily: 'Outfit', fontSize: '0.875rem',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {p + 1}
                        </button>
                      ))
                    })()}

                    <button
                      onClick={() => setPaymentPage(Math.min(totalPages - 1, paymentPage + 1))}
                      disabled={paymentPage === totalPages - 1}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px',
                        backgroundColor: '#E4EAF0', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
                        color: paymentPage === totalPages - 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
                        cursor: paymentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
