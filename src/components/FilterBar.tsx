import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { FilterState, Car } from '../types'

interface FilterBarProps {
  cars: Car[]
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onClear: () => void
}

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")"

const labelStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '0.7rem',
  color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
}

export default function FilterBar({ cars, filters, onFilterChange, onClear }: FilterBarProps) {
  const [focused, setFocused] = useState<string | null>(null)
  const [clearHovered, setClearHovered] = useState(false)

  const brands = useMemo(() => {
    return Array.from(new Set(cars.map((car) => car.brand))).sort()
  }, [cars])

  const models = useMemo(() => {
    if (!filters.brand) return []
    return Array.from(new Set(
      cars
        .filter((car) => car.brand === filters.brand)
        .map((car) => car.model)
    )).sort()
  }, [cars, filters.brand])

  const handleChange = (field: keyof FilterState, value: string) => {
    if (field === 'brand') {
      onFilterChange({ ...filters, brand: value, model: '' })
    } else {
      onFilterChange({ ...filters, [field]: value })
    }
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  const inputBase = (name: string): React.CSSProperties => ({
    backgroundColor: '#0f0f0f',
    border: `1px solid ${focused === name ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.625rem',
    padding: '0.75rem 1rem',
    color: 'white',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  })

  const selectBase = (name: string, disabled = false): React.CSSProperties => ({
    ...inputBase(name),
    appearance: 'none',
    backgroundImage: CHEVRON,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  })

  return (
    <div
      style={{
        backgroundColor: '#111111',
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
          <label style={labelStyle}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute', left: '0.875rem', top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by brand, model or title..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              onFocus={() => setFocused('search')}
              onBlur={() => setFocused(null)}
              style={{ ...inputBase('search'), paddingLeft: '2.75rem' }}
            />
          </div>
        </div>

        {/* Brand */}
        <div>
          <label style={labelStyle}>Brand</label>
          <select
            value={filters.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            onFocus={() => setFocused('brand')}
            onBlur={() => setFocused(null)}
            style={selectBase('brand')}
          >
            <option value="" style={{ backgroundColor: '#111' }}>
              All brands
            </option>
            {brands.map((brand) => (
              <option key={brand} value={brand} style={{ backgroundColor: '#111' }}>{brand}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label style={labelStyle}>Model</label>
          <select
            value={filters.model ?? ''}
            onChange={(e) => handleChange('model', e.target.value)}
            disabled={!filters.brand}
            onFocus={() => setFocused('model')}
            onBlur={() => setFocused(null)}
            style={selectBase('model', !filters.brand)}
          >
            <option value="" style={{ backgroundColor: '#111' }}>
              {filters.brand ? 'All models' : 'Select brand first'}
            </option>
            {models.map((model) => (
              <option key={model} value={model} style={{ backgroundColor: '#111' }}>{model}</option>
            ))}
          </select>
        </div>

        {/* Year from */}
        <div>
          <label style={labelStyle}>Year From</label>
          <input
            type="number"
            placeholder="2000"
            value={filters.yearMin}
            onChange={(e) => handleChange('yearMin', e.target.value)}
            onFocus={() => setFocused('yearMin')}
            onBlur={() => setFocused(null)}
            style={inputBase('yearMin')}
            min="2000" max="2030"
          />
        </div>

        {/* Year to */}
        <div>
          <label style={labelStyle}>Year To</label>
          <input
            type="number"
            placeholder="2025"
            value={filters.yearMax}
            onChange={(e) => handleChange('yearMax', e.target.value)}
            onFocus={() => setFocused('yearMax')}
            onBlur={() => setFocused(null)}
            style={inputBase('yearMax')}
            min="2000" max="2030"
          />
        </div>

        {/* Fuel */}
        <div>
          <label style={labelStyle}>Fuel Type</label>
          <select
            value={filters.fuel}
            onChange={(e) => handleChange('fuel', e.target.value)}
            onFocus={() => setFocused('fuel')}
            onBlur={() => setFocused(null)}
            style={selectBase('fuel')}
          >
            <option value="" style={{ backgroundColor: '#111' }}>All types</option>
            <option value="gasolina" style={{ backgroundColor: '#111' }}>Petrol</option>
            <option value="diesel" style={{ backgroundColor: '#111' }}>Diesel</option>
            <option value="electrico" style={{ backgroundColor: '#111' }}>Electric</option>
            <option value="hibrido" style={{ backgroundColor: '#111' }}>Hybrid</option>
          </select>
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
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b',
              backgroundColor: clearHovered ? 'rgba(245,158,11,0.1)' : 'transparent',
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
