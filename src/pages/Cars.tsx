import { useState } from 'react'
import { motion } from 'framer-motion'
import { SearchX } from 'lucide-react'
import FilterBar from '../components/FilterBar'
import CarCard from '../components/CarCard'
import { useCars } from '../hooks/useCars'
import type { FilterState } from '../types'

const emptyFilters: FilterState = {
  search: '',
  brand: '',
  model: '',
  yearMin: '',
  yearMax: '',
  priceMin: '',
  priceMax: '',
  fuel: '',
}

export default function Cars() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const { cars: allCars, loading, error } = useCars()

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  const filteredCars = allCars.filter((car) => {
    if (
      filters.search &&
      !car.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !car.brand.toLowerCase().includes(filters.search.toLowerCase()) &&
      !car.model.toLowerCase().includes(filters.search.toLowerCase())
    ) return false
    if (filters.brand && car.brand !== filters.brand) return false
    if (filters.model && car.model !== filters.model) return false
    if (filters.yearMin && car.year < Number(filters.yearMin)) return false
    if (filters.yearMax && car.year > Number(filters.yearMax)) return false
    if (filters.priceMin && car.price < Number(filters.priceMin)) return false
    if (filters.priceMax && car.price > Number(filters.priceMax)) return false
    if (filters.fuel && car.fuel !== filters.fuel) return false
    return true
  })

  const displayed = hasActiveFilters ? filteredCars : allCars

  return (
    <main style={{ paddingTop: '72px', minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      <div className="w-full flex justify-center py-12">
        <div className="mx-auto flex flex-col gap-10" style={{ width: '80%' }}>

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-outfit text-amber-500 uppercase tracking-[0.2em] text-xs mb-2">Catalogue</p>
            <h1 className="font-bebas text-5xl text-white tracking-wide leading-none">
              Our <span className="text-amber-500">Vehicles</span>
            </h1>
            <p className="font-outfit text-white/40 text-sm mt-2">Find your perfect match</p>
          </motion.div>

          {/* Filter bar */}
          <FilterBar
            cars={allCars}
            filters={filters}
            onFilterChange={setFilters}
            onClear={() => setFilters(emptyFilters)}
          />

          {/* Results */}
          <div>
            {loading ? (
              <>
                <div style={{ height: '2rem', width: '12rem', backgroundColor: '#111111', borderRadius: '0.5rem', marginBottom: '1.5rem' }} className="animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-16">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse"
                      style={{ backgroundColor: '#111111', borderRadius: '1rem', height: '380px' }}
                    />
                  ))}
                </div>
              </>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {error}
                </p>
                <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
                  Make sure the database is seeded and try refreshing.
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-bebas text-2xl text-white tracking-wide mb-6">
                  {hasActiveFilters ? (
                    <><span className="text-amber-500">{filteredCars.length}</span> vehicles found</>
                  ) : (
                    <>All <span className="text-amber-500">Vehicles</span></>
                  )}
                </h2>

                {hasActiveFilters && filteredCars.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 text-center"
                  >
                    <SearchX size={56} className="text-white/20 mb-4" />
                    <p className="font-outfit text-white/50 text-lg">No vehicles found matching your criteria</p>
                    <p className="font-outfit text-white/30 text-sm mt-1">Try adjusting your filters</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-16">
                    {displayed.map((car, i) => (
                      <motion.div
                        key={car.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.4 }}
                      >
                        <CarCard car={car} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
