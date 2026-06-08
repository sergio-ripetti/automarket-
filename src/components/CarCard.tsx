import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Gauge, Fuel, Zap, ArrowRight, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Car } from '../types'
import Badge from './ui/Badge'
import Button from './ui/Button'

interface CarCardProps {
  car: Car
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function formatKm(km: number): string {
  return km.toLocaleString('en-NZ') + ' km'
}

const fuelLabel: Record<Car['fuel'], string> = {
  gasolina: 'Petrol',
  diesel: 'Diesel',
  electrico: 'Electric',
  hibrido: 'Hybrid',
}

const fuelIcon: Record<Car['fuel'], React.ReactNode> = {
  gasolina: <Fuel size={14} />,
  diesel: <Fuel size={14} />,
  electrico: <Zap size={14} />,
  hibrido: <Zap size={14} />,
}

const transmissionLabel: Record<Car['transmission'], string> = {
  manual: 'Manual',
  automatico: 'Automatic',
}

function getFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem('automarket_favourites') || '[]')
  } catch {
    return []
  }
}

export default function CarCard({ car }: CarCardProps) {
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(() => getFavs().includes(car.id))

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    const favs = getFavs()
    const newFavs = favs.includes(car.id)
      ? favs.filter((id) => id !== car.id)
      : [...favs, car.id]
    localStorage.setItem('automarket_favourites', JSON.stringify(newFavs))
    setIsFav(!isFav)
    window.dispatchEvent(new CustomEvent('favourites-changed'))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/auto/${car.id}`)}
      className="group relative bg-gray-900 border border-white/5 rounded-xl overflow-hidden hover:border-amber-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
      role="article"
      aria-label={`${car.title} - ${formatPrice(car.price)}`}
    >
      {/* Image Container */}
      <div className="relative h-60 overflow-hidden bg-slate-900">
        <img
          src={car.images[0]}
          alt={car.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        {/* Image Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-md" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {car.isOnSale && <Badge variant="danger">Sale</Badge>}
          {car.featured && <Badge variant="amber-500">Featured</Badge>}
        </div>

        {/* Favorite Button */}
        <button
          onClick={toggleFav}
          className={`absolute top-4 right-4 w-10 h-10 rounded-lg backdrop-blur-md border transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            isFav
              ? 'bg-red-500/30 border-red-500/50 text-red-400'
              : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
          }`}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFav}
        >
          <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
        </button>
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
            <Calendar size={14} className="text-amber-500" aria-hidden="true" />
            <span>{car.year}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/60">
            <Gauge size={14} className="text-amber-500" aria-hidden="true" />
            <span>{formatKm(car.km)}</span>
          </div>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Badge variant="default" className="text-xs">
            {transmissionLabel[car.transmission]}
          </Badge>
          <Badge variant="default" className="flex items-center gap-1.5 text-xs">
            <span className="text-amber-500">{fuelIcon[car.fuel]}</span>
            {fuelLabel[car.fuel]}
          </Badge>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-5" />

        {/* Price */}
        <div className="flex items-baseline gap-3 mb-6">
          {car.isOnSale && car.originalPrice && (
            <span className="text-sm text-white/40 line-through">{formatPrice(car.originalPrice)}</span>
          )}
          <span className="font-bebas text-2xl text-amber-500 tracking-wider">{formatPrice(car.price)}</span>
        </div>

        {/* Button */}
        <Button
          variant="primary"
          size="md"
          fullWidth
          icon={<ArrowRight size={16} />}
          aria-label={`View details for ${car.title}`}
          className="group/btn"
        >
          <span className="group-hover/btn:tracking-wider transition-all duration-sm">View Details</span>
        </Button>
      </div>
    </motion.div>
  )
}
