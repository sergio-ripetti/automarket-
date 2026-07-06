import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2, Calendar, Gauge } from 'lucide-react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCars } from '../../hooks/useCars'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import Badge from '../../components/ui/Badge'
import type { Car } from '../../types'

// Formats a numeric price as NZD currency
function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

// Formats mileage with thousands separators and a "km" suffix
function formatKm(km: number): string {
  return km.toLocaleString('en-NZ') + ' km'
}

const fuelLabel: Record<string, string> = {
  gasolina: 'Petrol', diesel: 'Diesel', electrico: 'Electric', hibrido: 'Hybrid',
}

const transmissionLabel: Record<string, string> = {
  manual: 'Manual', automatico: 'Automatic',
}

// Admin vehicle inventory page - lists cars from Firestore (via useCars hook) with filters, and lets the admin toggle featured status, edit, or delete vehicles
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

  // Toggles a vehicle's "featured" flag in Firestore and updates local state
  const toggleFeatured = async (car: Car) => {
    try {
      await updateDoc(doc(db, 'cars', car.id), { featured: !car.featured })
      setLocalCars((prev) => prev.map((c) => c.id === car.id ? { ...c, featured: !c.featured } : c))
    } catch {
      showToast('Failed to update featured status.', 'error')
    }
  }

  // Deletes a vehicle from Firestore after user confirmation
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

  return (
    <div id="admin-inventory-main-container" className="admin-inventory-main-container">
      <style>{`
        .cars-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          font-weight: 600;
        }
      `}</style>
      {/* Header */}
      <div id="admin-inventory-header" className="admin-inventory-header flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <h1 className="font-bebas text-white cars-page-title">Vehicle Inventory</h1>
        <button
          id="admin-inventory-add-button"
          className="admin-inventory-add-button"
          onClick={() => navigate('/admin/cars/add')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
            padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1.25rem, 3vw, 1.75rem)',
            border: '1px solid #2E86AB',
            background: 'linear-gradient(135deg, rgba(29,78,216,0.2) 0%, rgba(29,78,216,0.1) 100%)',
            color: '#2E86AB',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(29,78,216,0.3) 0%, rgba(29,78,216,0.2) 100%)'
            e.currentTarget.style.color = '#A8C5D8'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(29,78,216,0.3)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(29,78,216,0.2) 0%, rgba(29,78,216,0.1) 100%)'
            e.currentTarget.style.color = '#2E86AB'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <PlusCircle size={16} />
          Add New Vehicle
        </button>
      </div>

      {/* Filters */}
      <div id="admin-inventory-filters" className="admin-inventory-filters flex gap-6 flex-wrap items-center" style={{ marginBottom: 'clamp(1.25rem, 3vw, 1.5rem)' }}>
        {[
          { checked: featuredOnly, onChange: () => setFeaturedOnly(!featuredOnly), label: 'Featured Only' },
          { checked: saleOnly, onChange: () => setSaleOnly(!saleOnly), label: 'On Sale Only' },
        ].map(({ checked, onChange, label }) => (
          <label
            key={label}
            onClick={onChange}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              cursor: 'pointer',
              padding: '0.5rem 0.875rem',
              border: `1px solid ${checked ? 'rgba(29,78,216,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: checked ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.03)',
              borderRadius: '0.375rem',
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!checked) {
                e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
                e.currentTarget.style.background = 'rgba(29,78,216,0.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (!checked) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }
            }}
          >
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '0.25rem',
              border: `1.5px solid ${checked ? '#2E86AB' : 'rgba(255,255,255,0.2)'}`,
              background: checked ? '#2E86AB' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}>
              {checked && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              color: checked ? '#2E86AB' : 'rgba(255,255,255,0.6)',
              fontWeight: checked ? 500 : 400,
              transition: 'color 0.2s ease',
            }}>
              {label}
            </span>
          </label>
        ))}
        <p className="text-xs text-white/35 ml-auto">
          {displayed.length} vehicle{displayed.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid of Cards */}
      {loading ? (
        <div id="admin-inventory-cards-grid" className="admin-inventory-cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-carbon border border-white/5 rounded-xl overflow-hidden animate-pulse">
              <div className="h-60 bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-6 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-lg font-inter">No vehicles found</p>
        </div>
      ) : (
        <div id="admin-inventory-cards-grid" className="admin-inventory-cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
          {displayed.map((car, idx) => (
            <div
              key={car.id}
              id={`admin-inventory-card-${idx}`}
              className={`admin-inventory-card admin-inventory-card-${idx} group relative bg-carbon border border-white/5 rounded-xl overflow-hidden hover:border-#2E86AB/30 transition-all duration-200 hover:shadow-xl hover:shadow-black/40`}
            >
              {/* Image */}
              <div className="relative h-60 overflow-hidden bg-slate-900">
                <img
                  src={car.images[0]}
                  alt={car.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-md" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {car.isOnSale && <Badge variant="danger">Sale</Badge>}
                  {car.featured && <Badge variant="gold">Featured</Badge>}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
                {/* Title */}
                <h3 className="font-bebas text-xl lg:text-2xl text-white tracking-wider mb-3 line-clamp-1">
                  {car.title}
                </h3>

                {/* Year & Mileage */}
                <div className="flex gap-4 mb-4 text-xs lg:text-sm">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Calendar size={14} className="text-#2E86AB" />
                    <span>{car.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Gauge size={14} className="text-#2E86AB" />
                    <span>{formatKm(car.km)}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <Badge variant="default" className="text-xs">
                    {transmissionLabel[car.transmission]}
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {fuelLabel[car.fuel]}
                  </Badge>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-5" />

                {/* Price */}
                <div className="mb-6">
                  <span className="font-bebas text-2xl text-#2E86AB tracking-wider">{fmt(car.price)}</span>
                </div>

                {/* Featured Toggle */}
                <label
                  onClick={() => toggleFeatured(car)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: '0.25rem',
                    border: `1.5px solid ${car.featured ? '#2E86AB' : 'rgba(255,255,255,0.2)'}`,
                    background: car.featured ? '#2E86AB' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}>
                    {car.featured && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.8rem',
                    color: car.featured ? '#2E86AB' : 'rgba(255,255,255,0.5)',
                    transition: 'color 0.2s ease',
                  }}>
                    Mark as Featured
                  </span>
                </label>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/admin/cars/edit/${car.id}`)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.6)',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '36px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(29,78,216,0.5)'
                      e.currentTarget.style.background = 'rgba(29,78,216,0.08)'
                      e.currentTarget.style.color = '#2E86AB'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                    }}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(car)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.05)',
                      color: 'rgba(239,68,68,0.7)',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '36px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
                      e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
                      e.currentTarget.style.color = 'rgba(239,68,68,0.7)'
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <AdminToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  )
}
