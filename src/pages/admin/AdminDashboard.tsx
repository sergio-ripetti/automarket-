import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, ShoppingBag, DollarSign, CreditCard } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getSales, type Sale } from '../../lib/salesService'
import type { Message } from '../../lib/messagesService'
import SeedButton from '../../components/admin/SeedButton'

interface Stats {
  totalCars: number
  totalSales: number
  totalRevenue: number
  activeFinancing: number
  pendingFinancing: number
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string | { toDate: () => Date }) {
  if (!dateStr) return '—'
  if (typeof dateStr === 'string') {
    return new Date(dateStr).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (typeof dateStr.toDate === 'function') {
    return dateStr.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return '—'
}

const paymentTypeLabel: Record<string, string> = {
  cash: 'Cash', financing: 'Financing', mixed: 'Mixed',
}

const statCards = [
  { icon: Car,         key: 'totalCars',         label: 'Total Vehicles',    money: false },
  { icon: ShoppingBag, key: 'totalSales',        label: 'Total Sales',       money: false },
  { icon: DollarSign,  key: 'totalRevenue',      label: 'Total Revenue',     money: true  },
  { icon: CreditCard,  key: 'activeFinancing',   label: 'Active Financing',  money: false },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalCars: 0, totalSales: 0, totalRevenue: 0, activeFinancing: 0, pendingFinancing: 0 })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [recentMessages, setRecentMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const [carsSnap, allSales, pendingSnap, messagesSnap] = await Promise.all([
          getDocs(collection(db, 'cars')),
          getSales(),
          getDocs(query(collection(db, 'financing'), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(5))),
        ])

        const revenue = allSales.reduce((sum, s) => sum + (s.paymentPlan.salePrice || 0), 0)
        const activeFinancing = allSales.filter((s) => s.status === 'active' && s.paymentPlan.type !== 'cash').length

        setStats({
          totalCars: carsSnap.size,
          totalSales: allSales.length,
          totalRevenue: revenue,
          activeFinancing,
          pendingFinancing: pendingSnap.size,
        })
        setRecentSales(allSales.slice(0, 10))
        setRecentMessages(messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)))
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const today = new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <h1 className="font-bebas" style={{ fontSize: '3rem', color: 'white', lineHeight: 1, marginBottom: '0.25rem' }}>
        Dashboard
      </h1>
      <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
        {today}
      </p>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {statCards.map(({ icon: Icon, key, label, money }) => {
          const val = stats[key as keyof Stats]
          return (
            <div key={key} style={{
              backgroundColor: '#1a1a1a', border: '1px solid rgba(245,158,11,0.1)',
              borderRadius: '1rem', padding: '1.5rem',
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
              <div style={{
                width: 44, height: 44, backgroundColor: 'rgba(245,158,11,0.1)',
                borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} color="#f59e0b" />
              </div>
              <div>
                <p className="font-bebas" style={{ fontSize: '2.25rem', color: '#f59e0b', lineHeight: 1 }}>
                  {loading ? '—' : money ? fmt(val) : val.toLocaleString()}
                </p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  {label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Recent Sales ── */}
      <h2 className="font-bebas" style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1rem' }}>
        Recent Sales
      </h2>
      <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', overflow: 'auto', marginBottom: '2.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              {['Car Title', 'Buyer', 'Sale Price', 'Type', 'Date'].map((h) => (
                <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', fontWeight: 400 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentSales.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                  No sales recorded yet
                </td>
              </tr>
            ) : recentSales.map((sale) => (
              <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '1rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{sale.carTitle}</td>
                <td style={{ padding: '1rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{sale.buyer.name}</td>
                <td style={{ padding: '1rem 1.25rem', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#f59e0b' }}>{fmt(sale.paymentPlan.salePrice)}</td>
                <td style={{ padding: '1rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{paymentTypeLabel[sale.paymentPlan.type] || sale.paymentPlan.type}</td>
                <td style={{ padding: '1rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{fmtDate(sale.saleDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Recent Messages ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="font-bebas" style={{ fontSize: '1.5rem', color: 'white' }}>Recent Messages</h2>
        <Link to="/admin/messages" style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#f59e0b', textDecoration: 'none' }}>
          View All →
        </Link>
      </div>
      {recentMessages.length === 0 ? (
        <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', padding: '1.5rem 0' }}>No messages yet.</p>
      ) : recentMessages.map((msg) => (
        <div key={msg.id} style={{
          display: 'flex', gap: '1rem', padding: '1rem',
          backgroundColor: '#111111', borderRadius: '0.75rem', marginBottom: '0.5rem',
          border: `1px solid ${msg.read ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.15)'}`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: msg.read ? 'rgba(255,255,255,0.15)' : '#f59e0b', flexShrink: 0, marginTop: '0.4rem' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'white', letterSpacing: '0.03em' }}>{msg.senderName}</p>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                {fmtDate(msg.createdAt as unknown as { toDate: () => Date })}
              </p>
            </div>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#f59e0b', marginBottom: '0.25rem' }}>{msg.reason}</p>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.message}
            </p>
          </div>
        </div>
      ))}

      <SeedButton />
    </div>
  )
}
