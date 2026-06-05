import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Eye, Trash2, ShoppingBag } from 'lucide-react'
import { getSales, deleteSale, type Sale } from '../../lib/salesService'
import { showToast } from '../../lib/toast'

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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="font-bebas" style={{ fontSize: '2rem', color: 'white', lineHeight: 1, marginBottom: '0.25rem' }}>
          Sales Records
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
            {sales.length} sales recorded
          </p>
          <Link
            to="/admin/sales/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem 1.5rem', borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white', fontFamily: 'Outfit', fontSize: '0.875rem', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer', border: 'none',
            }}
          >
            <PlusCircle size={18} />
            Record New Sale
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Revenue', value: fmt(stats.totalRevenue) },
          { label: 'Cash Sales', value: stats.cashSales.toString() },
          { label: 'Financed Sales', value: stats.financedSales.toString() },
          { label: 'Active Financing', value: stats.activeFinancing.toString() },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: '#1a1a1a', border: '1px solid rgba(245,158,11,0.1)',
            borderRadius: '0.875rem', padding: '1.25rem',
          }}>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
              {label}
            </p>
            <p className="font-bebas" style={{ fontSize: '1.75rem', color: '#f59e0b' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'cash', 'financing', 'mixed', 'completed'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.625rem',
                fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 500,
                border: `2px solid ${filter === type ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                backgroundColor: filter === type ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: filter === type ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
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
          style={{
            width: '100%', padding: '0.875rem 1rem', borderRadius: '0.625rem',
            backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)',
            color: 'white', fontFamily: 'Outfit', fontSize: '0.875rem',
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#f59e0b' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Sales Table */}
      <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              {['Car', 'Buyer Name', 'Sale Price', 'Type', 'Date', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{
                  padding: '1rem 1.25rem', textAlign: 'left',
                  fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', fontWeight: 400,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td colSpan={7} style={{ padding: '1rem 1.25rem', backgroundColor: '#0a0a0a', height: '24px' }} />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{
                  padding: '3rem', textAlign: 'center',
                  fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem',
                }}>
                  <ShoppingBag size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <div>No sales found</div>
                </td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Car */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <img src={sale.carImages[0]} alt="" style={{ width: '50px', height: '36px', borderRadius: '0.375rem', objectFit: 'cover' }} />
                      <div>
                        <p className="font-bebas" style={{ fontSize: '0.9rem', color: 'white', lineHeight: 1 }}>
                          {sale.carTitle}
                        </p>
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          {sale.carYear}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Buyer */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{sale.buyer.name}</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {sale.buyer.email}
                    </p>
                  </td>
                  {/* Price */}
                  <td style={{ padding: '1rem 1.25rem', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#f59e0b' }}>
                    {fmt(sale.paymentPlan.salePrice)}
                  </td>
                  {/* Type */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: sale.paymentPlan.type === 'cash'
                        ? 'rgba(34, 197, 94, 0.2)' : sale.paymentPlan.type === 'financing'
                          ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                      color: sale.paymentPlan.type === 'cash'
                        ? '#22c55e' : sale.paymentPlan.type === 'financing'
                          ? '#3b82f6' : '#9333ea',
                      fontFamily: 'Outfit',
                    }}>
                      {sale.paymentPlan.type === 'cash' ? 'Cash' : sale.paymentPlan.type === 'financing' ? 'Financing' : 'Mixed'}
                    </span>
                  </td>
                  {/* Date */}
                  <td style={{ padding: '1rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    {fmtDate(sale.saleDate)}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: sale.status === 'active'
                        ? 'rgba(245,158,11,0.2)' : sale.status === 'completed'
                          ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: sale.status === 'active'
                        ? '#f59e0b' : sale.status === 'completed'
                          ? '#22c55e' : '#ef4444',
                      fontFamily: 'Outfit',
                      textTransform: 'capitalize',
                    }}>
                      {sale.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        to={`/admin/sales/${sale.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '32px', height: '32px', borderRadius: '0.375rem',
                          backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                          cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none',
                        }}
                        title="View details"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '32px', height: '32px', borderRadius: '0.375rem',
                          backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                        }}
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
