import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import CarCard from '../components/CarCard'
import { getCars } from '../lib/carsService'
import type { Car } from '../types'

// Reads the list of favourited car ids from localStorage
function getFavs(): string[] {
  try { return JSON.parse(localStorage.getItem('automarket_favourites') || '[]') } catch { return [] }
}

// Displays the user's saved/favourited cars - reads favourite ids from localStorage and cross-references them against the live Firestore car list, refreshing when favourites change elsewhere in the app
export default function Favourites() {
  const [favIds, setFavIds] = useState<string[]>(getFavs)
  const [allCars, setAllCars] = useState<Car[]>([])
  const [loadingCars, setLoadingCars] = useState(true)

  useEffect(() => {
    // Re-reads favourites from localStorage whenever the "favourites-changed" custom event fires (e.g. after toggling a heart on another page)
    const handleChange = () => setFavIds(getFavs())
    window.addEventListener('favourites-changed', handleChange as EventListener)
    return () => window.removeEventListener('favourites-changed', handleChange as EventListener)
  }, [])

  useEffect(() => {
    // Fetches the full car inventory from Firestore on mount, so favourite ids (which reference real Firestore doc ids) can be resolved to actual car records
    const load = async () => {
      try {
        const data = await getCars()
        setAllCars(data)
      } catch (err) {
        console.error('Failed to load cars:', err)
      } finally {
        setLoadingCars(false)
      }
    }
    load()
  }, [])

  const savedCars = allCars.filter((c) => favIds.includes(c.id))

  return (
    <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#EEF2F7', minHeight: '100vh' }}>
      <div style={{ width: '80%', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#2E86AB' }} />
            <span
              className="font-bebas"
              style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#2E86AB' }}
            >
              YOUR COLLECTION
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: '#2E86AB' }} />
          </div>
          <h1
            className="font-bebas"
            style={{color: "#0D1B2A", lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '0.02em' }}
          >
            Saved Vehicles
          </h1>
          <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>
            {loadingCars
              ? 'Loading your saved vehicles...'
              : savedCars.length > 0
                ? `${savedCars.length} vehicle${savedCars.length !== 1 ? 's' : ''} saved`
                : 'Your saved vehicles will appear here'}
          </p>
        </div>

        {loadingCars ? (
          /* ── Loading skeleton ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{ height: '380px', backgroundColor: '#FFFFFF', borderRadius: '0.75rem', animation: 'pulse 1.5s infinite' }}
              />
            ))}
          </div>
        ) : savedCars.length === 0 ? (
          /* ── Empty state ── */
          <div style={{ textAlign: 'center', paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              backgroundColor: 'rgba(29,78,216,0.08)',
              border: '1px solid rgba(29,78,216,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Heart size={32} color="#2E86AB" />
            </div>
            <p
              className="font-bebas"
              style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '0.5rem' }}
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
                background: 'linear-gradient(135deg, #2E86AB 0%, #256E8C 100%)',
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch pb-8">
            {savedCars.map((car, i) => (
              <motion.div
                key={car.id}
                className="h-full"
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
