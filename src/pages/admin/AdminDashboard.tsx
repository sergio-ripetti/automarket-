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

// Formats a numeric price as NZD currency
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

// Formats a date value (plain string or Firestore Timestamp) into a readable NZ date
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

// Admin dashboard overview page - fetches car/sales/financing/message stats from Firestore and displays summary cards, recent sales, and recent messages
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalCars: 0, totalSales: 0, totalRevenue: 0, activeFinancing: 0, pendingFinancing: 0 })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [recentMessages, setRecentMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // Fetches dashboard stats (cars, sales, pending financing, recent messages) from Firestore in parallel on mount
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
    <div id="admin-dashboard-main-container" className="admin-dashboard-main-container">
      <h1 className="font-bebas" style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', color: 'white', lineHeight: 1, marginBottom: '0.25rem', fontWeight: 600 }}>
        Dashboard
      </h1>
      <p style={{ fontFamily: 'Outfit', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        {today}
      </p>

      {/* ── Stat cards ── */}
      <style>{`
        .stats-grid {
          display: grid;
          gap: clamp(0.75rem, 3vw, 1.5rem);
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
        }
        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 767px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div id="admin-dashboard-stats-grid" className="admin-dashboard-stats-grid stats-grid">
        {statCards.map(({ icon: Icon, key, label, money }, idx) => {
          const val = stats[key as keyof Stats]
          return (
            <div key={key} id={`admin-dashboard-stat-card-${idx + 1}`} className={`admin-dashboard-stat-card admin-dashboard-stat-card-${key}`} style={{
              backgroundColor: '#F1F5F9', border: '1px solid rgba(29,78,216,0.1)',
              borderRadius: 'clamp(0.75rem, 2vw, 1rem)', padding: 'clamp(0.25rem, 2vw, 1.5rem)',
              display: 'flex', alignItems: 'flex-start', gap: 'clamp(0.75rem, 2vw, 1.25rem)',
            }}>
              <div style={{
                width: 44, height: 44, backgroundColor: 'rgba(29,78,216,0.1)',
                borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} color="#1D4ED8" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="font-bebas" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', color: '#1D4ED8', lineHeight: 1 }}>
                  {loading ? '—' : money ? fmt(val) : val.toLocaleString()}
                </p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  {label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Recent Sales ── */}
      <style>{`
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
          background-color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 1rem;
        }
        .recent-sales-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
          font-size: clamp(0.75rem, 1.5vw, 0.875rem);
        }
        .recent-sales-table thead tr {
          background-color: #F1F5F9;
        }
        .recent-sales-table th {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          text-align: left;
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(0.7rem, 1.5vw, 0.8rem);
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          font-weight: 400;
          text-transform: uppercase;
        }
        .recent-sales-table td {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.8);
        }
        @media (max-width: 767px) {
          .recent-sales-table {
            min-width: 600px;
          }
        }
      `}</style>
      <h2 className="font-bebas" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', color: 'white', marginBottom: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 600 }}>
        Recent Sales
      </h2>
      <div id="admin-dashboard-recent-sales" className="admin-dashboard-recent-sales table-wrapper">
        <table className="recent-sales-table">
          <thead>
            <tr id="admin-dashboard-recent-sales-header" className="admin-dashboard-recent-sales-header">
              {['Car Title', 'Buyer', 'Sale Price', 'Type', 'Date'].map((h) => (
                <th key={h}>{h}</th>
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
            ) : recentSales.map((sale, idx) => (
              <tr key={sale.id} id={`admin-dashboard-recent-sales-row-${idx}`} className="admin-dashboard-recent-sales-row">
                <td style={{ fontFamily: 'Outfit' }}>{sale.carTitle}</td>
                <td style={{ fontFamily: 'Outfit' }}>{sale.buyer.name}</td>
                <td style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#1D4ED8', fontSize: '1rem' }}>{fmt(sale.paymentPlan.salePrice)}</td>
                <td style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)' }}>{paymentTypeLabel[sale.paymentPlan.type] || sale.paymentPlan.type}</td>
                <td style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)' }}>{fmtDate(sale.saleDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Recent Messages ── */}
      <style>{`
        .recent-messages-title {
          font-size: clamp(1.1rem, 4vw, 1.5rem);
        }
        .message-item {
          display: flex;
          gap: clamp(0.75rem, 2vw, 1rem);
          padding: clamp(0.75rem, 2vw, 1.25rem);
          background-color: #FFFFFF;
          border-radius: 0.75rem;
          margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
          border: 1px solid;
        }
        .message-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.25rem;
          gap: clamp(0.5rem, 2vw, 1rem);
          flex-wrap: wrap;
        }
        .message-sender {
          font-size: clamp(0.8rem, 1.5vw, 0.9rem);
        }
        .message-date {
          font-size: clamp(0.6rem, 1vw, 0.7rem);
        }
        @media (max-width: 767px) {
          .message-item-header {
            flex-direction: column;
            gap: 0.25rem;
          }
        }
      `}</style>
      <div id="admin-dashboard-recent-messages-header" className="admin-dashboard-recent-messages-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(0.75rem, 2vw, 1rem)', flexWrap: 'wrap', gap: 'clamp(0.5rem, 2vw, 1rem)' }}>
        <h2 className="font-bebas recent-messages-title text-white" style={{ fontWeight: 600 }}>Recent Messages</h2>
        <Link to="/admin/messages" style={{ fontFamily: 'Outfit', fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)', color: '#1D4ED8', textDecoration: 'none' }}>
          View All →
        </Link>
      </div>
      {recentMessages.length === 0 ? (
        <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)', padding: 'clamp(1rem, 2vw, 1.5rem) 0' }}>No messages yet.</p>
      ) : recentMessages.map((msg, idx) => (
        <div key={msg.id} id={`admin-dashboard-recent-messages-item-${idx}`} className="admin-dashboard-recent-messages-item message-item" style={{
          borderColor: msg.read ? 'rgba(255,255,255,0.05)' : 'rgba(29,78,216,0.15)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: msg.read ? 'rgba(255,255,255,0.15)' : '#1D4ED8', flexShrink: 0, marginTop: '0.4rem' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="message-item-header">
              <p className="font-bebas message-sender" style={{ color: 'white', letterSpacing: '0.03em' }}>{msg.senderName}</p>
              <p className="message-date" style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.35)' }}>
                {fmtDate(msg.createdAt as unknown as { toDate: () => Date })}
              </p>
            </div>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#1D4ED8', marginBottom: '0.25rem' }}>{msg.reason}</p>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.message}
            </p>
          </div>
        </div>
      ))}

      <div id="admin-dashboard-import-button" className="admin-dashboard-import-button">
        <SeedButton />
      </div>
    </div>
  )
}
