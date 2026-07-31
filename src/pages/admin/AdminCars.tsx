import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2, Calendar, Gauge, Tag, Star, Ban } from "lucide-react";
import { useCars } from '../../hooks/useCars'
import { useUserRole } from '../../hooks/useUserRole'
import { updateCar, deleteCar } from "../../lib/adminCarsService";
import { getSales, getSoldCarIds } from "../../lib/salesService";
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import { formatNZD, formatKilometers } from "../../lib/formatting";
import VehicleStatusBadge from '../../components/ui/VehicleStatusBadge'
import type { Car } from '../../types'

type StatusFilter = 'all' | 'available' | 'sold'

const fuelLabel: Record<string, string> = {
  gasolina: 'Petrol', diesel: 'Diesel', electrico: 'Electric', hibrido: 'Hybrid',
}

const transmissionLabel: Record<string, string> = {
  manual: 'Manual', automatico: 'Automatic',
}

// Admin vehicle inventory page - lists cars from Firestore (via useCars hook) with filters, and lets the admin toggle featured status, edit, or delete vehicles
export default function AdminCars() {
  const navigate = useNavigate();
  const { cars: firestoreCars, loading } = useCars();
  const [localCars, setLocalCars] = useState<Car[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Sold status is derived from Sales, not stored on the Car document - Sales remains the
  // single source of truth. A failed fetch leaves this empty (every car treated as available)
  // rather than ever assuming cars are sold on error.
  const [soldCarIds, setSoldCarIds] = useState<Set<string>>(new Set());
  const [salesError, setSalesError] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const { isDemo } = useUserRole();

  if (!initialized && !loading && firestoreCars.length > 0) {
    setLocalCars(firestoreCars);
    setInitialized(true);
  }

  // One shared Sales fetch for the whole page - never a per-card query.
  useEffect(() => {
    let cancelled = false;
    getSales()
      .then((sales) => {
        if (cancelled) return;
        setSoldCarIds(getSoldCarIds(sales));
        setSalesError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSalesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayed = useMemo(
    () =>
      localCars
        .filter((c) => !featuredOnly || c.featured)
        .filter((c) => !saleOnly || c.isOnSale)
        .filter((c) => {
          if (statusFilter === 'available') return !soldCarIds.has(c.id);
          if (statusFilter === 'sold') return soldCarIds.has(c.id);
          return true;
        }),
    [localCars, featuredOnly, saleOnly, statusFilter, soldCarIds],
  );

  // Toggles a vehicle's "featured" flag via backend API and updates local state
  const toggleFeatured = async (car: Car) => {
    try {
      const result = await updateCar(car.id, { featured: !car.featured });
      if (!result.success) {
        showToast(result.error || "Failed to update featured status.", "error");
        return;
      }
      setLocalCars((prev) =>
        prev.map((c) =>
          c.id === car.id ? { ...c, featured: !c.featured } : c,
        ),
      );
    } catch {
      showToast("Failed to update featured status.", "error");
    }
  };

  // Deletes a vehicle via backend API after user confirmation
  const handleDelete = async (car: Car) => {
    if (isDemo) {
      showToast("Demo mode: deleting data is disabled.", "error");
      return;
    }
    if (!window.confirm(`Delete "${car.title}"? This cannot be undone.`))
      return;
    try {
      const result = await deleteCar(car.id);
      if (!result.success) {
        showToast(result.error || "Failed to delete vehicle.", "error");
        return;
      }
      setLocalCars((prev) => prev.filter((c) => c.id !== car.id));
      showToast("Vehicle deleted successfully.", "success");
    } catch {
      showToast("Failed to delete vehicle.", "error");
    }
  };

  return (
    <div
      id="admin-inventory-main-container"
      className="admin-inventory-main-container">
      <style>{`
        .cars-page-title {
          font-size: clamp(1.25rem, 5vw, 2rem);
          font-weight: 600;
        }
      `}</style>
      {/* Header */}
      <div
        id="admin-inventory-header"
        className="admin-inventory-header flex justify-between items-center flex-wrap gap-4"
        style={{ marginBottom: "clamp(1.5rem, 4vw, 2rem)" }}>
        <h1 className="font-bebas text-[#0D1B2A] cars-page-title">
          Vehicle Inventory
        </h1>
        <button
          id="admin-inventory-add-button"
          className="admin-inventory-add-button"
          onClick={() => navigate("/admin/cars/add")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "clamp(0.5rem, 1.5vw, 0.75rem)",
            padding: "clamp(0.75rem, 2vw, 1rem) clamp(1.25rem, 3vw, 1.75rem)",
            border: "1px solid #1A1A1A",
            background: "#1A1A1A",
            color: "#FFFFFF",
            fontSize: "clamp(0.875rem, 2vw, 1rem)",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            borderRadius: "0.375rem",
            cursor: "pointer",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2A2A2A";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(0,0,0,0.3)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1A1A1A";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
          <PlusCircle size={16} />
          Add New Vehicle
        </button>
      </div>

      {/* Filters */}
      <div
        id="admin-inventory-filters"
        className="admin-inventory-filters flex gap-6 flex-wrap items-center"
        style={{ marginBottom: "clamp(1.25rem, 3vw, 1.5rem)" }}>
        <label
          htmlFor="admin-inventory-status-filter"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.875rem",
            color: "#4A4A4A",
          }}>
          Status:
          <select
            id="admin-inventory-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              padding: "0.5rem 0.875rem",
              border: "1px solid #E0E0DC",
              borderRadius: "0.375rem",
              background: "#FFFFFF",
              color: "#1A1A1A",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}>
            <option value="all">All Vehicles</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </label>
        {salesError && (
          <span
            role="alert"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#EF4444" }}>
            Could not verify sold status - showing all vehicles as available.
          </span>
        )}
        {[
          {
            checked: featuredOnly,
            onChange: () => setFeaturedOnly(!featuredOnly),
            label: "Featured Only",
          },
          {
            checked: saleOnly,
            onChange: () => setSaleOnly(!saleOnly),
            label: "On Sale Only",
          },
        ].map(({ checked, onChange, label }) => (
          <label
            key={label}
            onClick={onChange}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              cursor: "pointer",
              padding: "0.5rem 0.875rem",
              border: `1px solid ${checked ? "#1A1A1A" : "#E0E0DC"}`,
              background: checked ? "rgba(196,255,0,0.1)" : "#FFFFFF",
              borderRadius: "0.375rem",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!checked) {
                e.currentTarget.style.borderColor = "#D0D0CC";
                e.currentTarget.style.background = "#F9F9F8";
              }
            }}
            onMouseLeave={(e) => {
              if (!checked) {
                e.currentTarget.style.borderColor = "#E0E0DC";
                e.currentTarget.style.background = "#FFFFFF";
              }
            }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "0.25rem",
                border: `1.5px solid ${checked ? "#1A1A1A" : "#E0E0DC"}`,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}>
              {checked && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="#1A1A1A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.875rem",
                color: "#4A4A4A",
                fontWeight: 400,
                transition: "all 0.2s ease",
              }}>
              {label}
            </span>
          </label>
        ))}
        <p className="text-xs text-[#0D1B2A]/35 ml-auto">
          {displayed.length} vehicle{displayed.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Grid of Cards */}
      {loading ? (
        <div
          id="admin-inventory-cards-grid"
          className="admin-inventory-cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{ gap: "clamp(1rem, 3vw, 1.5rem)" }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-carbon border border-white/5 rounded-xl overflow-hidden animate-pulse">
              <div className="h-60 bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-6 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-[#0D1B2A]/30">
          <p className="text-lg font-inter">No vehicles found</p>
        </div>
      ) : (
        <div
          id="admin-inventory-cards-grid"
          className="admin-inventory-cards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{ gap: "clamp(1rem, 3vw, 1.5rem)" }}>
          {displayed.map((car, idx) => (
            <div
              key={car.id}
              id={`admin-inventory-card-${idx}`}
              className={`admin-inventory-card admin-inventory-card-${idx} group relative bg-white rounded-xl overflow-hidden transition-all duration-200`}
              style={{
                border: "1px solid #E0E0DC",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.borderColor = "#D0D0CC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                e.currentTarget.style.borderColor = "#E0E0DC";
              }}>
              {/* Image */}
              <div className="relative h-60 overflow-hidden bg-slate-900">
                <img
                  src={car.images[0]}
                  alt={car.title}
                  className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    soldCarIds.has(car.id) ? "grayscale-[30%] brightness-[0.85]" : ""
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-md" />

                {soldCarIds.has(car.id) && (
                  <>
                    {/* Subtle dark overlay - dims the photo without hiding the vehicle */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.45) 100%)",
                      }}
                    />
                    {/* Diagonal SOLD ribbon - the primary, unmissable sold signal */}
                    <div
                      className="absolute pointer-events-none"
                      style={{ top: "1.35rem", right: "-2.75rem", width: "11rem", transform: "rotate(45deg)" }}>
                      <div
                        className="text-center py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                        style={{
                          background: "#1A1A1A",
                          borderTop: "1px solid rgba(255,255,255,0.25)",
                          borderBottom: "1px solid rgba(255,255,255,0.25)",
                        }}>
                        <span className="text-white text-xs font-bold tracking-[0.2em] font-poppins uppercase">
                          SOLD
                        </span>
                      </div>
                    </div>
                    {/* Secondary accessible label - text-based, not color-only, reinforces the status.
                        Uses the same badge system as SALE/FEATURED but sits with extra bottom/left
                        inset so it never reads as flush against the card edge. */}
                    <div className="absolute bottom-4 left-4 pointer-events-none">
                      <VehicleStatusBadge icon={Ban} label="NOT AVAILABLE" tone="unavailable" />
                    </div>
                  </>
                )}

                {/* Badges - one shared visual system (see StatusBadge) so SALE and FEATURED read as
                    a single coherent set rather than two unrelated pill styles */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {car.isOnSale && <VehicleStatusBadge icon={Tag} label="SALE" tone="sale" />}
                  {car.featured && <VehicleStatusBadge icon={Star} label="FEATURED" tone="featured" />}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "clamp(1rem, 3vw, 1.5rem)" }}>
                {/* Title */}
                <h3 className="font-bebas text-[#0D1B2A] tracking-wider mb-3 line-clamp-1">
                  {car.title}
                </h3>

                {/* Year & Mileage */}
                <div className="flex gap-4 mb-4 text-xs lg:text-sm">
                  <div className="flex items-center gap-1.5 text-[#0D1B2A]/60">
                    <Calendar size={14} className="text-#1A1A1A" />
                    <span>{car.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#0D1B2A]/60">
                    <Gauge size={14} className="text-#1A1A1A" />
                    <span>{formatKilometers(car.km)}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap gap-2 mb-5 text-xs text-[#4A4A4A]">
                  <span>{transmissionLabel[car.transmission]}</span>
                  <span>·</span>
                  <span>{fuelLabel[car.fuel]}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-5" />

                {/* Price */}
                <div className="mb-6">
                  <span className="font-bebas text-2xl text-[#1A1A1A] tracking-wider">
                    {formatNZD(car.price)}
                  </span>
                </div>

                {/* Featured Toggle */}
                <label
                  onClick={() => toggleFeatured(car)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    marginBottom: "1rem",
                    userSelect: "none",
                  }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "0.25rem",
                      border: `1.5px solid ${car.featured ? "#1A1A1A" : "#E0E0DC"}`,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}>
                    {car.featured && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none">
                        <path
                          d="M2 5L4 7L8 3"
                          stroke="#1A1A1A"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.8rem",
                      color: "#1A1A1A",
                      textDecoration: "underline",
                      transition: "all 0.2s ease",
                    }}>
                    Mark as Featured
                  </span>
                </label>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => navigate(`/admin/cars/edit/${car.id}`)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #1A1A1A",
                      background: "#F2F2F0",
                      color: "#1A1A1A",
                      borderRadius: "0.375rem",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      fontFamily: "Inter, sans-serif",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      minHeight: "36px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#E0E0DC";
                      e.currentTarget.style.color = "#1A1A1A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#F2F2F0";
                      e.currentTarget.style.color = "#1A1A1A";
                    }}>
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(car)}
                    disabled={isDemo}
                    title={isDemo ? "Demo mode: deleting data is disabled." : undefined}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid rgba(239,68,68,0.25)",
                      background: "rgba(239,68,68,0.05)",
                      color: "rgba(239,68,68,0.7)",
                      borderRadius: "0.375rem",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      fontFamily: "Inter, sans-serif",
                      cursor: isDemo ? "not-allowed" : "pointer",
                      opacity: isDemo ? 0.5 : 1,
                      transition: "all 0.2s ease",
                      minHeight: "36px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)";
                      e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(239,68,68,0.25)";
                      e.currentTarget.style.background = "rgba(239,68,68,0.05)";
                      e.currentTarget.style.color = "rgba(239,68,68,0.7)";
                    }}>
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
