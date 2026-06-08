import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Eye, Trash2, ShoppingBag } from 'lucide-react'
import { getSales, deleteSale, type Sale } from '../../lib/salesService'
import { showToast } from '../../lib/toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

type FilterType = 'all' | 'cash' | 'financing' | 'mixed' | 'completed'

export default function AdminSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

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
          || s.buyer.rut.toLowerCase().includes(search.toLowerCase())

      return matchFilter && matchSearch
    })
  }, [sales, filter, search])

  const stats = {
    totalRevenue: sales.reduce((sum, s) => sum + s.paymentPlan.salePrice, 0),
    cashSales: sales.filter((s) => s.paymentPlan.type === 'cash').length,
    financedSales: sales.filter((s) => s.paymentPlan.type === 'financing' || s.paymentPlan.type === 'mixed').length,
    activeFinancing: sales.filter((s) => s.status === 'active' && s.paymentPlan.type !== 'cash').length,
  }

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
    <div>
      <style>{`
        .sales-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          font-weight: 600;
        }
        .sales-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background-color: #0a0a0a;
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
          background-color: #1a1a1a;
        }
        .sales-table th {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          text-align: left;
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(0.65rem, 1.5vw, 0.8rem);
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          font-weight: 400;
          text-transform: uppercase;
        }
        .sales-table td {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="font-bebas text-white sales-page-title">Sales Records</h1>
          <Button
            variant="primary"
            size="md"
            icon={<PlusCircle size={18} />}
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/admin/sales/new'}
          >
            Record New Sale
          </Button>
        </div>
        <p className="font-outfit" style={{ fontSize: 'clamp(0.8rem, 1.5vw, 0.875rem)', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{sales.length} sales recorded</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        {[
          { label: 'Total Revenue', value: fmt(stats.totalRevenue) },
          { label: 'Cash Sales', value: stats.cashSales.toString() },
          { label: 'Financed Sales', value: stats.financedSales.toString() },
          { label: 'Active Financing', value: stats.activeFinancing.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-carbon border border-white/5 rounded-lg p-5 hover:border-amber-500/20 transition-colors">
            <p className="text-xs text-white/50 mb-2 font-outfit">{label}</p>
            <p className="font-bebas text-2xl text-amber-500 tracking-wider">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 'clamp(1.25rem, 3vw, 1.5rem)' }}>
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
          {(['all', 'cash', 'financing', 'mixed', 'completed'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-outfit font-medium transition-all ${
                filter === type
                  ? 'border-2 border-amber-500 bg-amber-500/10 text-amber-500'
                  : 'border-2 border-white/10 bg-transparent text-white/50 hover:border-white/20'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by buyer, car, or RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-dark border border-white/10 text-white font-outfit text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Sales Table */}
      <div className="sales-table-wrapper">
        <table className="sales-table">
          <thead>
            <tr>
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
                  <ShoppingBag size={32} className="mx-auto mb-4 text-white/20" />
                  <p className="text-white/30 font-outfit">No sales found</p>
                </td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Car */}
                  <td>
                    <div className="flex gap-3 items-center" style={{ minWidth: 0 }}>
                      <img src={sale.carImages[0]} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" style={{ minWidth: '48px' }} />
                      <div style={{ minWidth: 0 }}>
                        <p className="font-bebas text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{sale.carTitle}</p>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit' }}>{sale.carYear}</p>
                      </div>
                    </div>
                  </td>
                  {/* Buyer */}
                  <td style={{ fontFamily: 'Outfit' }}>
                    <p style={{ fontSize: '0.85rem', color: 'white' }}>{sale.buyer.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{sale.buyer.email}</p>
                  </td>
                  {/* Price */}
                  <td style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#f59e0b', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>{fmt(sale.paymentPlan.salePrice)}</td>
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
                  <td style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{fmtDate(sale.saleDate)}</td>
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
                        className="inline-flex items-center justify-center rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
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
