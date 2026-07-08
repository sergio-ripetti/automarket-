import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, setDoc } from 'firebase/firestore'
import { Search } from 'lucide-react'
import { db } from '../../lib/firebase'
import { searchCars, type CarAPIResult } from '../../lib/carApiService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import AdminInput from '../../components/admin/AdminInput'
import AdminSelect from '../../components/admin/AdminSelect'
import AdminTextarea from '../../components/admin/AdminTextarea'
import AdminButton from '../../components/admin/AdminButton'
import AdminLabel from '../../components/admin/AdminLabel'
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

// Reusable on/off switch control used for the Featured/On Sale toggles
function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
      <div
        onClick={onChange}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          backgroundColor: value ? '#C4FF00' : 'rgba(255,255,255,0.12)',
          position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#767676' }}>{label}</span>
    </label>
  )
}

// Admin page for creating a new vehicle listing - supports manual entry or auto-fill via vehicle API search, then saves the record to Firestore
export default function AdminAddCar() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(empty)
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
          color: "#0D1B2A",
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
        <h2 className="font-bebas" style={{ fontSize: '1.1rem', color: '#C4FF00', marginBottom: '0.5rem' }}>
          Search Vehicle Database
        </h2>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676', marginBottom: '1rem' }}>
          Search to auto-fill vehicle specifications
        </p>

        <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <AdminInput
              label="Make"
              type="text"
              placeholder="e.g. Toyota"
              value={searchMake}
              onChange={(e) => setSearchMake(e.target.value)}
            />
            <AdminInput
              label="Model"
              type="text"
              placeholder="e.g. Corolla"
              value={searchModel}
              onChange={(e) => setSearchModel(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <AdminInput
              label="Year (Optional)"
              type="number"
              placeholder="e.g. 2022"
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              min="1990"
              max="2030"
            />
            <div />
          </div>

          <AdminButton
            type="submit"
            disabled={searching}
            variant="secondary"
            size="md"
            isLoading={searching}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Search size={16} />
            {searching ? 'Searching...' : 'Search API'}
          </AdminButton>
        </form>

        {/* Results Dropdown */}
        {searchResults.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0DC',
            borderRadius: '0.75rem',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectCar(result)}
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid #F0F0EE' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9F9F8' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <div className="font-bebas" style={{color: "#0D1B2A", marginBottom: '0.25rem' }}>
                  {result.make} {result.model} {result.year}
                </div>
                <div style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>
                  {result.fuel_type} • {result.transmission} • {result.class}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '1px solid #E0E0DC',
        margin: '1.5rem 0',
        textAlign: 'center',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '-8px',
          transform: 'translateX(-50%)',
          backgroundColor: '#FFFFFF',
          padding: '0 0.75rem',
          fontFamily: 'Outfit',
          fontSize: '0.7rem',
          color: '#767676',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 500,
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
            <AdminInput
              label="Title"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Toyota Corolla 2022"
            />
            <AdminInput
              label="Brand"
              required
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Toyota"
            />
            <AdminInput
              label="Model"
              required
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="Corolla"
            />
            <AdminInput
              label="Year"
              required
              type="number"
              min="1990"
              max="2030"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              placeholder="2022"
            />
            <div>
              <AdminLabel required>Colour</AdminLabel>
              <input
                type="color"
                required
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.5rem",
                  height: "48px",
                  cursor: "pointer",
                  border: "1px solid #E0E0DC",
                  borderRadius: "0.625rem",
                }}
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
            <AdminInput
              label="Price (NZD)"
              required
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="28000"
            />
            {form.isOnSale && (
              <AdminInput
                label="Original Price (NZD)"
                type="number"
                value={form.originalPrice}
                onChange={(e) => set("originalPrice", e.target.value)}
                placeholder="35000"
              />
            )}
            <AdminInput
              label="Mileage (KM)"
              required
              type="number"
              min="0"
              max="999999"
              value={form.km}
              onChange={(e) => set("km", Number(e.target.value))}
              placeholder="65000"
            />
            <AdminSelect
              label="Transmission"
              value={form.transmission}
              onChange={(e) =>
                set(
                  "transmission",
                  e.target.value as FormState["transmission"],
                )
              }
              options={[
                { value: "automatico", label: "Automatic" },
                { value: "manual", label: "Manual" },
              ]}
            />
            <AdminSelect
              label="Fuel"
              value={form.fuel}
              onChange={(e) =>
                set("fuel", e.target.value as FormState["fuel"])
              }
              options={[
                { value: "gasolina", label: "Petrol" },
                { value: "diesel", label: "Diesel" },
                { value: "electrico", label: "Electric" },
                { value: "hibrido", label: "Hybrid" },
              ]}
            />
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
          <AdminTextarea
            label="Vehicle Description"
            required
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the vehicle..."
          />
          <AdminTextarea
            label="Seller's Note"
            rows={4}
            value={form.ownerDescription}
            onChange={(e) => set("ownerDescription", e.target.value)}
            placeholder="Owner's personal note..."
          />
          <AdminInput
            label="Image URL 1"
            required
            type="text"
            value={form.image1}
            onChange={(e) => set("image1", e.target.value)}
            placeholder="https://..."
          />
          <AdminInput
            label="Image URL 2"
            type="text"
            value={form.image2}
            onChange={(e) => set("image2", e.target.value)}
            placeholder="https://..."
          />
          <AdminInput
            label="Image URL 3"
            type="text"
            value={form.image3}
            onChange={(e) => set("image3", e.target.value)}
            placeholder="https://..."
          />
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
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <AdminButton
            type="submit"
            variant="dark"
            size="md"
            disabled={saving}
            isLoading={saving}
            style={{ flex: "1 1 auto", minWidth: "140px" }}
          >
            {saving ? "Saving…" : "Save Vehicle"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate("/admin/cars")}
            style={{ flex: "1 1 auto", minWidth: "120px" }}
          >
            Cancel
          </AdminButton>
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
