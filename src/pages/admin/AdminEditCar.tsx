import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Trash2, RefreshCw, Search, ChevronDown } from "lucide-react";
import { db } from "../../lib/firebase";
import { searchCars, type CarAPIResult } from "../../lib/carApiService";
import AdminToast from "../../components/admin/AdminToast";
import { useToast } from "../../hooks/useToast";
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

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")";

// Reusable on/off switch control used for the Featured/On Sale toggles
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        cursor: "pointer",
      }}>
      <div
        onClick={onChange}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          cursor: "pointer",
          backgroundColor: value ? "#C4FF00" : "rgba(255,255,255,0.12)",
          position: "relative",
          transition: "background-color 0.2s",
          flexShrink: 0,
        }}>
        <div
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "white",
            transition: "left 0.2s",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "Outfit",
          fontSize: "0.875rem",
          color: "rgba(255,255,255,0.7)",
        }}>
        {label}
      </span>
    </label>
  );
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#F2F2F0",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.625rem",
    padding: "0.875rem 1rem",
    color: "#0D1B2A",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage: CHEVRON,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    paddingRight: "2.5rem",
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "Outfit",
    fontSize: "0.7rem",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    display: "block",
    marginBottom: "6px",
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
              <div>
                <label style={labelStyle}>Make</label>
                <input
                  type="text"
                  placeholder="e.g. Toyota"
                  value={searchMake}
                  onChange={(e) => setSearchMake(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                <input
                  type="text"
                  placeholder="e.g. Corolla"
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Year (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 2022"
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  min="1990"
                  max="2030"
                  style={inputStyle}
                />
              </div>
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
                background: searching ? 'rgba(29,78,216,0.3)' : 'linear-gradient(135deg, #C4FF00, #1F5680)',
                color: "#0D1B2A",
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
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Toyota Corolla 2022"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Brand *</label>
              <input
                required
                type="text"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Toyota"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Model *</label>
              <input
                required
                type="text"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Corolla"
                style={inputStyle}
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
                style={inputStyle}
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
                  ...inputStyle,
                  padding: "0.5rem",
                  height: "48px",
                  cursor: "pointer",
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
            <div>
              <label style={labelStyle}>Price (NZD) *</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#C4FF00",
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}>
                  $
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="28000"
                  style={{ ...inputStyle, paddingLeft: "2rem" }}
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
                      color: "#C4FF00",
                      fontFamily: "Outfit",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}>
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.originalPrice}
                    onChange={(e) => set("originalPrice", e.target.value)}
                    placeholder="35000"
                    style={{ ...inputStyle, paddingLeft: "2rem" }}
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
                onChange={(e) => set("km", e.target.value)}
                placeholder="65000"
                style={inputStyle}
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
                style={selectStyle}>
                <option
                  value="automatico"
                  style={{ backgroundColor: "#F2F2F0" }}>
                  Automatic
                </option>
                <option value="manual" style={{ backgroundColor: "#F2F2F0" }}>
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
                style={selectStyle}>
                <option value="gasolina" style={{ backgroundColor: "#F2F2F0" }}>
                  Petrol
                </option>
                <option value="diesel" style={{ backgroundColor: "#F2F2F0" }}>
                  Diesel
                </option>
                <option
                  value="electrico"
                  style={{ backgroundColor: "#F2F2F0" }}>
                  Electric
                </option>
                <option value="hibrido" style={{ backgroundColor: "#F2F2F0" }}>
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
                  ...inputStyle,
                  resize: "none",
                  lineHeight: 1.6,
                } as React.CSSProperties
              }
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
                  ...inputStyle,
                  resize: "none",
                  lineHeight: 1.6,
                } as React.CSSProperties
              }
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 1 *</label>
            <input
              value={form.image1}
              onChange={(e) => set("image1", e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 2</label>
            <input
              value={form.image2}
              onChange={(e) => set("image2", e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Image URL 3</label>
            <input
              value={form.image3}
              onChange={(e) => set("image3", e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={inputStyle}
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

        {/* Save / Cancel buttons */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
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
              background: "linear-gradient(135deg, #C4FF00 0%, #1F5680 100%)",
              color: "#000",
              fontWeight: 700,
              fontFamily: "Outfit",
              fontSize: "0.9rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: "100%",
            height: "44px",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "#ef4444",
            backgroundColor: "transparent",
            borderRadius: "0.75rem",
            fontFamily: "Outfit",
            fontSize: "0.875rem",
            cursor: deleting ? "default" : "pointer",
            opacity: deleting ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}>
          <Trash2 size={14} />
          {deleting ? "Deleting…" : "Delete Vehicle"}
        </button>
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
