import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Search, Car, CheckCircle2, ArrowRight } from 'lucide-react'
import CarCard from '../components/CarCard'
import { useCars } from '../hooks/useCars'
import { useSoldCarIds } from '../hooks/useSoldCarIds'

// Home is a curated preview, not the complete catalog - capped at 12 (three full rows at the
// section's own lg:grid-cols-4 layout), per explicit product direction rather than an arbitrary
// number. Fewer than 12 available vehicles render exactly however many exist - never padded.
const HOME_VEHICLE_LIMIT = 12

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

// Custom hook that animates a number counting up from 0 to a target value using requestAnimationFrame with an ease-out curve - only starts once `started` becomes true
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

// Renders the public landing page - hero banner, featured cars fetched via useCars, animated stats counters, and how-it-works steps
export default function Home() {
  const { cars: allCars, loading: carsLoading, error: carsError } = useCars()
  // Sold status is derived from Sales (single source of truth, same helper used in Admin
  // Inventory / Record New Sale). Public pages fail CLOSED: while sold-status is still loading,
  // or if it failed to load, vehicle results are not rendered at all (see combined `loading`/
  // `error` below) - never silently expose a potentially-sold vehicle.
  const { soldCarIds, loading: salesLoading, error: salesError } = useSoldCarIds()

  // Deterministic selection: available Featured vehicles first, then available On Sale vehicles
  // not already selected, then any other available vehicles - each group preserves the existing
  // fetch order (getCars() sorts newest-first), so "preserve existing sort" / "newest first" both
  // fall out of the same underlying array order rather than a separate invented ranking. No
  // popularity/views/favorites-based ordering is used - this data doesn't exist in the app today.
  const homeCars = useMemo(() => {
    const available = allCars.filter((c) => !soldCarIds.has(c.id))
    const featured = available.filter((c) => c.featured)
    const onSaleFallback = available.filter((c) => !c.featured && c.isOnSale)
    const generalFallback = available.filter((c) => !c.featured && !c.isOnSale)
    return [...featured, ...onSaleFallback, ...generalFallback].slice(0, HOME_VEHICLE_LIMIT)
  }, [allCars, soldCarIds])

  // The heading must stay truthful: only call the section "Featured Vehicles" when every
  // rendered car is actually marked featured. As soon as On Sale/general fallback vehicles are
  // mixed in, switch to a neutral, accurate title instead of misrepresenting them as hand-picked.
  const allRenderedAreFeatured = homeCars.length > 0 && homeCars.every((c) => c.featured)
  const sectionTitle = allRenderedAreFeatured ? 'Featured Vehicles' : 'Recommended Vehicles'
  const sectionSubtitle = allRenderedAreFeatured ? 'Hand-picked by our team' : 'Featured picks and available vehicles'

  // Never render vehicle results until BOTH cars and sold-status data have resolved, and never
  // treat a Sales-fetch failure as "no sold vehicles" - both fail closed for public safety.
  const loading = carsLoading || salesLoading
  const combinedError = carsError || salesError

  const statsRef = useRef<HTMLDivElement>(null)
  const [statsStarted, setStatsStarted] = useState(false)

  // Watches the stats section and triggers the count-up animation once it scrolls into view
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
          backgroundImage: "url(/images/hero-bg.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}>
        {/* Premium cinematic overlay - sophisticated color grading */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg,
                rgba(0, 0, 0, 0.05) 0%,
                rgba(10, 10, 10, 0.03) 50%,
                rgba(0, 0, 0, 0.08) 100%
              )
            `,
          }}
        />

        {/* Subtle metallic shimmer overlay (optional premium touch) */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              radial-gradient(ellipse at 50% 50%,
                rgba(196, 196, 196, 0.1) 0%,
                rgba(196, 196, 196, 0) 70%
              )
            `,
          }}
        />

        {/* Premium content container */}
        <div
          className="relative z-10 text-center px-4 sm:px-6 w-full"
          style={{
            maxWidth: "720px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          {/* Eyebrow text - minimal and refined */}
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: "easeOut",
            }}
            className="uppercase tracking-widest"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: "Poppins",
              color: "rgba(255, 255, 255, 0.65)",
              letterSpacing: "0.15em",
              marginBottom: "28px",
              textTransform: "uppercase",
            }}>
            Luxury Automotive Marketplace
          </motion.p>

          {/* Main headline - premium automotive style */}
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.4,
              ease: "easeOut",
            }}
            style={{
              fontSize: "clamp(42px, 9vw, 68px)",
              fontWeight: 700,
              fontFamily: "Poppins",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "32px",
              color: "#FFFFFF",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              maxWidth: "720px",
            }}>
            FIND YOUR IDEAL VEHICLE
          </motion.h1>

          {/* Premium description with better breathing room */}
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.6,
              ease: "easeOut",
            }}
            style={{
              maxWidth: "620px",
              fontSize: "clamp(22px, 2.2vw, 23px)",
              fontFamily: "Poppins",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 1)",
              lineHeight: 1.8,
              marginBottom: "48px",
              letterSpacing: "0.5px",
            }}>
            Buy, sell, or finance with confidence. Browse premium vehicles with
            transparent pricing and expert support.
          </motion.p>

          {/* Premium CTA buttons with refined styling */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.8,
              ease: "easeOut",
            }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
            style={{ maxWidth: "520px" }}>
            {/* Primary CTA - Graphite with lime accent */}
            <Link
              to="/cars"
              className="group inline-flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                background: "rgba(26, 26, 26, 0.9)",
                color: "#FFFFFF",
                padding: "16px 40px",
                height: "56px",
                borderRadius: "8px",
                fontSize: "15px",
                fontFamily: "Poppins",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textDecoration: "none",
                border: "2px solid rgba(196, 255, 0, 0.3)",
                backdropFilter: "blur(8px)",
                flex: "1",
                minWidth: "200px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(26, 26, 26, 1)";
                (e.currentTarget as HTMLElement).style.borderColor = "#C4FF00";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 16px 48px rgba(196, 255, 0, 0.25)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(26, 26, 26, 0.9)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(196, 255, 0, 0.3)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
              }}>
              EXPLORE CARS <ArrowRight size={16} strokeWidth={2.5} />
            </Link>

            {/* Secondary CTA - Glass effect */}
            <button
              onClick={() => (window.location.href = "/financing")}
              className="group inline-flex items-center justify-center transition-all duration-300"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                border: "1.5px solid rgba(255, 255, 255, 0.3)",
                padding: "16px 40px",
                height: "56px",
                borderRadius: "8px",
                fontSize: "15px",
                fontFamily: "Poppins",
                fontWeight: 600,
                letterSpacing: "0.05em",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                flex: "1",
                minWidth: "200px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255, 255, 255, 0.12)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(196, 255, 0, 0.5)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 16px 48px rgba(0, 0, 0, 0.2)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255, 255, 255, 0.05)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255, 255, 255, 0.3)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(0)";
              }}>
              FINANCING OPTIONS
            </button>
          </motion.div>
        </div>

        {/* Elegant scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}>
          <p
            style={{
              fontSize: "11px",
              fontFamily: "Poppins",
              color: "rgba(255, 255, 255, 0.4)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
            Scroll
          </p>
          <ChevronDown size={20} className="text-white/40 animate-bounce" />
        </motion.div>
      </section>

      {/* ─── FEATURED VEHICLES ─── */}
      <div
        className="w-full flex justify-center"
        style={{
          backgroundColor: "#F2F2F0",
          paddingTop: "60px",
          paddingBottom: "80px",
        }}>
        <div className="mx-auto flex flex-col gap-10" style={{ width: "80%" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}>
            {/* <p className="font-inter text-[#C4FF00] uppercase tracking-[0.2em] text-xs mb-2">
              Selection
            </p> */}
            <h2 className="font-bebas text-[#1A1A1A] tracking-wide leading-none ">
              {sectionTitle}
            </h2>
            <p className="font-inter text-[#767676] text-sm mt-4">
              {sectionSubtitle}
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "1rem",
                    height: "380px",
                  }}
                />
              ))}
            </div>
          ) : combinedError ? (
            <p
              style={{
                fontFamily: "Outfit",
                color: "#767676",
                fontSize: "0.9rem",
              }}>
              {combinedError} Please try again later.
            </p>
          ) : homeCars.length === 0 ? (
            <p
              style={{
                fontFamily: "Outfit",
                color: "#767676",
                fontSize: "0.9rem",
              }}>
              No vehicles available right now.{" "}
              <Link to="/cars" style={{ color: "#1A1A1A", textDecoration: "underline" }}>
                Browse all vehicles
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {homeCars.map((car, i) => (
                <motion.div
                  key={car.id}
                  className="h-full"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}>
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
          backgroundColor: "#F2F2F0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginTop: "4rem",
        }}>
        <div className="mx-auto py-16" style={{ width: "80%" }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}>
                <p
                  className="font-bebas"
                  style={{
                    fontSize: "3.5rem",
                    color: "#C4FF00",
                    lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}>
                  {counts[i]}
                  {stat.suffix}
                </p>
                <p className="font-inter text-xs text-[#767676] uppercase tracking-widest">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <div
        className="w-full flex justify-center"
        style={{
          backgroundColor: "#F2F2F0",
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}>
        <div className="mx-auto" style={{ width: "80%" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12">
            <p className="font-inter text-#C4FF00 uppercase tracking-[0.2em] text-xs mb-2">
              Process
            </p>
            <h2 className="font-bebas text-[#0D1B2A] tracking-wide leading-none">
              How It <span className="text-#C4FF00">Works</span>
            </h2>
          </motion.div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            style={{ marginBottom: "3rem" }}>
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "1rem",
                  padding: "2rem",
                }}>
                <div className="flex items-start justify-between mb-6">
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "0.75rem",
                      backgroundColor: "rgba(29,78,216,0.1)",
                      border: "1px solid rgba(29,78,216,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                    <step.icon size={20} className="text-#C4FF00" />
                  </div>
                  <span
                    className="font-bebas"
                    style={{
                      fontSize: "3.5rem",
                      color: "rgba(29,78,216,0.12)",
                      lineHeight: 1,
                    }}>
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bebas text-[#0D1B2A] tracking-wide mb-2">
                  {step.title}
                </h3>
                <p className="font-inter text-sm text-[#767676] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BROWSE ALL CTA ─── */}
      <div
        className="w-full flex justify-center"
        style={{
          backgroundColor: "#F2F2F0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "4rem",
          paddingBottom: "6rem",
        }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center px-4">
          <h2 className="font-bebas text-[#0D1B2A] tracking-wide mb-4">
            Ready to Find Your Car?
          </h2>
          <p className="font-inter text-[#767676] text-sm mb-10 max-w-xs mx-auto leading-relaxed">
            Browse our full catalogue of 500+ quality vehicles with advanced
            filtering.
          </p>
          <Link
            to="/cars"
            className="font-inter font-bold text-base inline-flex items-center gap-2.5"
            style={{
              background: "#1A1A1A",
              color: "#FFFFFF",
              padding: "1rem 2.5rem",
              borderRadius: "0.625rem",
              letterSpacing: "0.04em",
            }}>
            Browse All Cars →
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
