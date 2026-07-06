import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, setDoc } from 'firebase/firestore'
import { Search } from 'lucide-react'
import { db } from '../../lib/firebase'
import { searchCars, type CarAPIResult } from '../../lib/carApiService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { Car } from '../../types'

type CarInput = Omit<Car, 'id'>

interface FormState {
  title: string; brand: string; model: string; year: string; color: string
  price: string; originalPrice: string; km: string
  transmission: 'manual' | 'automatico'
  fuel: 'gasolina' | 'diesel' | 'electrico' | 'hibrido'
  description: string; ownerDescription: string
  image1: string; image2: string; image3: string
  featured: boolean; isOnSale: boolean
}

const empty: FormState = {
  title: '', brand: '', model: '', year: '', color: '#f5f5f5',
  price: '', originalPrice: '', km: '',
  transmission: 'automatico', fuel: 'gasolina',
  description: '', ownerDescription: '',
  image1: '', image2: '', image3: '',
  featured: false, isOnSale: false,
}

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")"

// Reusable on/off switch control used for the Featured/On Sale toggles
function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
      <div
        onClick={onChange}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          backgroundColor: value ? '#2E86AB' : 'rgba(255,255,255,0.12)',
          position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
    </label>
  )
}

// Admin page for creating a new vehicle listing - supports manual entry or auto-fill via vehicle API search, then saves the record to Firestore
export default function AdminAddCar() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(empty)
  const [focused, setFocused] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchMake, setSearchMake] = useState('')
  const [searchModel, setSearchModel] = useState('')
  const [searchYear, setSearchYear] = useState('')
  const [searchResults, setSearchResults] = useState<CarAPIResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast, showToast, dismissToast } = useToast()

  // Updates a single field in the vehicle form state
  const set = (field: keyof FormState, val: string | number | boolean) => {
    const value = typeof val === 'number' ? String(val) : val
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#EEF2F7',
    border: `1px solid ${focused === name ? '#2E86AB' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.625rem', padding: '0.875rem 1rem',
    color: 'white', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
    outline: 'none', transition: 'border-color 0.2s',
  })

  const selectStyle = (name: string): React.CSSProperties => ({
    ...inputStyle(name),
    appearance: 'none', backgroundImage: CHEVRON,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem',
    cursor: 'pointer',
  })

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px',
  }

  const fp = (name: string) => ({ onFocus: () => setFocused(name), onBlur: () => setFocused(null) })

  // Searches the external vehicle API by make/model/year to auto-fill car specs
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchMake.trim() || !searchModel.trim()) return

    setSearching(true)
    try {
      const results = await searchCars(
        searchMake.trim(),
        searchModel.trim(),
        searchYear ? Number(searchYear) : undefined
      )
      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
      showToast('Failed to search vehicles', 'error')
    } finally {
      setSearching(false)
    }
  }

  // Applies a selected vehicle API search result to the form fields (brand, model, year, fuel, transmission, description)
  const handleSelectCar = (result: CarAPIResult) => {
    const fuelMap: Record<string, FormState['fuel']> = {
      gas: 'gasolina',
      diesel: 'diesel',
      electricity: 'electrico',
    }

    const transmissionMap: Record<string, FormState['transmission']> = {
      a: 'automatico',
      automatic: 'automatico',
      m: 'manual',
      manual: 'manual',
    }

    const fuel = fuelMap[result.fuel_type.toLowerCase()] || 'gasolina'
    const transmission = transmissionMap[result.transmission.toLowerCase()] || 'automatico'
    const title = `${result.make} ${result.model} ${result.year}`
    const description = `The ${result.year} ${result.make} ${result.model} features a ${result.displacement}L engine with ${result.cylinders} cylinders producing efficient performance. Fuel economy: ${result.city_mpg} city / ${result.highway_mpg} highway MPG. Vehicle class: ${result.class}. Transmission: ${transmission === 'automatico' ? 'Automatic' : 'Manual'}.`

    setForm((prev) => ({
      ...prev,
      brand: result.make,
      model: result.model,
      year: String(result.year),
      fuel,
      transmission,
      title,
      description,
    }))

    setSearchResults([])
    setSearchMake('')
    setSearchModel('')
    setSearchYear('')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 4000)
  }

  // Validates and saves the new vehicle form to the Firestore "cars" collection
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const images = [form.image1, form.image2, form.image3].filter((u) => u.trim() !== '')
      if (images.length === 0) { showToast('Add at least one image URL.', 'error'); setSaving(false); return }

      const carInput: CarInput = {
        title: form.title, brand: form.brand, model: form.model,
        year: Number(form.year), color: form.color,
        price: Number(form.price),
        ...(form.isOnSale && form.originalPrice ? { originalPrice: Number(form.originalPrice) } : {}),
        isOnSale: form.isOnSale, km: Number(form.km),
        transmission: form.transmission, fuel: form.fuel,
        description: form.description, ownerDescription: form.ownerDescription,
        images, featured: form.featured,
      }

      const newRef = doc(collection(db, 'cars'))
      await setDoc(newRef, { ...carInput, id: newRef.id })
      showToast('Vehicle added successfully!', 'success')
      setTimeout(() => navigate('/admin/cars'), 1200)
    } catch (err) {
      console.error(err)
      showToast('Failed to add vehicle. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1
        className="font-bebas"
        style={{
          fontSize: "2rem",
          color: "white",
          lineHeight: 1,
          marginBottom: "2rem",
        }}>
        Add New Vehicle
      </h1>

      {/* Success Message */}
      {showSuccess && (
        <div style={{
          backgroundColor: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          color: '#86efac',
          padding: '0.75rem 1rem',
          borderRadius: '0.625rem',
          fontFamily: 'Outfit',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}>
          ✓ Vehicle data loaded from API — please complete the remaining fields (price, mileage, images)
        </div>
      )}

      {/* Search Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="font-bebas" style={{ fontSize: '1.1rem', color: '#2E86AB', marginBottom: '0.5rem' }}>
          Search Vehicle Database
        </h2>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          Search to auto-fill vehicle specifications
        </p>

        <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Make</label>
              <input
                type="text"
                placeholder="e.g. Toyota"
                value={searchMake}
                onChange={(e) => setSearchMake(e.target.value)}
                style={inputStyle('searchMake')}
                {...fp('searchMake')}
              />
            </div>
            <div>
              <label style={labelStyle}>Model</label>
              <input
                type="text"
                placeholder="e.g. Corolla"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                style={inputStyle('searchModel')}
                {...fp('searchModel')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Year (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 2022"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                min="1990"
                max="2030"
                style={inputStyle('searchYear')}
                {...fp('searchYear')}
              />
            </div>
            <div />
          </div>

          <button
            type="submit"
            disabled={searching}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              height: '44px',
              padding: '0 1.5rem',
              background: searching ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #2E86AB, #256E8C)',
              color: 'white',
              fontFamily: 'Outfit',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '0.625rem',
              cursor: searching ? 'not-allowed' : 'pointer',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Search size={16} />
            {searching ? 'Searching...' : 'Search API'}
          </button>
        </form>

        {/* Results Dropdown */}
        {searchResults.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(29,78,216,0.2)',
            borderRadius: '0.75rem',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.5rem',
          }}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectCar(result)}
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E4EAF0' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <div className="font-bebas" style={{ fontSize: '1rem', color: 'white', marginBottom: '0.25rem' }}>
                  {result.make} {result.model} {result.year}
                </div>
                <div style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {result.fuel_type} • {result.transmission} • {result.class}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        margin: '1.5rem 0',
        textAlign: 'center',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '-8px',
          transform: 'translateX(-50%)',
          backgroundColor: '#EEF2F7',
          padding: '0 0.75rem',
          fontFamily: 'Outfit',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          OR FILL MANUALLY
        </span>
      </div>

      <form onSubmit={handleSave}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}>
          {/* Left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Toyota Corolla 2022"
                style={inputStyle("title")}
                {...fp("title")}
              />
            </div>
            <div>
              <label style={labelStyle}>Brand *</label>
              <input
                required
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Toyota"
                style={inputStyle("brand")}
                {...fp("brand")}
              />
            </div>
            <div>
              <label style={labelStyle}>Model *</label>
              <input
                required
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Corolla"
                style={inputStyle("model")}
                {...fp("model")}
              />
            </div>
            <div>
              <label style={labelStyle}>Year *</label>
              <input
                required
                type="number"
                min="1990"
                max="2030"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2022"
                style={inputStyle("year")}
                {...fp("year")}
              />
            </div>
            <div>
              <label style={labelStyle}>Colour *</label>
              <input
                type="color"
                required
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  ...inputStyle("color"),
                  padding: "0.5rem",
                  height: "48px",
                  cursor: "pointer",
                }}
                {...fp("color")}
              />
            </div>
          </div>

          {/* Right column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}>
            <div>
              <label style={labelStyle}>Price (NZD) *</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#2E86AB",
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}>
                  $
                </span>
                <input
                  required
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="28000"
                  style={{ ...inputStyle("price"), paddingLeft: "2rem" }}
                  {...fp("price")}
                />
              </div>
            </div>
            {form.isOnSale && (
              <div>
                <label style={labelStyle}>Original Price (NZD)</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#2E86AB",
                      fontFamily: "Outfit",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}>
                    $
                  </span>
                  <input
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) => set("originalPrice", e.target.value)}
                    placeholder="35000"
                    style={{ ...inputStyle("origPrice"), paddingLeft: "2rem" }}
                    {...fp("origPrice")}
                  />
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Mileage (KM) *</label>
              <input
                required
                type="number"
                min="0"
                max="999999"
                value={form.km}
                onChange={(e) => set("km", Number(e.target.value))}
                placeholder="65000"
                style={inputStyle("km")}
              />
            </div>
            <div>
              <label style={labelStyle}>Transmission *</label>
              <select
                value={form.transmission}
                onChange={(e) =>
                  set(
                    "transmission",
                    e.target.value as FormState["transmission"],
                  )
                }
                style={selectStyle("trans")}
                {...fp("trans")}>
                <option
                  value="automatico"
                  style={{ backgroundColor: "#EEF2F7" }}>
                  Automatic
                </option>
                <option value="manual" style={{ backgroundColor: "#EEF2F7" }}>
                  Manual
                </option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fuel *</label>
              <select
                value={form.fuel}
                onChange={(e) =>
                  set("fuel", e.target.value as FormState["fuel"])
                }
                style={selectStyle("fuel")}
                {...fp("fuel")}>
                <option value="gasolina" style={{ backgroundColor: "#EEF2F7" }}>
                  Petrol
                </option>
                <option value="diesel" style={{ backgroundColor: "#EEF2F7" }}>
                  Diesel
                </option>
                <option
                  value="electrico"
                  style={{ backgroundColor: "#EEF2F7" }}>
                  Electric
                </option>
                <option value="hibrido" style={{ backgroundColor: "#EEF2F7" }}>
                  Hybrid
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Full width fields */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            marginBottom: "1.5rem",
          }}>
          <div>
            <label style={labelStyle}>Vehicle Description *</label>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the vehicle..."
              style={
                {
                  ...inputStyle("desc"),
                  resize: "none",
                  lineHeight: 1.6,
                } as React.CSSProperties
              }
              {...fp("desc")}
            />
          </div>
          <div>
            <label style={labelStyle}>Seller's Note</label>
            <textarea
              rows={4}
              value={form.ownerDescription}
              onChange={(e) => set("ownerDescription", e.target.value)}
              placeholder="Owner's personal note..."
              style={
                {
                  ...inputStyle("note"),
                  resize: "none",
                  lineHeight: 1.6,
                } as React.CSSProperties
              }
              {...fp("note")}
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 1 *</label>
            <input
              value={form.image1}
              onChange={(e) => set("image1", e.target.value)}
              placeholder="https://..."
              style={inputStyle("img1")}
              {...fp("img1")}
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 2</label>
            <input
              value={form.image2}
              onChange={(e) => set("image2", e.target.value)}
              placeholder="https://..."
              style={inputStyle("img2")}
              {...fp("img2")}
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 3</label>
            <input
              value={form.image3}
              onChange={(e) => set("image3", e.target.value)}
              placeholder="https://..."
              style={inputStyle("img3")}
              {...fp("img3")}
            />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem" }}>
          <Toggle
            value={form.featured}
            onChange={() => set("featured", !form.featured)}
            label="Featured Vehicle"
          />
          <Toggle
            value={form.isOnSale}
            onChange={() => set("isOnSale", !form.isOnSale)}
            label="On Sale"
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => navigate("/admin/cars")}
            style={{
              flex: 1,
              height: "48px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
              backgroundColor: "transparent",
              borderRadius: "0.75rem",
              fontFamily: "Outfit",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 2,
              height: "48px",
              background: "linear-gradient(135deg, #2E86AB 0%, #256E8C 100%)",
              color: "#000",
              fontWeight: 700,
              fontFamily: "Outfit",
              fontSize: "0.9rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Saving…" : "Save Vehicle"}
          </button>
        </div>
      </form>

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
