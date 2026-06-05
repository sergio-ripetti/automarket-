import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCars } from '../../hooks/useCars'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { Car } from '../../types'

function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

const fuelLabel: Record<string, string> = {
  gasolina: 'Petrol', diesel: 'Diesel', electrico: 'Electric', hibrido: 'Hybrid',
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
        backgroundColor: value ? '#f59e0b' : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16,
        borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
      }} />
    </div>
  )
}

export default function AdminCars() {
  const navigate = useNavigate()
  const { cars: firestoreCars, loading } = useCars()
  const [localCars, setLocalCars] = useState<Car[]>([])
  const [initialized, setInitialized] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [saleOnly, setSaleOnly] = useState(false)
  const { toast, showToast, dismissToast } = useToast()

  if (!initialized && !loading && firestoreCars.length > 0) {
    setLocalCars(firestoreCars)
    setInitialized(true)
  }

  const displayed = localCars
    .filter((c) => !featuredOnly || c.featured)
    .filter((c) => !saleOnly || c.isOnSale)

  const toggleFeatured = async (car: Car) => {
    try {
      await updateDoc(doc(db, 'cars', car.id), { featured: !car.featured })
      setLocalCars((prev) => prev.map((c) => c.id === car.id ? { ...c, featured: !c.featured } : c))
    } catch {
      showToast('Failed to update featured status.', 'error')
    }
  }

  const handleDelete = async (car: Car) => {
    if (!window.confirm(`Delete "${car.title}"? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'cars', car.id))
      setLocalCars((prev) => prev.filter((c) => c.id !== car.id))
      showToast('Vehicle deleted successfully.', 'success')
    } catch {
      showToast('Failed to delete vehicle.', 'error')
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '1rem 1.25rem', textAlign: 'left',
    fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', fontWeight: 400,
  }
  const tdStyle: React.CSSProperties = {
    padding: '0.875rem 1.25rem', fontFamily: 'Outfit', fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="font-bebas" style={{ fontSize: '2rem', color: 'white', lineHeight: 1 }}>
          Vehicle Inventory
        </h1>
        <button
          onClick={() => navigate('/admin/cars/add')}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#000', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.875rem',
            padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <PlusCircle size={16} /> Add New Vehicle
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Featured Only', value: featuredOnly, set: setFeaturedOnly },
          { label: 'On Sale Only', value: saleOnly, set: setSaleOnly },
        ].map(({ label, value, set }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
            <Toggle value={value} onChange={() => set((v) => !v)} />
            {label}
          </label>
        ))}
        <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto', alignSelf: 'center' }}>
          {displayed.length} vehicle{displayed.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              {['Photo', 'Vehicle', 'Year', 'Price', 'KM', 'Fuel', 'Featured', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((__, j) => (
                    <td key={j} style={tdStyle}>
                      <div className="animate-pulse" style={{ height: 16, backgroundColor: '#1a1a1a', borderRadius: 4, width: '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                  No vehicles found
                </td>
              </tr>
            ) : displayed.map((car) => (
              <tr key={car.id} style={{ transition: 'background-color 0.15s' }}>
                <td style={tdStyle}>
                  <img
                    src={car.images[0]} alt={car.title}
                    style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: '0.375rem', display: 'block' }}
                  />
                </td>
                <td style={tdStyle}>
                  <p style={{ fontWeight: 600, color: 'white', marginBottom: 2 }}>{car.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{car.brand} · {car.model}</p>
                </td>
                <td style={tdStyle}>{car.year}</td>
                <td style={{ ...tdStyle, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#f59e0b' }}>
                  {fmt(car.price)}
                </td>
                <td style={tdStyle}>{car.km.toLocaleString()} km</td>
                <td style={tdStyle}>{fuelLabel[car.fuel]}</td>
                <td style={tdStyle}>
                  <Toggle value={car.featured} onChange={() => toggleFeatured(car)} />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/admin/cars/edit/${car.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        border: '1px solid rgba(245,158,11,0.5)', color: '#f59e0b',
                        padding: '0.4rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                        backgroundColor: 'transparent', fontFamily: 'Outfit', fontSize: '0.8rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(car)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        border: '1px solid rgba(220,38,38,0.4)', color: '#ef4444',
                        padding: '0.4rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                        backgroundColor: 'transparent', fontFamily: 'Outfit', fontSize: '0.8rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <AdminToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  )
}
