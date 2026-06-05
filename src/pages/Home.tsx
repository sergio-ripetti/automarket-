import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Search, Car, CheckCircle2, ArrowRight } from 'lucide-react'
import CarCard from '../components/CarCard'
import { useCars } from '../hooks/useCars'

const stats = [
  { end: 500,  suffix: '+', label: 'Cars Available' },
  { end: 1200, suffix: '+', label: 'Happy Customers' },
  { end: 8,    suffix: '',  label: 'Years Experience' },
  { end: 98,   suffix: '%', label: 'Satisfaction Rate' },
]

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Browse Our Catalogue',
    description: 'Explore hundreds of quality vehicles. Filter by brand, model, year, price and fuel type to narrow your search instantly.',
  },
  {
    number: '02',
    icon: Car,
    title: 'Find Your Perfect Car',
    description: 'Compare specs, view detailed galleries, read seller notes and simulate your financing — all in one place.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Drive Away Happy',
    description: 'Make your offer, handle the paperwork with our team, and hit the road in your new vehicle with full confidence.',
  },
]

function useCountUp(end: number, duration: number = 2000, started: boolean = false): number {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!started) return
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const progress = 1 - Math.pow(1 - t, 4) // easeOutQuart
      setCount(Math.round(progress * end))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [end, duration, started])

  return count
}

export default function Home() {
  const { cars: allCars, loading: carsLoading, error: carsError } = useCars()
  const featuredCars = allCars.filter((c) => c.featured)

  const statsRef = useRef<HTMLDivElement>(null)
  const [statsStarted, setStatsStarted] = useState(false)

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const c0 = useCountUp(stats[0].end, 2000, statsStarted)
  const c1 = useCountUp(stats[1].end, 2200, statsStarted)
  const c2 = useCountUp(stats[2].end, 1400, statsStarted)
  const c3 = useCountUp(stats[3].end, 2000, statsStarted)
  const counts = [c0, c1, c2, c3]

  return (
    <main>
      {/* ─── HERO ─── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/60 to-dark" />

        <div className="relative z-10 text-center px-4" style={{ maxWidth: '60rem' }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-outfit text-gold uppercase tracking-[0.25em] text-xs mb-5"
          >
            New Zealand's Premier Car Marketplace
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-bebas text-7xl sm:text-8xl lg:text-[7rem] text-white leading-none mb-6 tracking-wide"
          >
            FIND YOUR{' '}
            <span className="text-gold">PERFECT</span>
            {' '}CAR
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-lg text-white/60 mb-10 max-w-lg mx-auto"
          >
            Buy, sell, and finance with complete confidence. Quality vehicles, transparent pricing, expert support.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link
              to="/cars"
              className="font-outfit font-bold text-sm inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000', padding: '0.875rem 2rem',
                borderRadius: '0.5rem', letterSpacing: '0.04em',
              }}
            >
              Browse All Cars <ArrowRight size={16} />
            </Link>
            <Link
              to="/financiamiento"
              className="font-outfit font-medium text-sm text-white hover:text-gold transition-colors"
              style={{
                padding: '0.875rem 2rem', borderRadius: '0.5rem',
                letterSpacing: '0.04em', border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Financing Calculator
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown size={26} className="text-white/30 animate-bounce" />
        </motion.div>
      </section>

      {/* ─── FEATURED VEHICLES ─── */}
      <div className="w-full flex justify-center py-20" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="mx-auto flex flex-col gap-10" style={{ width: '80%' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <p className="font-outfit text-gold uppercase tracking-[0.2em] text-xs mb-2">Selection</p>
            <h2 className="font-bebas text-5xl text-white tracking-wide leading-none">
              Featured <span className="text-gold">Vehicles</span>
            </h2>
            <p className="font-outfit text-white/40 text-sm mt-2">Hand-picked by our team</p>
          </motion.div>

          {carsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{ backgroundColor: '#111111', borderRadius: '1rem', height: '380px' }}
                />
              ))}
            </div>
          ) : carsError ? (
            <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
              {carsError} Please try again later.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredCars.map((car, i) => (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <CarCard car={car} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── STATS ─── */}
      <div
        ref={statsRef}
        className="w-full"
        style={{
          backgroundColor: '#0f0f0f',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginTop: '4rem',
        }}
      >
        <div className="mx-auto py-16" style={{ width: '80%' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p
                  className="font-bebas"
                  style={{ fontSize: '3.5rem', color: '#f59e0b', lineHeight: 1, marginBottom: '0.25rem' }}
                >
                  {counts[i]}{stat.suffix}
                </p>
                <p className="font-outfit text-xs text-white/40 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <div
        className="w-full flex justify-center"
        style={{ backgroundColor: '#0a0a0a', paddingTop: '4rem', paddingBottom: '4rem' }}
      >
        <div className="mx-auto" style={{ width: '80%' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="font-outfit text-gold uppercase tracking-[0.2em] text-xs mb-2">Process</p>
            <h2 className="font-bebas text-5xl text-white tracking-wide leading-none">
              How It <span className="text-gold">Works</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '3rem' }}>
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '1rem',
                  padding: '2rem',
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    style={{
                      width: '3rem', height: '3rem', borderRadius: '0.75rem',
                      backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <step.icon size={20} className="text-gold" />
                  </div>
                  <span
                    className="font-bebas"
                    style={{ fontSize: '3.5rem', color: 'rgba(245,158,11,0.12)', lineHeight: 1 }}
                  >
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bebas text-xl text-white tracking-wide mb-2">{step.title}</h3>
                <p className="font-outfit text-sm text-white/45 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BROWSE ALL CTA ─── */}
      <div
        className="w-full flex justify-center"
        style={{
          backgroundColor: '#0f0f0f',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '4rem',
          paddingBottom: '6rem',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center px-4"
        >
          <h2 className="font-bebas text-5xl sm:text-6xl text-white tracking-wide mb-4">
            Ready to Find Your Car?
          </h2>
          <p className="font-outfit text-white/40 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
            Browse our full catalogue of 500+ quality vehicles with advanced filtering.
          </p>
          <Link
            to="/cars"
            className="font-outfit font-bold text-base inline-flex items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000', padding: '1rem 2.5rem',
              borderRadius: '0.625rem', letterSpacing: '0.04em',
            }}
          >
            Browse All Cars →
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
