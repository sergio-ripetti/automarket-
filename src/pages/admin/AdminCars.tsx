import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2, Calendar, Gauge } from 'lucide-react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCars } from '../../hooks/useCars'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import type { Car } from '../../types'

function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function formatKm(km: number): string {
  return km.toLocaleString('en-NZ') + ' km'
}

const fuelLabel: Record<string, string> = {
  gasolina: 'Petrol', diesel: 'Diesel', electrico: 'Electric', hibrido: 'Hybrid',
}

const transmissionLabel: Record<string, string> = {
  manual: 'Manual', automatico: 'Automatic',
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-bebas text-3xl text-white">Vehicle Inventory</h1>
        <Button
          variant="primary"
          size="md"
          icon={<PlusCircle size={16} />}
          onClick={() => navigate('/admin/cars/add')}
        >
          Add New Vehicle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-6 mb-6 items-center">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60 font-outfit">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={() => setFeaturedOnly(!featuredOnly)}
            className="w-4 h-4 rounded border border-white/20 bg-white/10 cursor-pointer accent-amber-500"
          />
          Featured Only
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60 font-outfit">
          <input
            type="checkbox"
            checked={saleOnly}
            onChange={() => setSaleOnly(!saleOnly)}
            className="w-4 h-4 rounded border border-white/20 bg-white/10 cursor-pointer accent-amber-500"
          />
          On Sale Only
        </label>
        <p className="text-xs text-white/35 ml-auto">
          {displayed.length} vehicle{displayed.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid of Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          <p className="text-lg font-outfit">No vehicles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayed.map((car) => (
            <div
              key={car.id}
              className="group relative bg-carbon border border-white/5 rounded-xl overflow-hidden hover:border-amber-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
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
              <div className="p-5 lg:p-6">
                {/* Title */}
                <h3 className="font-bebas text-xl lg:text-2xl text-white tracking-wider mb-3 line-clamp-1">
                  {car.title}
                </h3>

                {/* Year & Mileage */}
                <div className="flex gap-4 mb-4 text-xs lg:text-sm">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Calendar size={14} className="text-amber-500" />
                    <span>{car.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60">
                    <Gauge size={14} className="text-amber-500" />
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
                  <span className="font-bebas text-2xl text-amber-500 tracking-wider">{fmt(car.price)}</span>
                </div>

                {/* Featured Toggle */}
                <label className="flex items-center gap-2 cursor-pointer mb-4 text-sm text-white/60 font-outfit">
                  <input
                    type="checkbox"
                    checked={car.featured}
                    onChange={() => toggleFeatured(car)}
                    className="w-4 h-4 rounded border border-white/20 bg-white/10 cursor-pointer accent-amber-500"
                  />
                  Mark as Featured
                </label>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Pencil size={14} />}
                    fullWidth
                    onClick={() => navigate(`/admin/cars/edit/${car.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    fullWidth
                    onClick={() => handleDelete(car)}
                  >
                    Delete
                  </Button>
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
