import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Trash2, RefreshCw, Search, ChevronDown } from "lucide-react";
import { db } from "../../lib/firebase";
import { searchCars, type CarAPIResult } from "../../lib/carApiService";
import AdminToast from "../../components/admin/AdminToast";
import { useToast } from "../../hooks/useToast";
import AdminInput from "../../components/admin/AdminInput";
import AdminSelect from "../../components/admin/AdminSelect";
import AdminTextarea from "../../components/admin/AdminTextarea";
import AdminButton from "../../components/admin/AdminButton";
import AdminCheckbox from "../../components/admin/AdminCheckbox";
import AdminLabel from "../../components/admin/AdminLabel";
import type { Car } from "../../types";

type CarInput = Omit<Car, "id">;

interface FormState {
  title: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  price: string;
  originalPrice: string;
  km: string;
  transmission: "manual" | "automatico";
  fuel: "gasolina" | "diesel" | "electrico" | "hibrido";
  description: string;
  ownerDescription: string;
  image1: string;
  image2: string;
  image3: string;
  featured: boolean;
  isOnSale: boolean;
}



// Admin page for editing an existing vehicle listing - loads the car from Firestore by id, allows manual edits or API-based spec refresh, and supports save/delete
export default function AdminEditCar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchMake, setSearchMake] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchResults, setSearchResults] = useState<CarAPIResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  // Loads the vehicle to edit from Firestore by id and populates the form
  useEffect(() => {
    const loadCar = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "cars", id));
        if (!snap.exists()) {
          showToast("Vehicle not found.", "error");
          navigate("/admin/cars");
          return;
        }
        const car = snap.data() as Car;
        setForm({
          title: car.title,
          brand: car.brand,
          model: car.model,
          year: car.year.toString(),
          color: car.color,
          price: car.price.toString(),
          originalPrice: car.originalPrice?.toString() || "",
          km: car.km.toString(),
          transmission: car.transmission,
          fuel: car.fuel,
          description: car.description,
          ownerDescription: car.ownerDescription,
          image1: car.images[0] || "",
          image2: car.images[1] || "",
          image3: car.images[2] || "",
          featured: car.featured,
          isOnSale: car.isOnSale,
        });
      } catch (err) {
        console.error(err);
        showToast("Failed to load vehicle.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadCar();
  }, [id]);

  if (loading)
    return (
      <div style={{ padding: "2rem", color: "#C4FF00", fontFamily: "Outfit" }}>
        Loading vehicle…
      </div>
    );
  if (!form) return null;

