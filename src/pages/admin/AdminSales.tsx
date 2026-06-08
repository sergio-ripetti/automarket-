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
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="font-bebas text-3xl text-white">Sales Records</h1>
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
        <p className="text-sm text-white/40 mt-2 font-outfit">{sales.length} sales recorded</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
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
      <div className="bg-dark border border-white/5 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-carbon">
              {['Car', 'Buyer Name', 'Sale Price', 'Type', 'Date', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-4 text-left font-bebas text-xs text-white/50 tracking-wider">
                  {h}
                </th>
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
                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {/* Car */}
                  <td className="px-5 py-4">
                    <div className="flex gap-3 items-center">
                      <img src={sale.carImages[0]} alt="" className="w-12 h-9 rounded object-cover" />
                      <div>
                        <p className="font-bebas text-sm text-white">{sale.carTitle}</p>
                        <p className="text-xs text-white/40 font-outfit">{sale.carYear}</p>
                      </div>
                    </div>
                  </td>
                  {/* Buyer */}
                  <td className="px-5 py-4">
                    <p className="text-sm text-white font-outfit">{sale.buyer.name}</p>
                    <p className="text-xs text-white/40 font-outfit">{sale.buyer.email}</p>
                  </td>
                  {/* Price */}
                  <td className="px-5 py-4 font-bebas text-lg text-amber-500">{fmt(sale.paymentPlan.salePrice)}</td>
                  {/* Type */}
                  <td className="px-5 py-4">
                    <Badge
                      variant={sale.paymentPlan.type === 'cash' ? 'success' : sale.paymentPlan.type === 'financing' ? 'info' : 'default'}
                      className="text-xs"
                    >
                      {sale.paymentPlan.type === 'cash' ? 'Cash' : sale.paymentPlan.type === 'financing' ? 'Financing' : 'Mixed'}
                    </Badge>
                  </td>
                  {/* Date */}
                  <td className="px-5 py-4 text-sm text-white/60 font-outfit">{fmtDate(sale.saleDate)}</td>
                  {/* Status */}
                  <td className="px-5 py-4">
                    <Badge
                      variant={sale.status === 'active' ? 'warning' : sale.status === 'completed' ? 'success' : 'danger'}
                      className="text-xs capitalize"
                    >
                      {sale.status}
                    </Badge>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/sales/${sale.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                        title="View details"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        title="Delete sale"
                      >
                        <Trash2 size={16} />
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
