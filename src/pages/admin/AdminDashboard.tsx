import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, ShoppingBag, DollarSign, CreditCard } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

interface MonthlySalesData {
  month: string
  revenue: number
}

interface SalesByTypeData {
  name: string
  value: number
  color: string
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

// Generates Spanish subject line for messages based on type and content
function getMessageSubject(msg: Message): string {
  if (msg.type === 'financing') {
    return 'Interesado en financiamiento'
  }
  if (msg.type === 'offer') {
    if (msg.carTitle) {
      return `Oferta por ${msg.carTitle}`
    }
    return 'Oferta por vehículo'
  }
  // Default 'contact' or inquiry type
  if (msg.carTitle) {
    return `Consulta sobre ${msg.carTitle}`
  }
  return 'Consulta general'
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
  const [monthlySalesData, setMonthlySalesData] = useState<MonthlySalesData[]>([])
  const [salesByType, setSalesByType] = useState<SalesByTypeData[]>([])
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetches dashboard stats (cars, sales, pending financing, recent messages) from Firestore in parallel on mount
  useEffect(() => {
    const run = async () => {
      try {
        const [carsSnap, allSales, pendingSnap, messagesSnap] = await Promise.all([
          getDocs(collection(db, 'cars')),
          getSales(),
          getDocs(query(collection(db, 'financing'), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(10))),
        ])

        const revenue = allSales.reduce((sum, s) => sum + (s.paymentPlan.salePrice || 0), 0)
        const activeFinancing = allSales.filter((s) => s.status === 'active' && s.paymentPlan.type !== 'cash').length

        // Calculate monthly sales data for current year
        const currentYear = new Date().getFullYear()
        const monthlyData: Record<string, number> = {}
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for (let i = 0; i < 12; i++) {
          monthlyData[monthNames[i]] = 0
        }

        allSales.forEach((sale) => {
          const saleDate = sale.saleDate instanceof Object && 'toDate' in sale.saleDate
            ? sale.saleDate.toDate()
            : new Date(sale.saleDate as string)
          if (saleDate.getFullYear() === currentYear) {
            const monthIdx = saleDate.getMonth()
            monthlyData[monthNames[monthIdx]] += sale.paymentPlan.salePrice || 0
          }
        })

        const chartData = monthNames.map((month) => ({
          month,
          revenue: monthlyData[month],
        }))

        // Calculate sales by type
        const salesByTypeMap: Record<string, number> = { cash: 0, financing: 0, mixed: 0 }
        allSales.forEach((sale) => {
          const type = sale.paymentPlan.type as keyof typeof salesByTypeMap
          if (type in salesByTypeMap) {
            salesByTypeMap[type]++
          }
        })

        const typeColors: Record<string, string> = {
          cash: '#2E7D5B', // success green
          financing: '#3B82F6', // info blue
          mixed: '#B7791F', // warning amber
        }

        const typeLabels: Record<string, string> = {
          cash: 'Cash',
          financing: 'Financing',
          mixed: 'Mixed',
        }

        const chartTypeData = Object.entries(salesByTypeMap)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => ({
            name: typeLabels[type],
            value: count,
            color: typeColors[type],
          }))

        const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
        const unread = messages.filter((m) => !m.read).length

        setStats({
          totalCars: carsSnap.size,
          totalSales: allSales.length,
          totalRevenue: revenue,
          activeFinancing,
          pendingFinancing: pendingSnap.size,
        })
        setRecentSales(allSales.slice(0, 7))
        setRecentMessages(messages.slice(0, 5))
        setMonthlySalesData(chartData)
        setSalesByType(chartTypeData)
        setUnreadMessageCount(unread)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <div>
          <h1 className="font-bebas" style={{color: "#1A1A1A", lineHeight: 1, marginBottom: '0.25rem', fontWeight: 600 }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: 'Outfit', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', color: '#767676', margin: 0 }}>
            {today}
          </p>
        </div>
        <div id="admin-dashboard-import-button" style={{ flexShrink: 0 }}>
          <SeedButton position="inline" />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <style>{`
        .stats-grid {
          display: grid;
          gap: clamp(0.75rem, 2vw, 1rem);
          margin-bottom: clamp(2rem, 4vw, 2.5rem);
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
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0E0DC',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div style={{
                width: 44,
                height: 44,
                backgroundColor: '#F0F0EE',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} color="#767676" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {loading ? '—' : money ? fmt(val) : val.toLocaleString()}
                </p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676' }}>
                  {label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Charts Grid ── */}
      <style>{`
        .charts-grid {
          display: grid;
          gap: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: clamp(2rem, 4vw, 2.5rem);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div className="charts-grid">
        {/* Sales Revenue Chart */}
        <div id="admin-dashboard-sales-chart" style={{
          backgroundColor: '#F8F9FB',
          border: '1px solid #D5DFE8',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="font-bebas" style={{ color: '#1A1A1A', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.05em' }}>SALES SUMMARY</h3>
            <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#7A8BA8' }}>This Year</span>
          </div>
          {loading ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#767676' }}>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlySalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E7D5B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2E7D5B" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0DC" vertical={false} />
                <XAxis dataKey="month" stroke="#767676" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="#767676" style={{ fontSize: '0.75rem' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0DC', borderRadius: '0.5rem' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2E7D5B" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by Type Chart */}
        <div id="admin-dashboard-sales-type-chart" style={{
          backgroundColor: '#F8F9FB',
          border: '1px solid #D5DFE8',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <h3 className="font-bebas" style={{ color: '#1A1A1A', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.05em' }}>SALES BY TYPE</h3>
          {loading || salesByType.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#767676' }}>
              {loading ? 'Loading...' : 'No data'}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={salesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    innerRadius={60}
                    outerRadius={95}
                    fill="#8884d8"
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                  >
                    {salesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '40%', paddingLeft: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', margin: '0' }}>Total</p>
                  <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: '#1A1A1A', margin: '0', lineHeight: 1 }}>
                    {salesByType.reduce((sum, item) => sum + item.value, 0)}
                  </p>
                </div>
                {salesByType.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#1A1A1A', flex: 1 }}>
                      {item.name}
                    </span>
                    <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', fontWeight: 500 }}>
                      {((item.value / salesByType.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Sales ── */}
      <style>{`
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
          background-color: #FFFFFF;
          border: 1px solid #E0E0DC;
          border-radius: 0.75rem;
        }
        .recent-sales-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
          font-size: clamp(0.75rem, 1.5vw, 0.875rem);
        }
        .recent-sales-table thead tr {
          background-color: #F7F7F5;
        }
        .recent-sales-table th {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          text-align: left;
          font-family: 'Outfit', sans-serif;
          font-size: clamp(0.7rem, 1.5vw, 0.8rem);
          color: #1A1A1A;
          letter-spacing: 0.05em;
          font-weight: 600;
          text-transform: uppercase;
          border-bottom: 1px solid #E0E0DC;
        }
        .recent-sales-table td {
          padding: clamp(0.75rem, 2vw, 1.25rem);
          border-bottom: 1px solid #E0E0DC;
          color: #1A1A1A;
          background-color: #FFFFFF;
        }
        .recent-sales-table tbody tr:nth-child(odd) td {
          background-color: #F7F7F5;
        }
        @media (max-width: 767px) {
          .recent-sales-table {
            min-width: 600px;
          }
        }
      `}</style>
      <h2 className="font-bebas" style={{color: "#1A1A1A", marginBottom: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
        RECENT SALES
      </h2>
      <div id="admin-dashboard-recent-sales" className="admin-dashboard-recent-sales table-wrapper">
        <table className="recent-sales-table">
          <thead>
            <tr id="admin-dashboard-recent-sales-header" className="admin-dashboard-recent-sales-header">
              {['Car Title', 'Buyer', 'Sale Price', 'Type', 'Status', 'Date'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentSales.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', fontFamily: 'Outfit', color: '#767676', fontSize: '0.9rem' }}>
                  No sales recorded yet
                </td>
              </tr>
            ) : recentSales.map((sale, idx) => {
              const statusLabel = sale.status === 'pending' ? 'Pendiente' : 'Completado'
              const statusColor = sale.status === 'pending' ? '#B7791F' : '#2E7D5B'
              const statusBgColor = sale.status === 'pending' ? 'rgba(183, 121, 31, 0.15)' : 'rgba(46, 125, 91, 0.15)'
              return (
                <tr key={sale.id} id={`admin-dashboard-recent-sales-row-${idx}`} className="admin-dashboard-recent-sales-row">
                  <td style={{ fontFamily: 'Outfit', color: '#1A1A1A' }}>{sale.carTitle}</td>
                  <td style={{ fontFamily: 'Outfit', color: '#1A1A1A' }}>{sale.buyer.name}</td>
                  <td style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#1A1A1A', fontSize: '1rem', fontWeight: 'bold' }}>{fmt(sale.paymentPlan.salePrice)}</td>
                  <td style={{ fontFamily: 'Outfit', color: '#767676' }}>{paymentTypeLabel[sale.paymentPlan.type] || sale.paymentPlan.type}</td>
                  <td>
                    <span style={{
                      fontFamily: 'Outfit',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: statusColor,
                      backgroundColor: statusBgColor,
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.5rem',
                      display: 'inline-block',
                      border: 'none',
                    }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'Outfit', color: '#767676' }}>{fmtDate(sale.saleDate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Recent Messages ── */}
      <style>{`
        .messages-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .message-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 0;
          background-color: transparent;
          border: none;
          border-bottom: 1px solid #E0E0DC;
          border-radius: 0;
          box-shadow: none;
        }
        .message-item:last-child {
          border-bottom: none;
        }
        .message-content {
          flex: 1;
          min-width: 0;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.25rem;
          gap: 0.75rem;
        }
        .message-subject {
          font-family: Outfit;
          font-size: 0.8rem;
          font-weight: 500;
          line-height: 1.4;
          margin: 0;
        }
        .message-subject-inquiry {
          color: #2E7D5B;
        }
        .message-subject-financing {
          color: #B7791F;
        }
        .message-date {
          font-size: 0.75rem;
          color: #767676;
          flex-shrink: 0;
        }
      `}</style>
      <div id="admin-dashboard-recent-messages-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="font-bebas" style={{ color: '#1A1A1A', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.05em' }}>RECENT MESSAGES</h2>
        <Link to="/admin/messages" style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#2E7D5B', textDecoration: 'none', fontWeight: 500 }}>
          Ver Todos →
        </Link>
      </div>
      <div className="messages-grid">
        {recentMessages.length === 0 ? (
          <p style={{ fontFamily: 'Outfit', color: '#767676', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>No messages</p>
        ) : recentMessages.map((msg, idx) => {
          const isFinancing = msg.type === 'financing'
          const subjectColor = isFinancing ? '#B7791F' : '#2E7D5B'
          const dotColor = isFinancing ? '#B7791F' : '#2E7D5B'
          const subject = getMessageSubject(msg)

          return (
            <div key={msg.id} id={`admin-dashboard-recent-messages-item-${idx}`} className="message-item">
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: dotColor,
                flexShrink: 0,
                marginTop: '0.35rem',
              }} />
              <div className="message-content">
                <div className="message-header">
                  <p style={{ fontFamily: 'Outfit', color: '#1A1A1A', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>{msg.senderName}</p>
                  <p className="message-date">{fmtDate(msg.createdAt as unknown as { toDate: () => Date })}</p>
                </div>
                <p className={`message-subject ${isFinancing ? 'message-subject-financing' : 'message-subject-inquiry'}`}>
                  {subject}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
