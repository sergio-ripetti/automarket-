import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, X, CircleCheck, CircleX, MessageCircle, CreditCard, Car, Eye, Printer } from 'lucide-react'
import { getFinancingApplications, updateFinancingStatus, deleteFinancingApplication } from '../../lib/adminFinancingService'
import { sortByCreatedAtDesc } from '../../lib/timestampUtils'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import { DocumentGrid } from '../../components/shared/DocumentGrid'
import { downloadFinancingDocument } from '../../lib/downloadFinancingDocument'
import type { FinancingRequest } from '../../lib/financingService'

// Background refresh interval - within the required 10-30s bound
const REFRESH_INTERVAL_MS = 20000

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paying' | 'completed'

function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Safe display helpers for legacy records that may be missing fields or carry invalid values -
// these must never throw, and must never render "NaN" or "undefined" in the UI.
function safeText(value: string | undefined | null): string {
  if (value === undefined || value === null) return 'Not provided'
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : 'Not provided'
}

function safeMoney(value: number | undefined | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not provided'
  return fmt(value)
}

function safeYears(value: number | undefined | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not provided'
  return `${value} year${value === 1 ? '' : 's'}`
}

function safeEmploymentType(value: string | undefined): string {
  if (!value) return 'Not provided'
  return value.replace(/([A-Z])/g, ' $1').trim()
}

// Vehicle price and total repayment are not stored directly in Firestore - only the financed
// amount (totalAmount), down payment, monthly payment and loan term are. These are pure display
// derivations from those already-stored/returned fields (same formulas as financingCalculations.ts's
// calculateTotalRepayment), not a recalculation of business logic and not a change to the
// submission flow. Returns null (rendered as "Not provided") if the inputs are missing/invalid.
function computeVehiclePrice(req: FinancingRequest): number | null {
  const financed = req.totalAmount
  const down = req.downPayment
  if (typeof financed !== 'number' || !Number.isFinite(financed)) return null
  if (typeof down !== 'number' || !Number.isFinite(down)) return null
  return financed + down
}

function computeTotalRepayment(req: FinancingRequest): number | null {
  const monthly = req.monthlyPayment
  const term = req.loanTerm
  const down = req.downPayment
  if (typeof monthly !== 'number' || !Number.isFinite(monthly)) return null
  if (typeof term !== 'number' || !Number.isFinite(term)) return null
  if (typeof down !== 'number' || !Number.isFinite(down)) return null
  return monthly * term + down
}

const statusLabel: Record<FinancingRequest['status'], string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  paying: 'Paying', completed: 'Completed',
}

const tabs: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' }, { id: 'paying', label: 'Paying' }, { id: 'completed', label: 'Completed' },
]

type ViewState = 'loading' | 'loaded' | 'forbidden' | 'error'

