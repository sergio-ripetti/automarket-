import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Gauge, Fuel, Settings2, ArrowRight, Heart } from 'lucide-react'
import type { Car } from '../types'

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

const transmissionLabel: Record<Car['transmission'], string> = {
  manual: 'Manual',
  automatico: 'Automatic',
}

function getFavs(): string[] {
  try { return JSON.parse(localStorage.getItem('automarket_favourites') || '[]') } catch { return [] }
}

export default function CarCard({ car }: CarCardProps) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
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
    <div
      onClick={() => navigate(`/auto/${car.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#111111',
        borderRadius: '1rem',
        border: `1px solid ${hovered ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.1)'
          : 'none',
      }}
    >
      {/* ── IMAGE ── */}
      <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
        <img
          src={car.images[0]}
          alt={car.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.5s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />

        {/* Badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
          {car.isOnSale && (
            <span style={{
              backgroundColor: '#dc2626', color: 'white',
              fontFamily: 'Outfit', fontSize: '0.65rem', fontWeight: 700,
              padding: '4px 10px', borderRadius: '2rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Sale
            </span>
          )}
          {car.featured && (
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000',
              fontFamily: 'Outfit', fontSize: '0.65rem', fontWeight: 700,
              padding: '4px 10px', borderRadius: '2rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Featured
            </span>
          )}
        </div>

        {/* Heart button */}
        <button
          onClick={toggleFav}
          style={{
            position: 'absolute', top: 12, right: 12,
            backgroundColor: isFav ? 'rgba(220,38,38,0.2)' : 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: `1px solid ${isFav ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '50%',
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Heart
            size={16}
            fill={isFav ? '#dc2626' : 'none'}
            color={isFav ? '#dc2626' : 'rgba(255,255,255,0.5)'}
          />
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '1.25rem' }}>

        {/* Title */}
        <p style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem', color: 'white',
          letterSpacing: '0.05em', marginBottom: '0.5rem', lineHeight: 1.1,
        }}>
          {car.title}
        </p>

        {/* Year + KM row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={13} color="#f59e0b" />
            <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
              {car.year}
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Gauge size={13} color="#f59e0b" />
            <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
              {formatKm(car.km)}
            </span>
          </span>
        </div>

        {/* Fuel + Transmission chips */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '2rem', padding: '3px 10px',
            fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Settings2 size={11} color="#f59e0b" />
            {transmissionLabel[car.transmission]}
          </span>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '2rem', padding: '3px 10px',
            fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Fuel size={11} color="#f59e0b" />
            {fuelLabel[car.fuel]}
          </span>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: '36px', marginBottom: '1.25rem' }}>
          {car.isOnSale && car.originalPrice && (
            <span style={{
              fontFamily: 'Outfit', fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through',
            }}>
              {formatPrice(car.originalPrice)}
            </span>
          )}
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: '#f59e0b', lineHeight: 1 }}>
            {formatPrice(car.price)}
          </span>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.25rem' }} />

        {/* View Details button */}
        <button
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            width: '100%', height: '44px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#000',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em',
            borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: btnHovered ? 0.9 : 1,
            boxShadow: btnHovered ? '0 0 20px rgba(245,158,11,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          VIEW DETAILS
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
