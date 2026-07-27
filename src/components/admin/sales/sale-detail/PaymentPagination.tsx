import { ArrowLeft, ArrowRight } from 'lucide-react'

interface PaymentPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaymentPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaymentPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const maxButtons = 5
  let start = Math.max(0, currentPage - Math.floor(maxButtons / 2))
  const end = Math.min(totalPages, start + maxButtons)
  if (end - start < maxButtons) start = Math.max(0, end - maxButtons)

  const pages = Array.from({ length: end - start }, (_, i) => start + i)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
      <style>{`
        .payment-pagination-page:hover:not([aria-current="page"]),
        .payment-pagination-page:focus-visible {
          background-color: #D5DCE3 !important;
          outline: 2px solid #1A1A1A;
          outline-offset: 1px;
        }
        .payment-pagination-arrow:not(:disabled):hover,
        .payment-pagination-arrow:not(:disabled):focus-visible {
          background-color: #D5DCE3 !important;
          outline: 2px solid #1A1A1A;
          outline-offset: 1px;
        }
      `}</style>
      <button
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        aria-label="Previous payments page"
        className="payment-pagination-arrow"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          height: '32px',
          padding: '0 0.75rem',
          backgroundColor: '#E4EAF0',
          border: '1px solid #E0E0DC',
          borderRadius: '0.5rem',
          fontFamily: 'Outfit',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: currentPage === 0 ? '#9CA3AF' : '#1A1A1A',
          cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Previous</span>
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-label={`Go to payments page ${p + 1}`}
          aria-current={currentPage === p ? 'page' : undefined}
          className="payment-pagination-page"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: currentPage === p ? '#1A1A1A' : '#E4EAF0',
            border: '1px solid #E0E0DC',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.875rem',
            color: currentPage === p ? '#FFFFFF' : '#1A1A1A',
            fontWeight: currentPage === p ? 700 : 400,
            fontFamily: 'Outfit',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
          {p + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage === totalPages - 1}
        aria-label="Next payments page"
        className="payment-pagination-arrow"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          height: '32px',
          padding: '0 0.75rem',
          backgroundColor: '#E4EAF0',
          border: '1px solid #E0E0DC',
          borderRadius: '0.5rem',
          fontFamily: 'Outfit',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: currentPage === totalPages - 1 ? '#9CA3AF' : '#1A1A1A',
          cursor:
            currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}>
        <span>Next</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
