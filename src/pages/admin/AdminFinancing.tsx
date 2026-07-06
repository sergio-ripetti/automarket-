import { useEffect, useState } from 'react'
import { Trash2, Eye, X } from 'lucide-react'
import { getFinancingRequests, updateFinancingStatus, deleteFinancingRequest } from '../../lib/financingService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { FinancingRequest } from '../../lib/financingService'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paying' | 'completed'

// Formats a number as NZD currency for display
function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

// Converts a Firestore Timestamp into a readable NZ date string
function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusColor: Record<FinancingRequest['status'], string> = {
  pending: '#2E86AB', approved: '#10b981', rejected: '#ef4444',
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

// Admin page listing all financing requests - lets staff filter by status, review applicant details,
// and approve/reject/update applications; data is loaded from and written back to Firestore
export default function AdminFinancing() {
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [selectedRequest, setSelectedRequest] = useState<FinancingRequest | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  // Fetches all financing requests from Firestore on mount and populates local state
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

  // Updates a financing request's status (approved/rejected/paying/completed) in Firestore and syncs local state
  const handleStatusChange = async (id: string, newStatus: FinancingRequest['status']) => {
    try {
      await updateFinancingStatus(id, newStatus)
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
      showToast(`Status updated to ${statusLabel[newStatus]}.`, 'success')
    } catch {
      showToast('Failed to update status.', 'error')
    }
  }

  // Deletes a financing request from Firestore after user confirmation, then removes it from local state
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

  // Opens the user's default mail client with a pre-filled reply to the applicant's financing request
  const handleReply = (email: string, carTitle: string) => {
    const subject = `Re: Financing Request - ${carTitle}`
    const body = encodeURIComponent('Thank you for your financing application. We will review your request and get back to you shortly.')
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  return (
    <div id="admin-financing-main-container" className="admin-financing-main-container">
      <style>{`
        .financing-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          margin-bottom: clamp(1.5rem, 4vw, 2rem);
          font-weight: 600;
        }
      `}</style>
      <h1 className="font-bebas text-[#0D1B2A] mb-8 financing-page-title">Financing Requests</h1>

      {/* Tabs */}
      <div id="admin-financing-tabs" className="admin-financing-tabs flex flex-wrap gap-2 mb-8">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            id={`admin-financing-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-full text-sm font-inter font-medium transition-all ${
              activeTab === id
                ? 'bg-#2E86AB text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Requests */}
      <div id="admin-financing-list-wrapper" className="admin-financing-list-wrapper space-y-6 md:space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-dark border border-white/5 rounded-lg h-48 animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-white/30 font-inter text-sm">
            No financing requests{" "}
            {activeTab !== "all" &&
              `with status "${statusLabel[activeTab as FinancingRequest["status"]]}"`}
          </p>
        ) : (
          filtered.map((req, idx) => (
            <div
              key={req.id}
              id={`admin-financing-card-${idx}`}
              className={`admin-financing-card admin-financing-card-${idx} bg-dark border border-white/5 rounded-lg hover:border-#2E86AB/20 transition-colors`}
              style={{ marginBottom: '1.5rem', padding: '10px' }}>
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
                      color: "#0D1B2A",
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
                    backgroundColor: req.status === 'approved' ? 'rgba(34,197,94,0.12)'
                      : req.status === 'rejected' ? 'rgba(239,68,68,0.12)'
                      : req.status === 'paying' ? 'rgba(59,130,246,0.12)'
                      : req.status === 'completed' ? 'rgba(107,114,128,0.12)'
                      : 'rgba(29,78,216,0.12)',
                    color: statusColor[req.status],
                    border: `1px solid ${req.status === 'approved' ? 'rgba(34,197,94,0.3)'
                      : req.status === 'rejected' ? 'rgba(239,68,68,0.3)'
                      : req.status === 'paying' ? 'rgba(59,130,246,0.3)'
                      : req.status === 'completed' ? 'rgba(107,114,128,0.3)'
                      : 'rgba(29,78,216,0.3)'}`,
                    padding: "0.35rem 0.75rem",
                    borderRadius: "0.375rem",
                    fontFamily: "Outfit",
                    fontSize: "0.75rem",
                    fontWeight: 600,
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
                      color: "#0D1B2A",
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
                      color: "#2E86AB",
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
                    style={{ fontSize: "1rem", color: "#2E86AB" }}>
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
                      color: "#0D1B2A",
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
                  grid-template-columns: repeat(2, 1fr);
                  gap: 0.5rem;
                }
                .financing-request-actions button {
                  padding: 0.5rem 0.75rem;
                  border-radius: 0.5rem;
                  font-family: 'Outfit', sans-serif;
                  font-size: 0.75rem;
                  background-color: transparent;
                  cursor: pointer;
                  min-height: 38px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.3rem;
                  white-space: nowrap;
                  width: 100%;
                }
                .financing-request-actions .delete-btn {
                  grid-column: 1 / -1;
                }
                @media (min-width: 1024px) {
                  .financing-request-actions {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                  }
                  .financing-request-actions .delete-btn {
                    grid-column: auto;
                  }
                }
                .admin-financing-approve-btn:hover {
                  background: rgba(34,197,94,0.12) !important;
                  box-shadow: 0 0 10px rgba(34,197,94,0.15);
                }
                .admin-financing-reject-btn:hover {
                  background: rgba(239,68,68,0.12) !important;
                  box-shadow: 0 0 10px rgba(239,68,68,0.15);
                }
                .admin-financing-paying-btn:hover {
                  background: rgba(59,130,246,0.12) !important;
                  box-shadow: 0 0 10px rgba(59,130,246,0.15);
                }
                .admin-financing-complete-btn:hover {
                  background: rgba(107,114,128,0.15) !important;
                }
                .admin-financing-reply-btn:hover {
                  background: rgba(29,78,216,0.12) !important;
                  box-shadow: 0 0 10px rgba(29,78,216,0.2);
                }
                .admin-financing-view-btn:hover {
                  background: rgba(255,255,255,0.08) !important;
                  border-color: rgba(255,255,255,0.3) !important;
                  color: white !important;
                }
                .admin-financing-delete-btn:hover {
                  background: rgba(239,68,68,0.08) !important;
                  border-color: rgba(239,68,68,0.5) !important;
                }
              `}</style>
              <div id={`admin-financing-card-actions-${idx}`} className="admin-financing-card-actions financing-request-actions">
                <button
                  className="admin-financing-approve-btn"
                  onClick={() => handleStatusChange(req.id, "approved")}
                  style={{
                    border: "1px solid rgba(34,197,94,0.35)",
                    color: "rgba(34,197,94,0.85)",
                    background: "rgba(34,197,94,0.06)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  Approve
                </button>
                <button
                  className="admin-financing-reject-btn"
                  onClick={() => handleStatusChange(req.id, "rejected")}
                  style={{
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "rgba(239,68,68,0.8)",
                    background: "rgba(239,68,68,0.05)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  Reject
                </button>
                <button
                  className="admin-financing-paying-btn"
                  onClick={() => handleStatusChange(req.id, "paying")}
                  style={{
                    border: "1px solid rgba(59,130,246,0.35)",
                    color: "rgba(59,130,246,0.85)",
                    background: "rgba(59,130,246,0.06)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  <span className="hidden sm:inline">Mark</span> Paying
                </button>
                <button
                  className="admin-financing-complete-btn"
                  onClick={() => handleStatusChange(req.id, "completed")}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                    background: "rgba(255,255,255,0.04)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  Done
                </button>
                <button
                  className="admin-financing-reply-btn"
                  onClick={() => handleReply(req.email, req.carTitle)}
                  style={{
                    border: "1px solid rgba(29,78,216,0.45)",
                    color: "#2E86AB",
                    background: "rgba(29,78,216,0.08)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  Reply
                </button>
                <button
                  className="admin-financing-view-btn"
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.55)",
                    background: "rgba(255,255,255,0.04)",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
                  <Eye size={14} /> <span className="hidden sm:inline">View</span>
                </button>
                <button
                  className="admin-financing-delete-btn delete-btn"
                  onClick={() => handleDelete(req.id)}
                  style={{
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "rgba(239,68,68,0.6)",
                    background: "transparent",
                    transition: "all 0.2s ease",
                    fontWeight: 500,
                  }}>
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
          background-color: rgba(15, 23, 42, 0.95);
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
          background-color: #FFFFFF;
          border: 1px solid rgba(29,78,216,0.2);
          border-radius: 0.75rem;
          width: 100%;
          max-width: 100%;
          max-height: 95vh;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.25rem;
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
            padding: 1.25rem;
          }
        }
        @media (min-width: 1024px) {
          .financing-modal-content {
            max-width: 750px;
            padding: 1.25rem;
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
          color: #2E86AB;
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
        <div id="admin-financing-modal-overlay" className="admin-financing-modal-overlay fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-4 lg:p-6 bg-[#EEF2F7]/90 overflow-y-auto">
          <div id="admin-financing-modal-detail" className="admin-financing-modal-detail w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-gray-900 border border-#2E86AB/20" style={{ padding: '1.25rem' }}>
            {/* Header */}
            <div
              id="admin-modal-header"
              className="admin-modal-header"
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
                    color: "#0D1B2A",
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
                    color: "#2E86AB",
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
            <div className="pb-6 md:pb-8 border-b border-white/5 last:border-b-0 mb-6 md:mb-8">
              <h3
                className="text-xs md:text-sm text-#2E86AB font-semibold uppercase tracking-wider mb-3 md:mb-4"
                style={{
                  fontFamily: "Outfit",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem"
                }}>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                        color: "#0D1B2A",
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
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
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
                      color: "#0D1B2A",
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
                      color: "#0D1B2A",
                    }}>
                    {fmt(selectedRequest.totalAmount)}
                  </p>
                </div>
              </div>
              <p
                className="font-bebas"
                style={{
                  fontSize: "1.5rem",
                  color: "#2E86AB",
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
                        color: "#0D1B2A",
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
                          color: "#0D1B2A",
                        }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                          color: "#0D1B2A",
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
                          backgroundColor: "#EEF2F7",
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
                            backgroundColor: "rgba(29,78,216,0.1)",
                            border: "1px solid rgba(29,78,216,0.3)",
                            color: "#2E86AB",
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
                    padding: "0.35rem 0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: selectedRequest.status === 'approved' ? 'rgba(34,197,94,0.12)'
                      : selectedRequest.status === 'rejected' ? 'rgba(239,68,68,0.12)'
                      : selectedRequest.status === 'paying' ? 'rgba(59,130,246,0.12)'
                      : selectedRequest.status === 'completed' ? 'rgba(107,114,128,0.12)'
                      : 'rgba(29,78,216,0.12)',
                    color: statusColor[selectedRequest.status],
                    border: `1px solid ${selectedRequest.status === 'approved' ? 'rgba(34,197,94,0.3)'
                      : selectedRequest.status === 'rejected' ? 'rgba(239,68,68,0.3)'
                      : selectedRequest.status === 'paying' ? 'rgba(59,130,246,0.3)'
                      : selectedRequest.status === 'completed' ? 'rgba(107,114,128,0.3)'
                      : 'rgba(29,78,216,0.3)'}`,
                    fontFamily: "Outfit",
                    fontSize: "0.75rem",
                    fontWeight: 600,
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4 md:mt-6">
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "approved");
                    setSelectedRequest(null);
                  }}
                  className="py-1.5 px-2 text-xs md:py-2.5 md:px-4 md:text-sm min-h-[40px] md:min-h-[44px] rounded transition-all font-medium font-inter"
                  style={{
                    border: "1px solid rgba(34,197,94,0.35)",
                    color: "rgba(34,197,94,0.85)",
                    background: "rgba(34,197,94,0.06)",
                  }}>
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "rejected");
                    setSelectedRequest(null);
                  }}
                  className="py-1.5 px-2 text-xs md:py-2.5 md:px-4 md:text-sm min-h-[40px] md:min-h-[44px] rounded transition-all font-medium font-inter"
                  style={{
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "rgba(239,68,68,0.8)",
                    background: "rgba(239,68,68,0.05)",
                  }}>
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "paying");
                    setSelectedRequest(null);
                  }}
                  className="py-1.5 px-2 text-xs md:py-2.5 md:px-4 md:text-sm min-h-[40px] md:min-h-[44px] rounded transition-all font-medium font-inter"
                  style={{
                    border: "1px solid rgba(59,130,246,0.35)",
                    color: "rgba(59,130,246,0.85)",
                    background: "rgba(59,130,246,0.06)",
                  }}>
                  Mark Paying
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "completed");
                    setSelectedRequest(null);
                  }}
                  className="py-1.5 px-2 text-xs md:py-2.5 md:px-4 md:text-sm min-h-[40px] md:min-h-[44px] rounded transition-all font-medium font-inter"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                    background: "rgba(255,255,255,0.04)",
                  }}>
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
