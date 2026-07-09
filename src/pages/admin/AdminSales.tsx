import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Eye, Trash2, ShoppingBag } from 'lucide-react'
import { getSales, deleteSale, type Sale } from '../../lib/salesService'
import { showToast } from '../../lib/toast'
import Badge from '../../components/ui/Badge'

// Formats a number as NZD currency for display
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

// Formats an ISO date string into a readable NZ date string
function fmtDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

type FilterType = 'all' | 'cash' | 'financing' | 'mixed' | 'completed'

// Admin page listing all recorded sales - lets staff filter by payment type/status, search by buyer/car,
// and drill into or delete individual sales; data is loaded from and written back to Firestore
export default function AdminSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  // Fetches all sales from Firestore on mount and populates local state
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSales()
        setSales(data)
      } catch (err) {
        console.error('Failed to load sales:', err)
        showToast('Failed to load sales', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Applies the active payment-type/status filter and search query to the loaded sales list
  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const matchFilter = filter === 'all'
        ? true
        : filter === 'completed'
          ? s.status === 'completed' || (s.paymentPlan.type === 'cash' && s.status !== 'cancelled')
          : s.paymentPlan.type === filter

      const matchSearch = search === ''
        ? true
        : s.buyer.name.toLowerCase().includes(search.toLowerCase())
          || s.carTitle.toLowerCase().includes(search.toLowerCase())
          || s.buyer.idNumber.toLowerCase().includes(search.toLowerCase())

      return matchFilter && matchSearch
    })
  }, [sales, filter, search])

  const stats = {
    totalRevenue: sales.reduce((sum, s) => sum + s.paymentPlan.salePrice, 0),
    cashSales: sales.filter((s) => s.paymentPlan.type === 'cash').length,
    financedSales: sales.filter((s) => s.paymentPlan.type === 'financing' || s.paymentPlan.type === 'mixed').length,
    activeFinancing: sales.filter((s) => s.status === 'active' && s.paymentPlan.type !== 'cash').length,
  }

  // Deletes a sale from Firestore after user confirmation, then removes it from local state
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return
    try {
      await deleteSale(id)
      setSales(sales.filter((s) => s.id !== id))
      showToast('Sale deleted', 'success')
    } catch (err) {
      console.error('Delete failed:', err)
      showToast('Failed to delete sale', 'error')
    }
  }

  return (
    <div id="admin-sales-main-container" className="admin-sales-main-container">
      <style>{`
        .sales-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background-color: #F2F2F0;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 1rem;
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
        }
        .sales-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
          font-size: clamp(0.7rem, 1.5vw, 0.875rem);
        }
        .sales-table thead tr {
          background-color: #E4EAF0;
        }
        .sales-table th {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          text-align: left;
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(0.65rem, 1.5vw, 0.8rem);
          color: '#767676';
          letter-spacing: 0.05em;
          font-weight: 400;
          text-transform: uppercase;
        }
        .sales-table td {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .admin-sales-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(clamp(150px, 40vw, 200px), 1fr));
          gap: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: clamp(1.5rem, 4vw, 2rem);
        }
        .admin-sales-stat-card {
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border-radius: 0.5rem;
          padding: clamp(0.75rem, 3vw, 1.5rem);
          transition: all 0.3s ease;
        }
        .admin-sales-stat-card:hover {
          border-color: rgba(29,78,216,0.3);
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          box-shadow: 0 4px 12px rgba(29,78,216,0.1);
        }
        .admin-sales-stat-label {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          color: #767676;
          margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
          font-family: 'Outfit', sans-serif;
          text-transform: capitalize;
        }
        .admin-sales-stat-value {
          font-size: clamp(1.5rem, 5vw, 2.25rem);
          color: #1A1A1A;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 0.05em;
          line-height: 1;
        }
        .admin-sales-new-btn {
          display: inline-flex;
          align-items: center;
          gap: clamp(0.5rem, 1.5vw, 0.75rem);
          padding: clamp(0.75rem, 2vw, 1rem) clamp(1.25rem, 3vw, 1.75rem);
          border: 1px solid #1A1A1A;
          background: #1A1A1A;
          color: #FFFFFF;
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          letter-spacing: 0.05em;
          text-decoration: none;
        }
        .admin-sales-new-btn:hover {
          background: #2A2A2A;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }
        .admin-sales-new-btn:active {
          transform: translateY(0);
          box-shadow: 0 0 10px rgba(29,78,216,0.2);
        }
        .admin-sales-filter-btn {
          padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 2.5vw, 1.5rem);
          border: 1px solid #E0E0DC;
          background: #F2F2F0;
          color: #4A4A4A;
          border-radius: 0.375rem;
          font-size: clamp(0.8rem, 1.5vw, 0.9rem);
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .admin-sales-filter-btn:hover {
          border-color: rgba(29,78,216,0.5);
          background: rgba(29,78,216,0.1);
          color: #1A1A1A;
        }
        .admin-sales-filter-btn.active {
          border-color: #1A1A1A;
          background: rgba(29,78,216,0.2);
          color: #1A1A1A;
          box-shadow: 0 0 10px rgba(29,78,216,0.2);
        }
        .admin-sales-search-input {
          width: 100%;
          padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem);
          border: 1px solid #E0E0DC;
          background: #FFFFFF;
          color: #1A1A1A;
          border-radius: 0.375rem;
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }
        .admin-sales-search-input::placeholder {
          color: #767676;
        }
        .admin-sales-search-input:focus {
          border-color: rgba(29,78,216,0.5);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(29,78,216,0.1);
        }
      `}</style>

      {/* Header */}
      <div
        id="admin-sales-header"
        className="admin-sales-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'clamp(1rem, 3vw, 1.5rem)',
          marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)',
          paddingBottom: 'clamp(1rem, 3vw, 1.5rem)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div>
          <h1
            id="admin-sales-title"
            className="admin-sales-title font-bebas"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 700,
              color: "#0D1B2A",
              letterSpacing: '0.05em',
              lineHeight: 1,
              marginBottom: '0.35rem',
            }}
          >
            Sales Records
          </h1>
          <p style={{ fontFamily: 'Outfit', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#767676' }}>
            {sales.length} sales recorded
          </p>
        </div>
        <button
          id="admin-sales-create-button"
          className="admin-sales-create-button admin-sales-new-btn"
          onClick={() => window.location.href = '/admin/sales/new'}
        >
          <PlusCircle size={18} />
          Record New Sale
        </button>
      </div>

      {/* Stats Row */}
      <div id="admin-sales-stats-grid" className="admin-sales-stats-grid">
        {[
          { id: 'admin-sales-total-revenue',    label: 'Total Revenue',    value: fmt(stats.totalRevenue) },
          { id: 'admin-sales-cash-sales',        label: 'Cash Sales',       value: stats.cashSales.toString() },
          { id: 'admin-sales-financed-sales',    label: 'Financed Sales',   value: stats.financedSales.toString() },
          { id: 'admin-sales-active-financing',  label: 'Active Financing', value: stats.activeFinancing.toString() },
        ].map(({ id, label, value }) => (
          <div key={label} id={id} className="admin-sales-stat-card">
            <p className="admin-sales-stat-label">{label}</p>
            <p className="admin-sales-stat-value">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        id="admin-sales-filters"
        className="admin-sales-filters"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(1rem, 3vw, 1.5rem)',
          marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        }}
      >
        <div
          id="admin-sales-filter-buttons"
          className="admin-sales-filter-buttons"
          style={{ display: 'flex', gap: 'clamp(0.5rem, 2vw, 1rem)', flexWrap: 'wrap' }}
        >
          {(['all', 'cash', 'financing', 'mixed', 'completed'] as FilterType[]).map((type) => (
            <button
              key={type}
              id={`admin-sales-filter-btn-${type}`}
              className={`admin-sales-filter-btn${filter === type ? ' active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <input
          id="admin-sales-search-bar"
          className="admin-sales-search-input"
          type="text"
          placeholder="Search by buyer, car, or ID number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sales Table */}
      <div id="admin-sales-table-wrapper" className="admin-sales-table-wrapper sales-table-wrapper">
        <table id="admin-sales-table" className="admin-sales-table sales-table">
          <thead>
            <tr id="admin-sales-table-header" className="admin-sales-table-header">
              {['Car', 'Buyer Name', 'Sale Price', 'Type', 'Date', 'Status', 'Actions'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td colSpan={7} className="px-5 py-4 h-6 bg-white/5 rounded animate-pulse" />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <ShoppingBag size={32} className="mx-auto mb-4 text-[#0D1B2A]/20" />
                  <p className="text-[#0D1B2A]/30 font-inter">No sales found</p>
                </td>
              </tr>
            ) : (
              filtered.map((sale, idx) => (
                <tr key={sale.id} id={`admin-sales-table-row-${idx}`} className="admin-sales-table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Car */}
                  <td>
                    <div className="flex gap-3 items-center" style={{ minWidth: 0 }}>
                      <img src={sale.carImages[0]} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" style={{ minWidth: '48px' }} />
                      <div style={{ minWidth: 0 }}>
                        <p className="font-bebas text-[#0D1B2A]" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{sale.carTitle}</p>
                        <p style={{ fontSize: '0.7rem', color: '#767676', fontFamily: 'Outfit' }}>{sale.carYear}</p>
                      </div>
                    </div>
                  </td>
                  {/* Buyer */}
                  <td style={{ fontFamily: 'Outfit' }}>
                    <p style={{color: "#0D1B2A"}}>{sale.buyer.name}</p>
                    <p style={{ fontSize: '0.7rem', color: '#767676' }}>{sale.buyer.email}</p>
                  </td>
                  {/* Price */}
                  <td style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#1A1A1A', fontSize: 'clamp(0.85rem, 2vw, 1rem)', fontWeight: 'bold' }}>{fmt(sale.paymentPlan.salePrice)}</td>
                  {/* Type */}
                  <td>
                    <Badge
                      variant={sale.paymentPlan.type === 'cash' ? 'success' : sale.paymentPlan.type === 'financing' ? 'info' : 'default'}
                      className="text-xs"
                    >
                      {sale.paymentPlan.type === 'cash' ? 'Cash' : sale.paymentPlan.type === 'financing' ? 'Finance' : 'Mixed'}
                    </Badge>
                  </td>
                  {/* Date */}
                  <td style={{ fontFamily: 'Outfit', color: '#767676', fontSize: '0.8rem' }}>{fmtDate(sale.saleDate)}</td>
                  {/* Status */}
                  <td>
                    <Badge
                      variant={sale.status === 'active' ? 'warning' : sale.status === 'completed' ? 'success' : 'danger'}
                      className="text-xs capitalize"
                    >
                      {sale.status}
                    </Badge>
                  </td>
                  {/* Actions */}
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/sales/${sale.id}`}
                        className="inline-flex items-center justify-center rounded bg-#1A1A1A/10 text-#1A1A1A hover:bg-#1A1A1A/20 transition-colors"
                        style={{ minWidth: '44px', minHeight: '44px', width: '44px', height: '44px' }}
                        title="View details"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="inline-flex items-center justify-center rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        style={{ minWidth: '44px', minHeight: '44px', width: '44px', height: '44px' }}
                        title="Delete sale"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
