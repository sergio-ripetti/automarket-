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

// Displays the full car catalogue with search/filter controls - fetches cars via useCars hook and filters them client-side based on FilterState (search, brand, model, year, price, fuel)
export default function Cars() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const { cars: allCars, loading, error } = useCars()

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  // Applies all active filter criteria to the full car list and returns only matching cars
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
    <main style={{ paddingTop: '72px', minHeight: '100vh', backgroundColor: '#EEF2F7' }}>
      <div className="w-full flex justify-center py-12">
        <div className="mx-auto flex flex-col gap-10" style={{ width: '80%' }}>

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-inter text-#2E86AB uppercase tracking-[0.2em] text-xs mb-2">Catalogue</p>
            <h1 className="font-bebas text-[#0D1B2A] tracking-wide leading-none">
              Our <span className="text-#2E86AB">Vehicles</span>
            </h1>
            <p className="font-inter text-[#A8B8C8] text-sm mt-2">Find your perfect match</p>
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
                <div style={{ height: '2rem', width: '12rem', backgroundColor: '#FFFFFF', borderRadius: '0.5rem', marginBottom: '1.5rem' }} className="animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-16" style={{ gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse"
                      style={{ backgroundColor: '#FFFFFF', borderRadius: '1rem', height: '380px' }}
                    />
                  ))}
                </div>
              </>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                <p style={{ fontFamily: 'Outfit', color: '#A8B8C8', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {error}
                </p>
                <p style={{ fontFamily: 'Outfit', color: '#C8D8E4', fontSize: '0.8rem' }}>
                  Make sure the database is seeded and try refreshing.
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-bebas text-[#0D1B2A] tracking-wide mb-6">
                  {hasActiveFilters ? (
                    <><span className="text-#2E86AB">{filteredCars.length}</span> vehicles found</>
                  ) : (
                    <>All <span className="text-#2E86AB">Vehicles</span></>
                  )}
                </h2>

                {hasActiveFilters && filteredCars.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 text-center"
                  >
                    <SearchX size={56} className="text-[#C8D8E4] mb-4" />
                    <p className="font-inter text-[#4A6070] text-lg">No vehicles found matching your criteria</p>
                    <p className="font-inter text-[#A8B8C8] text-sm mt-1">Try adjusting your filters</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch pb-16" style={{ gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
                    {displayed.map((car, i) => (
                      <motion.div
                        key={car.id}
                        className="h-full"
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