export default function AdminFinancing() {
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [selectedRequest, setSelectedRequest] = useState<FinancingRequest | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  // Guards against overlapping requests (a slow response must not race a poll tick)
  const isFetchingRef = useRef(false)
  // Ensures a persistent failure only toasts once, not on every poll tick
  const hasNotifiedErrorRef = useRef(false)

  // Loads applications once (initial mount) or silently in the background (poll tick).
  // Returns whether polling should stop (401/403 - the user cannot become admin without
  // reloading/re-authenticating, so continuing to poll would just repeat the same rejection).
  const load = useCallback(async (isBackgroundRefresh: boolean): Promise<{ stopPolling: boolean }> => {
    if (isFetchingRef.current) return { stopPolling: false }
    isFetchingRef.current = true
    try {
      const result = await getFinancingApplications()
      if (result.success && result.applications) {
        setRequests(sortByCreatedAtDesc(result.applications))
        setViewState('loaded')
        hasNotifiedErrorRef.current = false
        return { stopPolling: false }
      }

      if (result.status === 401 || result.status === 403) {
        setViewState('forbidden')
        if (!hasNotifiedErrorRef.current) {
          showToast('You do not have administrator access.', 'error')
          hasNotifiedErrorRef.current = true
        }
        return { stopPolling: true }
      }

      // Background refresh failures never clobber an already-rendered list with an error state
      if (!isBackgroundRefresh) {
        setViewState('error')
      }
      if (!hasNotifiedErrorRef.current) {
        showToast(result.error || 'Failed to load financing requests.', 'error')
        hasNotifiedErrorRef.current = true
      }
      return { stopPolling: false }
    } catch (err) {
      console.error(err)
      if (!isBackgroundRefresh) {
        setViewState('error')
      }
      if (!hasNotifiedErrorRef.current) {
        showToast('Failed to load financing requests.', 'error')
        hasNotifiedErrorRef.current = true
      }
      return { stopPolling: false }
    } finally {
      isFetchingRef.current = false
    }
  }, [showToast])

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | undefined

    const run = async (isBackgroundRefresh: boolean) => {
      const outcome = await load(isBackgroundRefresh)
      if (cancelled) return
      if (outcome.stopPolling && intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
    }

    run(false)
    intervalId = setInterval(() => run(true), REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalId !== undefined) clearInterval(intervalId)
    }
  }, [load])

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab)

  const handleStatusChange = async (id: string, newStatus: FinancingRequest['status']) => {
    try {
      const result = await updateFinancingStatus(id, newStatus)
      if (result.success) {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
        showToast(`Status updated to ${statusLabel[newStatus]}.`, 'success')
      } else {
        showToast(result.error || 'Failed to update status.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to update status.', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this financing request? This cannot be undone.')) return
    try {
      const result = await deleteFinancingApplication(id)
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
        showToast('Request deleted.', 'success')
      } else {
        showToast(result.error || 'Failed to delete request.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to delete request.', 'error')
    }
  }

  const handleReply = (email: string, carTitle: string) => {
    const subject = `Re: Financing Request - ${carTitle}`
    const body = encodeURIComponent('Thank you for your financing application. We will review your request and get back to you shortly.')
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  const handlePrint = () => {
    window.print()
  }

  const modalCloseButtonRef = useRef<HTMLButtonElement>(null)

  // Modal lifecycle: Escape closes it, body scroll is locked while open, and the close button
  // receives focus on open so keyboard users land somewhere reachable inside the dialog.
  useEffect(() => {
    if (!selectedRequest) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedRequest(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalCloseButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [selectedRequest])

  return (
    <div id="admin-financing-main-container" className="admin-financing-main-container">
      <style>{`
        .financing-print-only {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .financing-print-area, .financing-print-area * {
            visibility: visible;
          }
          .financing-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
          }
          .financing-modal-body {
            overflow: visible !important;
          }
          .financing-print-hide {
            display: none !important;
          }
          .financing-print-only {
            display: block !important;
          }
        }
        .financing-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          margin-bottom: clamp(1.5rem, 4vw, 2rem);
          font-weight: 600;
        }
        .financing-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
          transition: all 0.2s ease;
        }
        .financing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
        }
        .financing-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 24px;
        }
        .financing-card-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }
        .financing-card-header-content h3 {
          font-family: 'Poppins', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #0D1B2A;
          margin: 0;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .financing-card-header-content p {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          color: #6B7280;
          margin: 0;
          margin-bottom: 4px;
        }
        .financing-card-header-content .request-id {
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 500;
        }
        .financing-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .financing-status-pending { background: #FEF3C7; color: #92400E; }
        .financing-status-approved { background: #D1FAE5; color: #065F46; }
        .financing-status-rejected { background: #FEE2E2; color: #7F1D1D; }
        .financing-status-paying { background: #DBEAFE; color: #1E40AF; }
        .financing-status-completed { background: #F3F4F6; color: #374151; }
        .financing-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px 32px;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #E5E7EB;
        }
        .financing-info-block label {
          display: block;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .financing-info-block .value {
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #0D1B2A;
          line-height: 1.3;
        }
        .financing-submitted {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 24px;
        }
        .financing-actions {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .financing-actions {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 768px) {
          .financing-actions {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .financing-card-header {
            flex-direction: column;
          }
          .financing-info-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (max-width: 640px) {
          .financing-card {
            padding: 20px;
            margin-bottom: 20px;
          }
          .financing-actions {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
        .financing-btn {
          height: 44px;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          border: 1px solid;
          white-space: nowrap;
        }
        .financing-btn-approve {
          border-color: #4CAF50;
          color: #4CAF50;
          background: white;
        }
        .financing-btn-approve:hover {
          background: #4CAF50;
          color: white;
        }
        .financing-btn-reject {
          border-color: #EF4444;
          color: #EF4444;
          background: white;
        }
        .financing-btn-reject:hover {
          background: #EF4444;
          color: white;
        }
        .financing-btn-paying {
          border-color: #3B82F6;
          color: #3B82F6;
          background: white;
        }
        .financing-btn-paying:hover {
          background: #3B82F6;
          color: white;
        }
        .financing-btn-view {
          border-color: #93C5FD;
          color: #1E40AF;
          background: #EFF6FF;
        }
        .financing-btn-view:hover {
          background: #DBEAFE;
        }
        .financing-btn-reply {
          border-color: #D1D5DB;
          color: #374151;
          background: #F9FAFB;
        }
        .financing-btn-reply:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }
        .financing-btn-delete {
          border-color: #EF4444;
          color: #EF4444;
          background: white;
        }
        .financing-btn-delete:hover {
          background: #FEE2E2;
        }
        .modal-section {
          padding-bottom: clamp(16px, 4vw, 24px);
          margin-bottom: clamp(16px, 4vw, 24px);
          border-bottom: 1px solid #E5E7EB;
        }
        .modal-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .modal-section-title {
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #6B7280;
          margin-bottom: clamp(10px, 2.5vw, 16px);
        }
        .modal-field {
          margin-bottom: clamp(10px, 2.5vw, 16px);
        }
        .modal-field-label {
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6B7280;
          margin-bottom: 6px;
        }
        .modal-field-value {
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          color: #0D1B2A;
          font-weight: 500;
        }
        .modal-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .modal-grid-2col {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }
        .modal-grid-3col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .modal-grid-3col {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
          }
        }
        .modal-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 24px;
        }
        @media (max-width: 768px) {
          .modal-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .modal-actions {
            grid-template-columns: 1fr;
          }
        }
        .modal-btn {
          height: 44px;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          border: 1px solid;
          white-space: nowrap;
        }
        .modal-btn-approve {
          border-color: #4CAF50;
          color: #4CAF50;
          background: white;
        }
        .modal-btn-approve:hover {
          background: #4CAF50;
          color: white;
        }
        .modal-btn-reject {
          border-color: #EF4444;
          color: #EF4444;
          background: white;
        }
        .modal-btn-reject:hover {
          background: #EF4444;
          color: white;
        }
        .modal-btn-paying {
          border-color: #3B82F6;
          color: #3B82F6;
          background: white;
        }
        .modal-btn-paying:hover {
          background: #3B82F6;
          color: white;
        }
        .modal-btn-complete {
          border-color: #D1D5DB;
          color: #374151;
          background: #F9FAFB;
        }
        .modal-btn-complete:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }
        .status-badge-modal {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .status-badge-pending { background: #FEF3C7; color: #92400E; }
        .status-badge-approved { background: #D1FAE5; color: #065F46; }
        .status-badge-rejected { background: #FEE2E2; color: #7F1D1D; }
        .status-badge-paying { background: #DBEAFE; color: #1E40AF; }
        .status-badge-completed { background: #F3F4F6; color: #374151; }
        .financing-modal-overlay {
          background-color: rgba(15, 23, 42, 0.5) !important;
        }
        .financing-modal-content {
          background-color: #FFFFFF !important;
          border: 1px solid #E5E7EB !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15) !important;
          width: 100%;
          max-width: calc(100vw - 24px);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .financing-modal-content {
            max-width: 42rem;
          }
        }
        .financing-modal-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #FFFFFF;
          padding: clamp(16px, 4vw, 32px) clamp(16px, 4vw, 32px) clamp(12px, 3vw, 20px);
          border-bottom: 1px solid #E5E7EB;
          flex-shrink: 0;
        }
        .financing-modal-title {
          font-size: clamp(19px, 4.5vw, 24px);
        }
        .financing-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: clamp(16px, 4vw, 32px);
        }
      `}</style>

      <h1 className="font-bebas text-[#0D1B2A] mb-5 financing-page-title">
        Financing Requests
      </h1>

      {/* Filter Navigation Tabs */}
      <div id="admin-financing-tabs" className="admin-financing-tabs mb-8">
        <style>{`
          .filter-tabs-container {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 0 8px 0;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .filter-tabs-container::-webkit-scrollbar {
            display: none;
          }
          .filter-tab {
            display: inline-flex;
            align-items: center;
            padding: 12px 18px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            border-radius: 8px 8px 0 0;
            font-family: 'Poppins', sans-serif;
            font-size: 15px;
            font-weight: 500;
            color: #6B7280;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .filter-tab:hover {
            background-color: #F3F4F6;
            color: #111827;
          }
          .filter-tab.active {
            background-color: #EEF2FF;
            color: #2563EB;
            border-bottom-color: #2563EB;
            font-weight: 600;
          }
          .filter-tab.active:hover {
            background-color: #E0E7FF;
          }
          @media (max-width: 768px) {
            .filter-tabs-container {
              gap: 16px;
            }
            .filter-tab {
              padding: 10px 16px;
              font-size: 14px;
            }
          }
        `}</style>
        <div className="filter-tabs-container">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              id={`admin-financing-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`filter-tab ${activeTab === id ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests */}
      <div id="admin-financing-list-wrapper" className="admin-financing-list-wrapper">
        {viewState === 'loading' ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="financing-card animate-pulse"
              style={{ backgroundColor: "#F3F4F6" }}
            />
          ))
        ) : viewState === 'forbidden' ? (
          <p id="admin-financing-forbidden" className="text-center py-12 text-[#DC2626] font-poppins text-sm">
            You do not have administrator access.
          </p>
        ) : viewState === 'error' ? (
          <p id="admin-financing-load-error" className="text-center py-12 text-[#DC2626] font-poppins text-sm">
            Failed to load financing requests. Please try again.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-[#6B7280] font-poppins text-sm">
            No financing requests{" "}
            {activeTab !== "all" &&
              `with status "${statusLabel[activeTab as FinancingRequest["status"]]}"`}
          </p>
        ) : (
          filtered.map((req, idx) => (
            <div
              key={req.id}
              id={`admin-financing-card-${idx}`}
              className="financing-card">
              {/* Header with Name and Status */}
              <div className="financing-card-header">
                <div className="financing-card-header-left">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", backgroundColor: "#F3F4F6", borderRadius: "8px" }}>
                    <Car size={20} color="#6B7280" />
                  </div>
                  <div className="financing-card-header-content">
                    <h3>{req.firstName} {req.lastName}</h3>
                    <p>{req.email}</p>
                    <p className="request-id">ID: {req.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <div className={`financing-status-badge financing-status-${req.status}`}>
                  {statusLabel[req.status]}
                </div>
              </div>

              {/* Information Grid */}
              <div className="financing-info-grid">
                <div className="financing-info-block">
                  <label>Vehicle</label>
                  <div className="value">{req.carTitle}</div>
                </div>
                <div className="financing-info-block">
                  <label>Loan Amount</label>
                  <div className="value">{fmt(req.totalAmount)}</div>
                </div>
                <div className="financing-info-block">
                  <label>Monthly Payment</label>
                  <div className="value">{fmt(req.monthlyPayment)}</div>
                </div>
                <div className="financing-info-block">
                  <label>Loan Term</label>
                  <div className="value">{req.loanTerm} months</div>
                </div>
              </div>

              {/* Submitted Date */}
              <p className="financing-submitted">
                Submitted {fmtDate(req.createdAt as unknown as { toDate: () => Date })}
              </p>

              {/* Actions */}
              <div id={`admin-financing-card-actions-${idx}`} className="financing-actions">
                <button
                  className="financing-btn financing-btn-view"
                  onClick={() => setSelectedRequest(req)}
                  title="View full application details">
                  <Eye size={16} />
                  <span>View Details</span>
                </button>
                <button
                  className="financing-btn financing-btn-approve"
                  onClick={() => handleStatusChange(req.id, "approved")}
                  title="Approve this financing request">
                  <CircleCheck size={16} />
                  <span>Approve</span>
                </button>
                <button
                  className="financing-btn financing-btn-reject"
                  onClick={() => handleStatusChange(req.id, "rejected")}
                  title="Reject this financing request">
                  <CircleX size={16} />
                  <span>Reject</span>
                </button>
                <button
                  className="financing-btn financing-btn-paying"
                  onClick={() => handleStatusChange(req.id, "paying")}
                  title="Mark as paying">
                  <CreditCard size={16} />
                  <span>Paying</span>
                </button>
                <button
                  className="financing-btn financing-btn-reply"
                  onClick={() => handleReply(req.email, req.carTitle)}
                  title="Send reply email">
                  <MessageCircle size={16} />
                  <span>Reply</span>
                </button>
                <button
                  className="financing-btn financing-btn-delete"
                  onClick={() => handleDelete(req.id)}
                  title="Delete this request">
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Modal */}
      {selectedRequest && (
        <div
          id="admin-financing-modal-overlay"
          className="financing-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
          onClick={() => setSelectedRequest(null)}>
          <div
            id="admin-financing-modal-detail"
            className="financing-modal-content financing-print-area"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "16px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-financing-modal-title"
            onClick={(e) => e.stopPropagation()}>
            {/* Header (sticky on mobile so the close action stays reachable without scrolling) */}
            <div className="financing-modal-header financing-print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 id="admin-financing-modal-title" className="financing-modal-title" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "#0D1B2A", lineHeight: 1.2, margin: "0 0 4px 0" }}>
                  Financing Application
                </h2>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#6B7280", margin: 0 }}>
                  {safeText(selectedRequest.firstName)} {safeText(selectedRequest.lastName)}
                </p>
              </div>
              <button
                ref={modalCloseButtonRef}
                onClick={() => setSelectedRequest(null)}
                aria-label="Close application details"
                style={{ backgroundColor: "transparent", border: "none", color: "#D1D5DB", cursor: "pointer", fontSize: "1.5rem", padding: "8px", margin: "-8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.2s ease", minWidth: "40px", minHeight: "40px" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#374151"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}>
                <X size={22} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="financing-modal-body">
            {/* Print-only heading (visible only in the printed output, not on screen) */}
            <div className="financing-print-only" style={{ display: 'none', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0' }}>Financing Application</h2>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                {safeText(selectedRequest.firstName)} {safeText(selectedRequest.lastName)} &middot; Application ID: {selectedRequest.id}
              </p>
            </div>

            {/* SECTION: Applicant Information */}
            <div className="modal-section">
              <div className="modal-section-title">Applicant Information</div>
              <div className="modal-grid-2col">
                {[
                  { label: "Full Name", value: `${safeText(selectedRequest.firstName)} ${safeText(selectedRequest.lastName)}` },
                  { label: "Email", value: safeText(selectedRequest.email) },
                  { label: "Phone", value: safeText(selectedRequest.phone) },
                  { label: "Driver Licence Number", value: safeText(selectedRequest.licenseNumber) },
                ].map(({ label, value }) => (
                  <div key={label} className="modal-field">
                    <div className="modal-field-label">{label}</div>
                    <div className="modal-field-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION: Employment Information (always rendered - legacy records show "Not provided" per field) */}
            <div className="modal-section">
              <div className="modal-section-title">Employment Information</div>
              <div className="modal-grid-2col">
                {[
                  { label: "Employer", value: safeText(selectedRequest.employer) },
                  { label: "Job Title", value: safeText(selectedRequest.jobTitle) },
                  { label: "Employment Type", value: safeEmploymentType(selectedRequest.employmentType) },
                  { label: "Years with Current Employer", value: safeYears(selectedRequest.yearsEmployed) },
                ].map(({ label, value }) => (
                  <div key={label} className="modal-field">
                    <div className="modal-field-label">{label}</div>
                    <div className="modal-field-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION: Financial Information */}
            <div className="modal-section">
              <div className="modal-section-title">Financial Information</div>
              <div className="modal-grid-2col">
                {[
                  { label: "Monthly Income", value: safeMoney(selectedRequest.monthlyIncome) },
                  { label: "Monthly Expenses", value: safeMoney(selectedRequest.monthlyExpenses) },
                ].map(({ label, value }) => (
                  <div key={label} className="modal-field">
                    <div className="modal-field-label">{label}</div>
                    <div className="modal-field-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION: Vehicle and Financing Information */}
            <div className="modal-section">
              <div className="modal-section-title">Vehicle and Financing Information</div>
              <div className="modal-grid-2col" style={{ marginBottom: "20px" }}>
                <div className="modal-field">
                  <div className="modal-field-label">Vehicle</div>
                  <div className="modal-field-value">{safeText(selectedRequest.carTitle)}</div>
                </div>
                <div className="modal-field">
                  <div className="modal-field-label">Vehicle Price</div>
                  <div className="modal-field-value">{safeMoney(computeVehiclePrice(selectedRequest))}</div>
                </div>
              </div>
              <div className="modal-grid-3col" style={{ marginBottom: "20px" }}>
                {[
                  { label: "Down Payment", value: safeMoney(selectedRequest.downPayment) },
                  { label: "Amount Financed", value: safeMoney(selectedRequest.totalAmount) },
                  { label: "Loan Term", value: typeof selectedRequest.loanTerm === 'number' ? `${selectedRequest.loanTerm} months` : 'Not provided' },
                ].map(({ label, value }) => (
                  <div key={label} className="modal-field">
                    <div className="modal-field-label">{label}</div>
                    <div className="modal-field-value">{value}</div>
                  </div>
                ))}
              </div>
              <div className="modal-grid-3col" style={{ marginBottom: "20px" }}>
                {[
                  { label: "Estimated Monthly Payment", value: safeMoney(selectedRequest.monthlyPayment) },
                  { label: "Total Repayment", value: safeMoney(computeTotalRepayment(selectedRequest)) },
                  { label: "Total Interest", value: safeMoney(selectedRequest.totalInterest) },
                ].map(({ label, value }) => (
                  <div key={label} className="modal-field">
                    <div className="modal-field-label">{label}</div>
                    <div className="modal-field-value">{value}</div>
                  </div>
                ))}
              </div>
              <div className="modal-grid-3col">
                <div className="modal-field">
                  <div className="modal-field-label">Application Status</div>
                  <div className="modal-field-value">
                    <span className={`status-badge-modal status-badge-${selectedRequest.status}`}>
                      {statusLabel[selectedRequest.status] || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="modal-field">
                  <div className="modal-field-label">Application ID</div>
                  <div className="modal-field-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{selectedRequest.id}</div>
                </div>
                <div className="modal-field">
                  <div className="modal-field-label">Submitted</div>
                  <div className="modal-field-value">{fmtDate(selectedRequest.createdAt as unknown as { toDate: () => Date })}</div>
                </div>
              </div>
            </div>

            {/* SECTION: Consent */}
            <div className="modal-section">
              <div className="modal-section-title">Consent</div>
              <div className="modal-field">
                <div className="modal-field-value">
                  Credit history consent: {selectedRequest.creditHistoryConsent ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            {/* SECTION: Supporting Documents */}
            <DocumentGrid
              title="Supporting Documents"
              emptyMessage="No supporting documents provided"
              documents={(selectedRequest.documents || [])
                .filter((doc) => doc.url)
                .map((doc) => ({ url: doc.url, filename: doc.filename }))}
              onDownload={(doc) => downloadFinancingDocument(selectedRequest.id, doc.url, doc.filename)}
            />

            {/* Actions (hidden when printing) */}
            <div className="modal-section financing-print-hide">
              <div className="modal-actions" style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "approved");
                    setSelectedRequest(null);
                  }}
                  className="modal-btn modal-btn-approve">
                  <CircleCheck size={16} />
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "rejected");
                    setSelectedRequest(null);
                  }}
                  className="modal-btn modal-btn-reject">
                  <CircleX size={16} />
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "paying");
                    setSelectedRequest(null);
                  }}
                  className="modal-btn modal-btn-paying">
                  <CreditCard size={16} />
                  Paying
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "completed");
                    setSelectedRequest(null);
                  }}
                  className="modal-btn modal-btn-complete">
                  Complete
                </button>
              </div>
              <button
                onClick={handlePrint}
                className="modal-btn"
                style={{ width: '100%', border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#F9FAFB' }}>
                <Printer size={16} />
                Print Application
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
