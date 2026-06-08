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
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-bebas text-2xl sm:text-3xl lg:text-4xl text-white mb-1">Dashboard</h1>
        <p className="font-outfit text-sm text-white/40">{today}</p>
      </div>

      {/* ── Stat Cards (Responsive Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {statCards.map(({ icon: Icon, key, label, money }) => {
          const val = stats[key as keyof Stats]
          return (
            <div
              key={key}
              className="bg-carbon border border-amber-500/10 rounded-lg p-4 lg:p-6 hover:border-amber-500/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bebas text-xl sm:text-2xl lg:text-2xl text-amber-500 leading-none">
                    {loading ? '—' : money ? fmt(val) : val.toLocaleString()}
                  </p>
                  <p className="font-outfit text-xs sm:text-sm text-white/50 mt-1">{label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Recent Sales (Horizontal Scroll on Mobile) ── */}
      <h2 className="font-bebas text-xl sm:text-2xl text-white mb-4">Recent Sales</h2>
      <div className="bg-dark border border-white/5 rounded-lg overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-carbon">
              {['Car Title', 'Buyer', 'Sale Price', 'Type', 'Date'].map((h) => (
                <th
                  key={h}
                  className="px-3 sm:px-4 py-3 text-left font-bebas text-xs sm:text-sm text-white/50 tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentSales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-outfit text-sm text-white/30">
                  No sales recorded yet
                </td>
              </tr>
            ) : (
              recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 sm:px-4 py-3 font-outfit text-xs sm:text-sm text-white/80 whitespace-nowrap">
                    {sale.carTitle}
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-outfit text-xs sm:text-sm text-white/80 whitespace-nowrap">
                    {sale.buyer.name}
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-bebas text-sm lg:text-base text-amber-500 whitespace-nowrap">
                    {fmt(sale.paymentPlan.salePrice)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-outfit text-xs sm:text-sm text-white/50 whitespace-nowrap">
                    {paymentTypeLabel[sale.paymentPlan.type] || sale.paymentPlan.type}
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-outfit text-xs sm:text-sm text-white/50 whitespace-nowrap">
                    {fmtDate(sale.saleDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Recent Messages ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
        <h2 className="font-bebas text-xl sm:text-2xl text-white">Recent Messages</h2>
        <Link
          to="/admin/messages"
          className="font-outfit text-sm text-amber-500 hover:text-amber-400 transition-colors"
        >
          View All →
        </Link>
      </div>

      {recentMessages.length === 0 ? (
        <p className="font-outfit text-sm text-white/30 py-4">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 p-3 sm:p-4 rounded-lg border transition-colors ${
                msg.read
                  ? 'bg-dark border-white/5'
                  : 'bg-dark border-amber-500/15'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                style={{
                  backgroundColor: msg.read ? 'rgba(255,255,255,0.15)' : '#f59e0b',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-1">
                  <p className="font-bebas text-sm sm:text-base text-white tracking-wider">
                    {msg.senderName}
                  </p>
                  <p className="font-outfit text-xs text-white/35 whitespace-nowrap">
                    {fmtDate(msg.createdAt as unknown as { toDate: () => Date })}
                  </p>
                </div>
                <p className="font-outfit text-xs text-amber-500 mb-1">{msg.reason}</p>
                <p className="font-outfit text-xs sm:text-sm text-white/45 line-clamp-2">
                  {msg.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <SeedButton />
    </div>
  )
}
