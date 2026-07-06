import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Gauge, Settings, Fuel, Zap, ArrowRight, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Car } from '../types'

interface CarCardProps {
  car: Car
}

// Formats a numeric price into NZD currency string for display
function formatPrice(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

// Formats a numeric odometer value into a localized "km" string for display
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
  gasolina: <Fuel size={13} />,
  diesel: <Fuel size={13} />,
  electrico: <Zap size={13} />,
  hibrido: <Zap size={13} />,
}

const transmissionLabel: Record<Car['transmission'], string> = {
  manual: 'Manual',
  automatico: 'Automatic',
}

// Reads the list of favourited car IDs from localStorage
function getFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem('automarket_favourites') || '[]')
  } catch {
    return []
  }
}

// Shared inline padding for the two "Automatic / Petrol" pill tags (site-wide Tailwind px-*/py-* utilities are
// currently overridden by the unlayered `* { padding: 0 }` reset in index.css, so padding is set inline here)
const tagStyle: React.CSSProperties = {
  padding: '2px 8px',
}

// Displays a single car's summary (image, price, specs) as a clickable card that navigates to its detail page
export default function CarCard({ car }: CarCardProps) {
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(() => getFavs().includes(car.id))

  // Adds/removes this car from favourites in localStorage and notifies other components via a custom event
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
      className="group relative flex flex-col h-full bg-[#FFFFFF] border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-700/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer"
      role="article"
      aria-label={`${car.title} - ${formatPrice(car.price)}`}
    >
      {/* Image Container */}
      <div className="relative h-[200px] overflow-hidden bg-neutral-900">
        <img
          src={car.images[0]}
          alt={car.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {car.isOnSale && (
            <span
              className="bg-red-500/90 text-white font-bebas rounded"
              style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', padding: '3px 10px' }}
            >
              SALE
            </span>
          )}
          {car.featured && (
            <span
              className="bg-blue-700/90 text-black font-bebas rounded"
              style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', padding: '3px 10px' }}
            >
              FEATURED
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={toggleFav}
          className={`absolute top-2.5 right-2.5 w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
            isFav
              ? 'bg-red-500/50 border-red-500/60 text-red-400'
              : 'bg-[#FAFBFC]/50 border-white/15 text-white/70 hover:bg-white/10'
          }`}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFav}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1" style={{ padding: '1rem 1.25rem' }}>
        {/* Title */}
        <h3
          className="font-bebas text-white"
          style={{
            fontSize: car.title.length > 20 ? 'clamp(0.875rem, 2vw, 1rem)' : 'clamp(1rem, 2.5vw, 1.25rem)',
            letterSpacing: '0.05em',
            lineHeight: 1.2,
            marginBottom: '0.5rem',
            minHeight: '2.4rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {car.title}
        </h3>

        {/* Specs row */}
        <div className="flex flex-wrap gap-3" style={{ marginBottom: '0.75rem' }}>
          <div className="flex items-center gap-1">
            <Calendar size={13} className="text-blue-700" aria-hidden="true" />
            <span className="font-inter text-white/55" style={{ fontSize: '0.75rem' }}>{car.year}</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge size={13} className="text-blue-700" aria-hidden="true" />
            <span className="font-inter text-white/55" style={{ fontSize: '0.75rem' }}>{formatKm(car.km)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings size={13} className="text-blue-700" aria-hidden="true" />
            <span className="font-inter text-white/55" style={{ fontSize: '0.75rem' }}>{transmissionLabel[car.transmission]}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-700 inline-flex">{fuelIcon[car.fuel]}</span>
            <span className="font-inter text-white/55" style={{ fontSize: '0.75rem' }}>{fuelLabel[car.fuel]}</span>
          </div>
        </div>

        {/* Specs tags */}
        <div className="inline-flex flex-wrap gap-1.5" style={{ marginBottom: '0.75rem' }}>
          <span
            className="inline-flex bg-white/[0.06] border border-white/10 text-white/50 font-inter rounded"
            style={{ ...tagStyle, fontSize: '0.7rem' }}
          >
            {transmissionLabel[car.transmission]}
          </span>
          <span
            className="inline-flex bg-white/[0.06] border border-white/10 text-white/50 font-inter rounded"
            style={{ ...tagStyle, fontSize: '0.7rem' }}
          >
            {fuelLabel[car.fuel]}
          </span>
        </div>

        {/* Divider */}
        <div
          className="bg-gradient-to-r from-white/[0.08] to-transparent"
          style={{ height: '1px', margin: '0.75rem 0' }}
        />

        {/* Price */}
        <div
          className="flex flex-wrap items-baseline"
          style={{ gap: '0.75rem', marginBottom: '1rem', minHeight: '2.5rem' }}
        >
          {car.isOnSale && car.originalPrice ? (
            <>
              <span className="text-white/35 line-through font-inter" style={{ fontSize: '0.875rem', lineHeight: 1 }}>
                {formatPrice(car.originalPrice)}
              </span>
              <span
                className="font-bebas text-blue-700"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', letterSpacing: '0.05em', lineHeight: 1 }}
              >
                {formatPrice(car.price)}
              </span>
            </>
          ) : (
            <span
              className="font-bebas text-blue-700"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', letterSpacing: '0.05em', lineHeight: 1 }}
            >
              {formatPrice(car.price)}
            </span>
          )}
        </div>

        {/* Spacer - pushes the button to the bottom of the card regardless of content length above */}
        <div className="flex-1" />

        {/* View Details Button */}
        <button
          aria-label={`View details for ${car.title}`}
          className="w-full h-11 flex items-center justify-center gap-2 font-inter text-black rounded-lg border-none cursor-pointer transition-all duration-200 bg-gradient-to-br from-blue-700 to-amber-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_4px_15px_rgba(29,78,216,0.4)] hover:-translate-y-px"
          style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em' }}
        >
          VIEW DETAILS <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}