// Updates a single field in the vehicle edit form state
const set = (field: keyof FormState, val: string | boolean) => {
  setForm((prev) => {
    if (!prev) return null;
    return { ...prev, [field]: val };
  });
};


  // Searches the external vehicle API by make/model/year to refresh technical specs
  const handleSearchUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMake.trim() || !searchModel.trim()) return;

    setSearching(true);
    try {
      const results = await searchCars(
        searchMake.trim(),
        searchModel.trim(),
        searchYear ? Number(searchYear) : undefined
      );
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      showToast('Failed to search vehicles', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Applies a selected vehicle API search result to update brand/model/year/fuel/transmission on the existing form
  const handleSelectCarForUpdate = (result: CarAPIResult) => {
    if (!form) return;

    const fuelMap: Record<string, FormState['fuel']> = {
      gas: 'gasolina',
      diesel: 'diesel',
      electricity: 'electrico',
    };

    const transmissionMap: Record<string, FormState['transmission']> = {
      a: 'automatico',
      automatic: 'automatico',
      m: 'manual',
      manual: 'manual',
    };

    const fuel = fuelMap[result.fuel_type.toLowerCase()] || 'gasolina';
    const transmission = transmissionMap[result.transmission.toLowerCase()] || 'automatico';

    setForm({
      ...form,
      brand: result.make,
      model: result.model,
      year: String(result.year),
      fuel,
      transmission,
    });

    setSearchResults([]);
    setSearchMake('');
    setSearchModel('');
    setSearchYear('');
    setSearchExpanded(false);
    showToast('✓ Technical details updated from API', 'success');
  };

  // Validates and saves the edited vehicle fields to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form) return;
    setSaving(true);
    try {
      const images = [form.image1, form.image2, form.image3].filter(
        (u) => u.trim() !== "",
      );
      if (images.length === 0) {
        showToast("Add at least one image URL.", "error");
        setSaving(false);
        return;
      }

      const carInput: CarInput = {
        title: form.title,
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        color: form.color,
        price: Number(form.price),
        ...(form.isOnSale && form.originalPrice
          ? { originalPrice: Number(form.originalPrice) }
          : {}),
        isOnSale: form.isOnSale,
        km: Number(form.km),
        transmission: form.transmission,
        fuel: form.fuel,
        description: form.description,
        ownerDescription: form.ownerDescription,
        images,
        featured: form.featured,
      };

      await updateDoc(doc(db, "cars", id), carInput);
      showToast("Vehicle updated successfully!", "success");
      setTimeout(() => navigate("/admin/cars"), 1200);
    } catch (err) {
      console.error(err);
      showToast("Failed to update vehicle. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Deletes the current vehicle from Firestore after user confirmation
  const handleDelete = async () => {
    if (!id || !window.confirm("Delete this vehicle? This cannot be undone."))
      return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "cars", id));
      showToast("Vehicle deleted successfully!", "success");
      setTimeout(() => navigate("/admin/cars"), 1200);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete vehicle.", "error");
      setDeleting(false);
    }
  };

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
        Edit Vehicle
      </h1>

      {/* Update from API Button */}
      <button
        type="button"
        onClick={() => setSearchExpanded(!searchExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(29,78,216,0.1)',
          border: '1px solid rgba(29,78,216,0.2)',
          borderRadius: '0.625rem',
          color: '#C4FF00',
          fontFamily: 'Outfit',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.2)'
          e.currentTarget.style.borderColor = 'rgba(29,78,216,0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.1)'
          e.currentTarget.style.borderColor = 'rgba(29,78,216,0.2)'
        }}
      >
        <RefreshCw size={16} />
        Update Technical Details from API
        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: searchExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {/* Search Panel */}
      {searchExpanded && (
        <div style={{
          backgroundColor: 'rgba(29,78,216,0.05)',
          border: '1px solid rgba(29,78,216,0.15)',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <form onSubmit={handleSearchUpdate} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
              <AdminInput
                label="Year (Optional)"
                type="number"
                placeholder="e.g. 2022"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                min="1990"
                max="2030"
              />
            </div>

            <AdminButton
              type="submit"
              disabled={searching}
              variant="secondary"
              size="md"
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
              border: '1px solid rgba(29,78,216,0.2)',
              borderRadius: '0.75rem',
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '1rem',
            }}>
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectCarForUpdate(result)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E4EAF0' }}
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
      )}

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
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Toyota Corolla 2022"
            />
            <AdminInput
              label="Brand"
              required
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="Toyota"
            />
            <AdminInput
              label="Model"
              required
              type="text"
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
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#C4FF00"
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(196,255,0,0.1)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E0E0DC"
                  e.currentTarget.style.boxShadow = "none"
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
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="28000"
            />

            {form.isOnSale && (
              <AdminInput
                label="Original Price (NZD)"
                type="number"
                min="0"
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
              onChange={(e) => set("km", e.target.value)}
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
            placeholder="https://images.unsplash.com/..."
          />
          <AdminInput
            label="Image URL 2"
            type="text"
            value={form.image2}
            onChange={(e) => set("image2", e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
          <AdminInput
            label="Image URL 3"
            type="text"
            value={form.image3}
            onChange={(e) => set("image3", e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <AdminCheckbox
            checked={form.featured}
            onChange={() => set("featured", !form.featured)}
            label="Featured Vehicle"
          />
          <AdminCheckbox
            checked={form.isOnSale}
            onChange={() => set("isOnSale", !form.isOnSale)}
            label="On Sale"
          />
        </div>

        {/* Action buttons: Save Changes, Cancel, Delete Vehicle */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "flex-start" }}>
          <style>{`
            @media (max-width: 768px) {
              .button-save-changes { flex: 1 1 100% !important; }
              .button-cancel { flex: 1 1 100% !important; }
              .button-delete { flex: 1 1 100% !important; }
            }
            @media (min-width: 769px) {
              .button-save-changes { flex: 1 1 calc(33.333% - 0.67rem) !important; }
              .button-cancel { flex: 1 1 calc(33.333% - 0.67rem) !important; }
              .button-delete { flex: 1 1 calc(33.333% - 0.67rem) !important; }
            }
          `}</style>
          <AdminButton
            type="submit"
            variant="dark"
            size="md"
            disabled={saving}
            isLoading={saving}
            className="button-save-changes"
            style={{ minWidth: "120px" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate("/admin/cars")}
            className="button-cancel"
            style={{ minWidth: "100px" }}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={deleting}
            isLoading={deleting}
            className="button-delete"
            style={{ minWidth: "120px", justifyContent: "center", gap: "0.5rem" }}
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : "Delete Vehicle"}
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
