import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Gauge, Settings, Fuel, Zap, ArrowRight, Heart, Tag, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import VehicleStatusBadge from './ui/VehicleStatusBadge'
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
      className="group relative flex flex-col h-full bg-[#FFFFFF] border border-[#E0E0DC] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#1A1A1A]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer"
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

        {/* Badges - same shared visual system as Admin Inventory (VehicleStatusBadge), so
            customer-facing cards and the admin dashboard read as one design language */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {car.isOnSale && <VehicleStatusBadge icon={Tag} label="SALE" tone="sale" />}
          {car.featured && <VehicleStatusBadge icon={Star} label="FEATURED" tone="featured" />}
        </div>

        {/* Favorite Button */}
        <button
          onClick={toggleFav}
          className={`absolute top-2.5 right-2.5 w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4FF00] ${
            isFav
              ? 'bg-[#D64545]/50 border-[#D64545]/60 text-[#D64545]'
              : 'bg-white/50 border-white/15 text-[#1A1A1A]/70 hover:bg-white/20'
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
          className="font-bebas text-[#1A1A1A]"
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
            <Calendar size={13} className="text-[#4A4A4A]" aria-hidden="true" />
            <span className="font-inter text-[#4A4A4A]" style={{ fontSize: '0.75rem' }}>{car.year}</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge size={13} className="text-[#4A4A4A]" aria-hidden="true" />
            <span className="font-inter text-[#4A4A4A]" style={{ fontSize: '0.75rem' }}>{formatKm(car.km)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings size={13} className="text-[#4A4A4A]" aria-hidden="true" />
            <span className="font-inter text-[#4A4A4A]" style={{ fontSize: '0.75rem' }}>{transmissionLabel[car.transmission]}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#4A4A4A] inline-flex">{fuelIcon[car.fuel]}</span>
            <span className="font-inter text-[#4A4A4A]" style={{ fontSize: '0.75rem' }}>{fuelLabel[car.fuel]}</span>
          </div>
        </div>

        {/* Specs tags */}
        <div className="inline-flex flex-wrap gap-1.5" style={{ marginBottom: '0.75rem' }}>
          <span
            className="inline-flex bg-[#F2F2F0] border border-[#E0E0DC] text-[#4A4A4A] font-inter rounded"
            style={{ ...tagStyle, fontSize: '0.7rem' }}
          >
            {transmissionLabel[car.transmission]}
          </span>
          <span
            className="inline-flex bg-[#F2F2F0] border border-[#E0E0DC] text-[#4A4A4A] font-inter rounded"
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
              <span className="text-[#4A4A4A] line-through font-inter" style={{ fontSize: '0.875rem', lineHeight: 1 }}>
                {formatPrice(car.originalPrice)}
              </span>
              <span
                className="font-bebas text-[#1A1A1A]"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', letterSpacing: '0.05em', lineHeight: 1 }}
              >
                {formatPrice(car.price)}
              </span>
            </>
          ) : (
            <span
              className="font-bebas text-[#1A1A1A]"
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
          className="w-full h-11 flex items-center justify-center gap-2 font-inter text-white rounded-lg border-none cursor-pointer transition-all duration-200 bg-[#1A1A1A] hover:bg-[#2A2A2A] hover:shadow-[0_4px_15px_rgba(26,26,26,0.4)] hover:-translate-y-px"
          style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em' }}
        >
          VIEW DETAILS <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}
