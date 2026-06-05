import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import CarCard from '../components/CarCard'
import { cars } from '../data/cars'

function getFavs(): string[] {
  try { return JSON.parse(localStorage.getItem('automarket_favourites') || '[]') } catch { return [] }
}

export default function Favourites() {
  const [favIds, setFavIds] = useState<string[]>(getFavs)

  useEffect(() => {
    const handleChange = () => setFavIds(getFavs())
    window.addEventListener('favourites-changed', handleChange as EventListener)
    return () => window.removeEventListener('favourites-changed', handleChange as EventListener)
  }, [])

  const savedCars = cars.filter((c) => favIds.includes(c.id))

  return (
    <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <div style={{ width: '80%', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#f59e0b' }} />
            <span
              className="font-bebas"
              style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#f59e0b' }}
            >
              YOUR COLLECTION
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: '#f59e0b' }} />
          </div>
          <h1
            className="font-bebas"
            style={{ fontSize: '4rem', color: 'white', lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '0.02em' }}
          >
            Saved Vehicles
          </h1>
          <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>
            {savedCars.length > 0
              ? `${savedCars.length} vehicle${savedCars.length !== 1 ? 's' : ''} saved`
              : 'Your saved vehicles will appear here'}
          </p>
        </div>

        {/* ── Empty state ── */}
        {savedCars.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              backgroundColor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Heart size={32} color="#f59e0b" />
            </div>
            <p
              className="font-bebas"
              style={{ fontSize: '2rem', color: 'white', letterSpacing: '0.05em', marginBottom: '0.5rem' }}
            >
              No Saved Vehicles Yet
            </p>
            <p style={{
              fontFamily: 'Outfit', fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem',
            }}>
              Click the heart on any car to save it here
            </p>
            <Link
              to="/cars"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000', fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.875rem',
                padding: '0.875rem 2rem', borderRadius: '0.625rem',
                textDecoration: 'none', letterSpacing: '0.04em',
              }}
            >
              Browse Cars <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          /* ── Cars grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-8">
            {savedCars.map((car, i) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <CarCard car={car} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
