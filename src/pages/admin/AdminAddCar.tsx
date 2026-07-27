import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCar } from '../../lib/adminCarsService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import AdminInput from '../../components/admin/AdminInput'
import AdminSelect from '../../components/admin/AdminSelect'
import AdminTextarea from '../../components/admin/AdminTextarea'
import AdminButton from '../../components/admin/AdminButton'
import AdminLabel from '../../components/admin/AdminLabel'
import ImageUploadSection, { type UploadedImage } from '../../components/admin/ImageUploadSection'
import type { Car } from '../../types'

type CarInput = Omit<Car, 'id'>

interface FormState {
  title: string; brand: string; model: string; year: string; color: string
  price: string; originalPrice: string; km: string
  transmission: 'manual' | 'automatico'
  fuel: 'gasolina' | 'diesel' | 'electrico' | 'hibrido'
  description: string; ownerDescription: string
  featured: boolean; isOnSale: boolean
}

const empty: FormState = {
  title: '', brand: '', model: '', year: '', color: '#f5f5f5',
  price: '', originalPrice: '', km: '',
  transmission: 'automatico', fuel: 'gasolina',
  description: '', ownerDescription: '',
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
          backgroundColor: value ? '#1A1A1A' : 'rgba(255,255,255,0.12)',
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

// Admin page for creating a new vehicle listing via manual entry, then saves the record to Firestore
export default function AdminAddCar() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(empty)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [saving, setSaving] = useState(false)
  const { toast, showToast, dismissToast } = useToast()

  // Updates a single field in the vehicle form state
  const set = (field: keyof FormState, val: string | number | boolean) => {
    const value = typeof val === 'number' ? String(val) : val
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Validates and saves the new vehicle form via backend API
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Check if uploads are still in progress
      if (images.some((img) => img.isUploading)) {
        showToast('Please wait for all images to finish uploading.', 'error')
        setSaving(false)
        return
      }

      // Get successful images only (exclude failed uploads)
      const successfulImages = images.filter((img) => !img.error && img.url.startsWith('http'))
      if (successfulImages.length === 0) {
        showToast('Add at least one image.', 'error')
        setSaving(false)
        return
      }

      const imageUrls = successfulImages.map((img) => img.url)

      const carInput: CarInput = {
        title: form.title, brand: form.brand, model: form.model,
        year: Number(form.year), color: form.color,
        price: Number(form.price),
        ...(form.isOnSale && form.originalPrice ? { originalPrice: Number(form.originalPrice) } : {}),
        isOnSale: form.isOnSale, km: Number(form.km),
        transmission: form.transmission, fuel: form.fuel,
        description: form.description, ownerDescription: form.ownerDescription,
        images: imageUrls, featured: form.featured,
      }

      const result = await createCar(carInput)
      if (!result.success) {
        showToast(result.error || 'Failed to add vehicle. Please try again.', 'error')
        return
      }
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
          <ImageUploadSection
            images={images}
            onImagesChange={setImages}
            disabled={saving}
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

        {/* Form Footer */}
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end",
          paddingTop: "2rem",
          borderTop: "1px solid #E0E0DC",
          flexWrap: "wrap",
        }}>
          <AdminButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate("/admin/cars")}
            style={{ minWidth: "120px", justifyContent: "center" }}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="submit"
            variant="dark"
            size="md"
            disabled={saving}
            isLoading={saving}
            style={{ minWidth: "140px", justifyContent: "center" }}
          >
            {saving ? "Saving…" : "Add Vehicle"}
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
