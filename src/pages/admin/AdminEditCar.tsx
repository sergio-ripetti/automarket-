import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { updateCar, deleteCar } from "../../lib/adminCarsService";
import AdminToast from "../../components/admin/AdminToast";
import { useToast } from "../../hooks/useToast";
import { useUserRole } from "../../hooks/useUserRole";
import AdminInput from "../../components/admin/AdminInput";
import AdminSelect from "../../components/admin/AdminSelect";
import AdminTextarea from "../../components/admin/AdminTextarea";
import AdminButton from "../../components/admin/AdminButton";
import AdminCheckbox from "../../components/admin/AdminCheckbox";
import AdminLabel from "../../components/admin/AdminLabel";
import ImageUploadSection, { type UploadedImage } from "../../components/admin/ImageUploadSection";
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
  featured: boolean;
  isOnSale: boolean;
}

// Admin page for editing an existing vehicle listing via manual entry - loads the car from
// Firestore by id, allows manual edits, and supports save/delete
export default function AdminEditCar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormState | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, dismissToast } = useToast();
  const { isDemo } = useUserRole();

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
          featured: car.featured,
          isOnSale: car.isOnSale,
        });

        // Load existing images as UploadedImage[] (no re-upload needed)
        const existingImages: UploadedImage[] = (car.images || []).map((url) => ({
          url,
          filename: url.split('/').pop() || 'image',
          isUploading: false,
        }));
        setImages(existingImages);
      } catch (err) {
        console.error(err);
        showToast("Failed to load vehicle.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadCar();
  }, [id, navigate, showToast]);

  if (loading)
    return (
      <div style={{ padding: "2rem", color: "#1A1A1A", fontFamily: "Outfit" }}>
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

  // Validates and saves the edited vehicle fields via backend API
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form) return;
    setSaving(true);
    try {
      // Check if uploads are still in progress
      if (images.some((img) => img.isUploading)) {
        showToast('Please wait for all images to finish uploading.', 'error')
        setSaving(false)
        return
      }

      // Get successful images only (exclude failed uploads)
      const imageUrls = images
        .filter((img) => !img.error && img.url)
        .map((img) => img.url);

      if (imageUrls.length === 0) {
        showToast("Add at least one image.", "error");
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
        images: imageUrls,
        featured: form.featured,
      };

      const result = await updateCar(id, carInput);
      if (!result.success) {
        showToast(result.error || "Failed to update vehicle. Please try again.", "error");
        return;
      }
      showToast("Vehicle updated successfully!", "success");
      setTimeout(() => navigate("/admin/cars"), 1200);
    } catch (err) {
      console.error(err);
      showToast("Failed to update vehicle. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Deletes the current vehicle via backend API after user confirmation
  const handleDelete = async () => {
    if (isDemo) {
      showToast('Demo mode: deleting data is disabled.', 'error');
      return;
    }
    if (!id || !window.confirm("Delete this vehicle? This cannot be undone."))
      return;
    setDeleting(true);
    try {
      const result = await deleteCar(id);
      if (!result.success) {
        showToast(result.error || "Failed to delete vehicle.", "error");
        setDeleting(false);
        return;
      }
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
                  e.currentTarget.style.borderColor = "#1A1A1A"
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
          <ImageUploadSection
            images={images}
            onImagesChange={setImages}
            disabled={saving}
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

        {/* Form Footer */}
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "space-between",
          paddingTop: "2rem",
          borderTop: "1px solid #E0E0DC",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <AdminButton
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={deleting || isDemo}
            title={isDemo ? 'Demo mode: deleting data is disabled.' : undefined}
            isLoading={deleting}
            style={{
              minWidth: "140px",
              justifyContent: "center",
              gap: "0.5rem",
              order: -1,
            }}
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : "Delete Vehicle"}
          </AdminButton>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
              {saving ? "Saving…" : "Save Changes"}
            </AdminButton>
          </div>
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
