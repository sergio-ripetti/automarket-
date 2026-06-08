import { useEffect, useState } from 'react'
import { Trash2, Eye, X } from 'lucide-react'
import { getFinancingRequests, updateFinancingStatus, deleteFinancingRequest } from '../../lib/financingService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import type { FinancingRequest } from '../../lib/financingService'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paying' | 'completed'

function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusColor: Record<FinancingRequest['status'], string> = {
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  paying: '#3b82f6', completed: '#6b7280',
}

const statusLabel: Record<FinancingRequest['status'], string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  paying: 'Paying', completed: 'Completed',
}

const tabs: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' }, { id: 'paying', label: 'Paying' }, { id: 'completed', label: 'Completed' },
]

export default function AdminFinancing() {
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [selectedRequest, setSelectedRequest] = useState<FinancingRequest | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFinancingRequests()
        setRequests(data)
      } catch (err) {
        console.error(err)
        showToast('Failed to load financing requests.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab)

  const handleStatusChange = async (id: string, newStatus: FinancingRequest['status']) => {
    try {
      await updateFinancingStatus(id, newStatus)
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
      showToast(`Status updated to ${statusLabel[newStatus]}.`, 'success')
    } catch {
      showToast('Failed to update status.', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this financing request? This cannot be undone.')) return
    try {
      await deleteFinancingRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
      showToast('Request deleted.', 'success')
    } catch {
      showToast('Failed to delete request.', 'error')
    }
  }

  const handleReply = (email: string, carTitle: string) => {
    const subject = `Re: Financing Request - ${carTitle}`
    const body = encodeURIComponent('Thank you for your financing application. We will review your request and get back to you shortly.')
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  return (
    <div>
      <style>{`
        .financing-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          margin-bottom: clamp(1.5rem, 4vw, 2rem);
          font-weight: 600;
        }
      `}</style>
      <h1 className="font-bebas text-white mb-8 financing-page-title">Financing Requests</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-full text-sm font-outfit font-medium transition-all ${
              activeTab === id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Requests */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-dark border border-white/5 rounded-lg h-48 animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-white/30 font-outfit text-sm">
            No financing requests{" "}
            {activeTab !== "all" &&
              `with status "${statusLabel[activeTab as FinancingRequest["status"]]}"`}
          </p>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className="bg-dark border border-white/5 rounded-lg p-6 hover:border-amber-500/20 transition-colors">
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}>
                <div>
                  <p
                    className="font-bebas"
                    style={{
                      fontSize: "1.25rem",
                      color: "white",
                      letterSpacing: "0.03em",
                      lineHeight: 1,
                      marginBottom: "0.25rem",
                    }}>
                    {req.firstName} {req.lastName}
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                    {req.email} · {req.phone}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: statusColor[req.status],
                    color: "#000",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}>
                  {statusLabel[req.status]}
                </div>
              </div>

              {/* Details */}
              <div className="financing-card-grid-2col" style={{ marginBottom: "1rem" }}>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {req.carTitle}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Loan Amount
                  </p>
                  <p
                    className="font-bebas"
                    style={{
                      fontSize: "1.25rem",
                      color: "#f59e0b",
                      lineHeight: 1,
                    }}>
                    {fmt(req.totalAmount)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Monthly Payment
                  </p>
                  <p
                    className="font-bebas"
                    style={{ fontSize: "1rem", color: "#f59e0b" }}>
                    {fmt(req.monthlyPayment)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Loan Term
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {req.loanTerm} months
                  </p>
                </div>
              </div>

              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: "1rem",
                }}>
                Submitted{" "}
                {fmtDate(req.createdAt as unknown as { toDate: () => Date })}
              </p>

              {/* Actions */}
              <style>{`
                .financing-card-grid-2col {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 1rem;
                }
                @media (min-width: 768px) {
                  .financing-card-grid-2col {
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                  }
                }
                .financing-request-actions {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                  gap: 0.5rem;
                }
                .financing-request-actions button {
                  padding: 0.5rem 0.75rem;
                  border-radius: 0.5rem;
                  font-family: 'Outfit', sans-serif;
                  font-size: 0.75rem;
                  background-color: transparent;
                  cursor: pointer;
                  min-height: 36px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.3rem;
                  white-space: nowrap;
                }
                .financing-request-actions .delete-btn {
                  grid-column: -2 / -1;
                  margin-left: auto;
                }
                @media (min-width: 768px) {
                  .financing-request-actions {
                    grid-template-columns: auto;
                    gap: 0.75rem;
                  }
                  .financing-request-actions button {
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                  }
                  .financing-request-actions .delete-btn {
                    grid-column: auto;
                    margin-left: auto;
                  }
                }
              `}</style>
              <div className="financing-request-actions">
                <button
                  onClick={() => handleStatusChange(req.id, "approved")}
                  style={{ border: "1px solid #10b981", color: "#10b981" }}>
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "rejected")}
                  style={{ border: "1px solid #ef4444", color: "#ef4444" }}>
                  Reject
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "paying")}
                  style={{ border: "1px solid #3b82f6", color: "#3b82f6" }}>
                  <span className="hidden sm:inline">Mark</span> Paying
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "completed")}
                  style={{ border: "1px solid #6b7280", color: "#6b7280" }}>
                  Done
                </button>
                <button
                  onClick={() => handleReply(req.email, req.carTitle)}
                  style={{ border: "1px solid #f59e0b", color: "#f59e0b" }}>
                  Reply
                </button>
                <button
                  onClick={() => setSelectedRequest(req)}
                  style={{ border: "1px solid #fd6b33", color: "#fd6b33" }}>
                  <Eye size={14} /> <span className="hidden sm:inline">View</span>
                </button>
                <button
                  onClick={() => handleDelete(req.id)}
                  className="delete-btn"
                  style={{ border: "1px solid rgba(220,38,38,0.4)", color: "#ef4444" }}>
                  <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Modal */}
      <style>{`
        .financing-modal {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          overflow-y: auto;
          background-color: rgba(0, 0, 0, 0.95);
        }
        @media (min-width: 768px) {
          .financing-modal {
            padding: 1rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal {
            padding: 1.5rem;
          }
        }
        .financing-modal-content {
          background-color: #111111;
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 0.75rem;
          width: 100%;
          max-width: 100%;
          max-height: 95vh;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1rem;
        }
        @media (min-width: 640px) {
          .financing-modal-content {
            max-width: 95vw;
            border-radius: 1rem;
            padding: 1.25rem;
          }
        }
        @media (min-width: 768px) {
          .financing-modal-content {
            max-width: 650px;
            border-radius: 1.25rem;
            padding: 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-content {
            max-width: 750px;
            padding: 2rem;
          }
        }
        .financing-modal-section {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .financing-modal-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        @media (min-width: 768px) {
          .financing-modal-section {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-section {
            margin-bottom: 2rem;
            padding-bottom: 2rem;
          }
        }
        .financing-modal-section-title {
          font-size: 0.7rem;
          margin-bottom: 0.75rem;
          color: #f59e0b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media (min-width: 768px) {
          .financing-modal-section-title {
            font-size: 0.75rem;
            margin-bottom: 1rem;
          }
        }
        .financing-modal-row {
          margin-bottom: 1rem;
        }
        .financing-modal-row:last-child {
          margin-bottom: 0;
        }
        .financing-modal-label {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.3rem;
          display: block;
        }
        @media (min-width: 768px) {
          .financing-modal-label {
            font-size: 0.7rem;
            margin-bottom: 0.4rem;
          }
        }
        .financing-modal-value {
          font-size: 0.8rem;
          color: white;
          font-weight: 500;
        }
        @media (min-width: 768px) {
          .financing-modal-value {
            font-size: 0.9rem;
          }
        }
        .financing-modal-header-title {
          font-size: clamp(1.25rem, 5vw, 1.75rem);
          font-weight: 600;
        }
        .financing-modal-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          row-gap: 1rem;
        }
        @media (min-width: 768px) {
          .financing-modal-grid-2col {
            grid-template-columns: 1fr 1fr;
            gap: 1rem 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-grid-2col {
            gap: 1.25rem 1.75rem;
          }
        }
        .financing-modal-grid-3col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          row-gap: 1rem;
        }
        @media (min-width: 768px) {
          .financing-modal-grid-3col {
            grid-template-columns: 1fr 1fr;
            gap: 1rem 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-grid-3col {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1.25rem 1.75rem;
          }
        }
        .financing-modal-grid-responsive-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          row-gap: 1rem;
        }
        @media (min-width: 768px) {
          .financing-modal-grid-responsive-2col {
            grid-template-columns: 1fr 1fr;
            gap: 1rem 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-grid-responsive-2col {
            gap: 1.25rem 1.75rem;
          }
        }
        .financing-modal-grid-documents {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          row-gap: 1rem;
        }
        @media (min-width: 768px) {
          .financing-modal-grid-documents {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-grid-documents {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          }
        }
        .financing-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .financing-modal-actions button {
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-family: 'Outfit', sans-serif;
          font-size: 0.75rem;
          cursor: pointer;
          min-height: 44px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .financing-modal-actions {
            flex-direction: row;
            gap: 0.75rem;
            margin-top: 1.5rem;
          }
          .financing-modal-actions button {
            padding: 0.65rem 1rem;
            font-size: 0.8rem;
            flex: 1;
            min-width: 100px;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-actions {
            gap: 1rem;
            margin-top: 2rem;
          }
          .financing-modal-actions button {
            padding: 0.75rem 1.25rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 lg:p-6 bg-black/90 overflow-y-auto">
          <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-gray-900 border border-amber-500/20 p-4 md:p-6">
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
                gap: "1rem",
              }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2
                  className="font-bebas financing-modal-header-title"
                  style={{
                    color: "white",
                    lineHeight: 1.2,
                    marginBottom: "0.5rem",
                    fontWeight: 600
                  }}>
                  Financing Application
                </h2>
                <p
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.95rem",
                    color: "#f59e0b",
                    fontWeight: 500
                  }}>
                  {selectedRequest.firstName} {selectedRequest.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  padding: 0,
                }}>
                <X size={24} />
              </button>
            </div>

            {/* SECTION 1: Personal Information */}
            <div className="pb-4 md:pb-6 border-b border-white/5 last:border-b-0 mb-4 md:mb-6">
              <h3
                className="text-xs md:text-sm text-amber-500 font-semibold uppercase tracking-wider mb-3 md:mb-4"
                style={{
                  fontFamily: "Outfit",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem"
                }}>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {[
                  {
                    label: "Full Name",
                    value: `${selectedRequest.firstName} ${selectedRequest.lastName}`,
                  },
                  { label: "Email", value: selectedRequest.email },
                  { label: "Phone", value: selectedRequest.phone },
                  {
                    label: "License Number",
                    value: selectedRequest.licenseNumber,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.7rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.25rem",
                      }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.875rem",
                        color: "white",
                      }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Vehicle & Loan Details */}
            <div
              style={{
                marginBottom: "2rem",
                paddingBottom: "2rem",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
              <h3
                className="financing-modal-section-title"
                style={{
                  fontFamily: "Outfit",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem"
                }}>
                Vehicle & Loan Details
              </h3>
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                style={{
                  marginBottom: "1.5rem",
                }}>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {selectedRequest.carTitle}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle Price
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {fmt(selectedRequest.totalAmount)}
                  </p>
                </div>
              </div>
              <p
                className="font-bebas"
                style={{
                  fontSize: "1.5rem",
                  color: "#f59e0b",
                  marginBottom: "1.5rem",
                }}>
                {fmt(selectedRequest.totalAmount)}
              </p>
              <div className="financing-modal-grid-responsive-2col">
                {[
                  {
                    label: "Down Payment",
                    value: fmt(selectedRequest.downPayment),
                  },
                  {
                    label: "Loan Term",
                    value: `${selectedRequest.loanTerm} months`,
                  },
                  {
                    label: "Monthly Payment",
                    value: fmt(selectedRequest.monthlyPayment),
                  },
                  {
                    label: "Total Interest",
                    value: fmt(selectedRequest.totalInterest),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.7rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.25rem",
                      }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.875rem",
                        color: "white",
                      }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Employment Details */}
            {selectedRequest.employer && (
              <div
                style={{
                  marginBottom: "2rem",
                  paddingBottom: "2rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                <h3
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "1rem",
                  }}>
                  Employment Details
                </h3>
                <div className="financing-modal-grid-responsive-2col" style={{ marginBottom: "1.5rem" }}>
                  {[
                    { label: "Employer", value: selectedRequest.employer },
                    { label: "Job Title", value: selectedRequest.jobTitle },
                    {
                      label: "Employment Type",
                      value:
                        selectedRequest.employmentType
                          ?.replace(/([A-Z])/g, " $1")
                          .trim() || "—",
                    },
                    {
                      label: "Years Employed",
                      value: `${selectedRequest.yearsEmployed} years`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.25rem",
                        }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.875rem",
                          color: "white",
                        }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {[
                    {
                      label: "Monthly Income",
                      value: fmt(selectedRequest.monthlyIncome || 0),
                    },
                    {
                      label: "Monthly Expenses",
                      value: fmt(selectedRequest.monthlyExpenses || 0),
                    },
                    {
                      label: "Net Monthly",
                      value: fmt(
                        (selectedRequest.monthlyIncome || 0) -
                          (selectedRequest.monthlyExpenses || 0),
                      ),
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.25rem",
                        }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.875rem",
                          color: "white",
                        }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Documents */}
            {selectedRequest.documents &&
              selectedRequest.documents.length > 0 && (
                <div
                  style={{
                    marginBottom: "2rem",
                    paddingBottom: "2rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                  <h3
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "1rem",
                    }}>
                    Documents ({selectedRequest.documents.length})
                  </h3>
                  <div className="financing-modal-grid-documents">
                    {selectedRequest.documents.map((doc) => (
                      <div
                        key={doc.url}
                        style={{
                          backgroundColor: "#0f0f0f",
                          borderRadius: "0.75rem",
                          padding: "1rem",
                          textAlign: "center",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                        <p
                          style={{
                            fontFamily: "Outfit",
                            fontSize: "0.65rem",
                            color: "rgba(255,255,255,0.4)",
                            marginBottom: "0.75rem",
                            textTransform: "capitalize",
                          }}>
                          {doc.type.replace(/_/g, " ")}
                        </p>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "0.5rem 1rem",
                            backgroundColor: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.3)",
                            color: "#f59e0b",
                            borderRadius: "0.5rem",
                            fontFamily: "Outfit",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}>
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {!selectedRequest.documents ||
              (selectedRequest.documents.length === 0 && (
                <div
                  style={{
                    marginBottom: "2rem",
                    paddingBottom: "2rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                  <h3
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "1rem",
                    }}>
                    Documents
                  </h3>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.3)",
                    }}>
                    No documents uploaded
                  </p>
                </div>
              ))}

            {/* SECTION 5: Application Status */}
            <div>
              <h3
                className="financing-modal-section-title"
                style={{
                  fontFamily: "Outfit",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem"
                }}>
                Application Status
              </h3>
              <div style={{ marginBottom: "1.5rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: statusColor[selectedRequest.status],
                    color: "#000",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}>
                  {statusLabel[selectedRequest.status]}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "1.5rem",
                }}>
                Submitted{" "}
                {fmtDate(
                  selectedRequest.createdAt as unknown as {
                    toDate: () => Date;
                  },
                )}
              </p>
              <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-wrap mt-4 md:mt-6">
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "approved");
                    setSelectedRequest(null);
                  }}
                  className="w-full md:flex-1 py-2 px-3 md:py-2.5 md:px-4 text-xs md:text-sm min-h-[44px] rounded border border-emerald-500 text-emerald-500 bg-transparent hover:bg-emerald-500/10 transition-colors">
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "rejected");
                    setSelectedRequest(null);
                  }}
                  className="w-full md:flex-1 py-2 px-3 md:py-2.5 md:px-4 text-xs md:text-sm min-h-[44px] rounded border border-red-500 text-red-500 bg-transparent hover:bg-red-500/10 transition-colors">
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "paying");
                    setSelectedRequest(null);
                  }}
                  className="w-full md:flex-1 py-2 px-3 md:py-2.5 md:px-4 text-xs md:text-sm min-h-[44px] rounded border border-blue-500 text-blue-500 bg-transparent hover:bg-blue-500/10 transition-colors">
                  Mark Paying
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "completed");
                    setSelectedRequest(null);
                  }}
                  className="w-full md:flex-1 py-2 px-3 md:py-2.5 md:px-4 text-xs md:text-sm min-h-[44px] rounded border border-gray-600 text-gray-400 bg-transparent hover:bg-gray-600/10 transition-colors">
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
