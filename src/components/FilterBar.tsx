import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { FormInput, FormSelect, FormLabel } from './shared'
import type { FilterState, Car } from '../types'

interface FilterBarProps {
  cars: Car[]
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onClear: () => void
}


// Renders search/filter controls (brand, model, year range, fuel) for the car listing and reports changes to the parent via onFilterChange
export default function FilterBar({ cars, filters, onFilterChange, onClear }: FilterBarProps) {
  const [clearHovered, setClearHovered] = useState(false)

  // Derives the unique, sorted list of brands from the current car dataset
  const brands = useMemo(() => {
    return Array.from(new Set(cars.map((car) => car.brand))).sort()
  }, [cars])

  // Derives the unique, sorted list of models available for the currently selected brand
  const models = useMemo(() => {
    if (!filters.brand) return []
    return Array.from(new Set(
      cars
        .filter((car) => car.brand === filters.brand)
        .map((car) => car.model)
    )).sort()
  }, [cars, filters.brand])

  // Updates a single filter field and propagates the new filter state to the parent; resets model when brand changes
  const handleChange = (field: keyof FilterState, value: string) => {
    if (field === 'brand') {
      onFilterChange({ ...filters, brand: value, model: '' })
    } else {
      onFilterChange({ ...filters, [field]: value })
    }
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Search — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <FormLabel>Search</FormLabel>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute', left: '0', top: '50%',
                transform: 'translateY(-50%)',
                color: '#767676', pointerEvents: 'none',
              }}
            />
            <FormInput
              type="text"
              placeholder="Search by brand, model or title..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              style={{ paddingLeft: '1.75rem' }}
            />
          </div>
        </div>

        {/* Brand */}
        <div>
          <FormLabel>Brand</FormLabel>
          <FormSelect
            value={filters.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </FormSelect>
        </div>

        {/* Model */}
        <div>
          <FormLabel>Model</FormLabel>
          <FormSelect
            value={filters.model ?? ''}
            onChange={(e) => handleChange('model', e.target.value)}
            disabled={!filters.brand}
          >
            <option value="">
              {filters.brand ? 'All models' : 'Select brand first'}
            </option>
            {models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </FormSelect>
        </div>

        {/* Year from */}
        <div>
          <FormLabel>Year From</FormLabel>
          <FormInput
            type="number"
            placeholder="2000"
            value={filters.yearMin}
            onChange={(e) => handleChange('yearMin', e.target.value)}
            min="2000"
            max="2030"
          />
        </div>

        {/* Year to */}
        <div>
          <FormLabel>Year To</FormLabel>
          <FormInput
            type="number"
            placeholder="2025"
            value={filters.yearMax}
            onChange={(e) => handleChange('yearMax', e.target.value)}
            min="2000"
            max="2030"
          />
        </div>

        {/* Fuel */}
        <div>
          <FormLabel>Fuel Type</FormLabel>
          <FormSelect
            value={filters.fuel}
            onChange={(e) => handleChange('fuel', e.target.value)}
          >
            <option value="">All types</option>
            <option value="gasolina">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electrico">Electric</option>
            <option value="hibrido">Hybrid</option>
          </FormSelect>
        </div>
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClear}
            onMouseEnter={() => setClearHovered(true)}
            onMouseLeave={() => setClearHovered(false)}
            style={{
              border: '1px solid rgba(29,78,216,0.3)',
              color: '#C4FF00',
              backgroundColor: clearHovered ? 'rgba(29,78,216,0.1)' : 'transparent',
              borderRadius: '0.625rem',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              fontFamily: 'Outfit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <X size={14} />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}
