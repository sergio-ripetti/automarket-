import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Gauge, Fuel, Settings2, Palette,
  ArrowLeft, X, CheckCircle2, MessageCircle, Calculator, Heart,
} from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../lib/firebase"
import { getCarById } from "../lib/carsService"
import type { Car, OfferForm } from "../types"

// Formats a numeric price into NZD currency display format
function formatPrice(price: number): string {
  return price.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 })
}
// Formats a numeric odometer reading into a "X km" display string
function formatKm(km: number): string {
  return km.toLocaleString("en-NZ") + " km"
}

const fuelLabel: Record<string, string> = {
  gasolina: "Petrol", diesel: "Diesel", electrico: "Electric", hibrido: "Hybrid",
}
const transmissionLabel: Record<string, string> = {
  manual: "Manual", automatico: "Automatic",
}

const iconWrap: React.CSSProperties = {
  backgroundColor: "rgba(29,78,216,0.1)", borderRadius: "0.5rem",
  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

// Renders a small gold-accented section title used to divide the car detail page
const sectionHeader = (title: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
    <div style={{ width: 3, height: 20, backgroundColor: "#C4FF00", borderRadius: 2 }} />
    <h2 className="font-bebas" style={{color: "#0D1B2A", letterSpacing: "0.05em" }}>
      {title}
    </h2>
  </div>
)

// Displays full details for a single car (gallery, price, specs, description) and lets the user favourite it or submit an offer - looks up the car by route param id, reads/writes favourites to localStorage, and saves offers to Firestore
export default function CarDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedImage, setSelectedImage] = useState(0)
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null)
  const [backHovered, setBackHovered] = useState(false)
  const [heartHovered, setHeartHovered] = useState(false)
  const [isFavourite, setIsFavourite] = useState(false)
  const [offerBtnHovered, setOfferBtnHovered] = useState(false)
  const [financeBtnHovered, setFinanceBtnHovered] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [offerForm, setOfferForm] = useState<OfferForm>({
    offerPrice: "", firstName: "", lastName: "", email: "", phone: "", message: "",
  })

  // Fetch car data from Firestore on mount
  useEffect(() => {
    if (!id) return
    const fetchCar = async () => {
      try {
        const carData = await getCarById(id)
        setCar(carData)
        // Update favourite state after car is loaded
        if (carData) {
          try {
            const favs = JSON.parse(localStorage.getItem('automarket_favourites') || '[]') as string[]
            setIsFavourite(favs.includes(carData.id))
          } catch { /* silent */ }
        }
      } catch (err) {
        console.error('Failed to load car:', err)
        setCar(null)
      } finally {
        setLoading(false)
      }
    }
    fetchCar()
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F2F2F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", color: "#767676", marginBottom: "1rem" }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!car) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F2F2F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem" }}>
        <p className="font-bebas" style={{ fontSize: "3rem", color: "#C8D8E4", marginBottom: "1rem" }}>
          Car not found
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            fontFamily: "Outfit", color: "#C4FF00", border: "1px solid rgba(29,78,216,0.4)",
            padding: "0.625rem 1.5rem", borderRadius: "0.5rem", backgroundColor: "transparent",
            cursor: "pointer", fontSize: "0.875rem",
          }}
        >
          Back to home
        </button>
      </div>
    )
  }

  // Adds or removes the current car from the favourites list persisted in localStorage, then notifies other components via a custom event
  const toggleFavourite = () => {
    if (!car) return
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('automarket_favourites') || '[]')
      const newFavs = favs.includes(car.id)
        ? favs.filter((fid) => fid !== car.id)
        : [...favs, car.id]
      localStorage.setItem('automarket_favourites', JSON.stringify(newFavs))
      setIsFavourite(!isFavourite)
      window.dispatchEvent(new CustomEvent('favourites-changed'))
    } catch { /* silent */ }
  }

  // Handles the "Make an Offer" form submission - takes offerForm state and car info, writes a new offer message document to Firestore, then shows a success toast and resets the form
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'messages'), {
        senderName: offerForm.firstName + ' ' + offerForm.lastName,
        firstName: offerForm.firstName,
        lastName: offerForm.lastName,
        email: offerForm.email,
        phone: offerForm.phone,
        reason: 'Vehicle Offer',
        message: offerForm.message || '',
        offerPrice: Number(offerForm.offerPrice),
        carId: car.id,
        carTitle: car.title,
        carPrice: car.price,
        read: false,
        type: 'offer',
        createdAt: serverTimestamp()
      })
      setModalOpen(false)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerPrice: '', message: '' })
    } catch (error) {
      console.error('Error saving offer:', error)
    }
  }

  const chips = [
    { icon: Calendar, label: "Year",         value: String(car.year) },
    { icon: Gauge,    label: "Mileage",      value: formatKm(car.km) },
    { icon: Settings2,label: "Transmission", value: transmissionLabel[car.transmission] },
    { icon: Fuel,     label: "Fuel",         value: fuelLabel[car.fuel] },
  ]

  return (
    <main style={{ minHeight: "80vh", paddingTop: "7rem", paddingBottom: "4rem", backgroundColor: "#F2F2F0" }}>
      <div style={{ width: "80%", margin: "0 auto" }}>

        {/* ── Back button ── */}
        <Link
          to="/"
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            backgroundColor: backHovered ? "#E4EAF0" : "#F0F4F8",
            border: "1px solid #C8D8E4",
            borderRadius: "2rem", padding: "0.5rem 1.25rem",
            fontFamily: "Outfit", fontSize: "0.8rem",
            color: backHovered ? "#0D1B2A" : "#767676",
            textDecoration: "none", marginBottom: "2rem",
            transition: "all 0.2s",
          }}
        >
          <ArrowLeft size={14} />
          Back to listings
        </Link>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row" style={{ gap: "3rem", alignItems: "flex-start" }}>

          {/* ════ GALLERY ════ */}
          <div className="flex-shrink-0 w-full lg:w-1/2">

            {/* Main image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ borderRadius: "1.25rem", overflow: "hidden", height: "480px", position: "relative" }}
              >
                <img
                  src={car.images[selectedImage]}
                  alt={car.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* Gradient overlay */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: "80px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                  pointerEvents: "none",
                }} />

                {/* Heart / favourite button */}
                <button
                  onClick={toggleFavourite}
                  onMouseEnter={() => setHeartHovered(true)}
                  onMouseLeave={() => setHeartHovered(false)}
                  title={isFavourite ? "Saved!" : "Save to Favourites"}
                  style={{
                    position: "absolute", top: 16, right: 16, zIndex: 10,
                    backgroundColor: isFavourite ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${isFavourite ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: "50%", width: 44, height: 44,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.25s",
                    boxShadow: isFavourite ? "0 0 16px rgba(220,38,38,0.3)" : heartHovered ? "0 0 10px rgba(255,255,255,0.1)" : "none",
                  }}
                >
                  <Heart
                    size={20}
                    fill={isFavourite ? "#ef4444" : "none"}
                    color={isFavourite ? "#ef4444" : "rgba(255,255,255,0.7)"}
                  />
                </button>
              </motion.div>
            </AnimatePresence>

            {/* Thumbnails */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem" }}>
              {car.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  onMouseEnter={() => setHoveredThumb(i)}
                  onMouseLeave={() => setHoveredThumb(null)}
                  style={{
                    flex: 1, height: "80px", borderRadius: "0.625rem", overflow: "hidden",
                    border: `2px solid ${selectedImage === i ? "#C4FF00" : "transparent"}`,
                    boxShadow: selectedImage === i ? "0 0 12px rgba(29,78,216,0.3)" : "none",
                    opacity: selectedImage === i ? 1 : hoveredThumb === i ? 0.8 : 0.5,
                    transition: "all 0.2s", cursor: "pointer", padding: 0,
                  }}
                >
                  <img src={img} alt={`View ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          </div>

          {/* ════ INFO COLUMN ════ */}
          <div className="w-full lg:w-1/2 flex-grow flex flex-col" style={{ gap: "1.5rem" }}>

            {/* Title area */}
            <div>
              {car.isOnSale && (
                <span style={{
                  background: "#D64545", color: "#FFFFFF",
                  fontFamily: "Outfit", fontSize: "0.65rem", fontWeight: 700,
                  padding: "5px 14px", borderRadius: "2rem", letterSpacing: "0.1em",
                  display: "inline-block", marginBottom: "0.75rem", textTransform: "uppercase",
                }}>
                  SPECIAL OFFER
                </span>
              )}
              <h1 className="font-bebas" style={{color: "#1A1A1A", letterSpacing: "0.03em", lineHeight: 1, marginBottom: 0 }}>
                {car.title}
              </h1>
            </div>

            {/* Price card */}
            <div style={{
              backgroundColor: "#FFFFFF", border: "1px solid rgba(29,78,216,0.15)",
              borderRadius: "1rem", padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                {car.isOnSale && car.originalPrice && (
                  <p style={{ fontFamily: "Outfit", fontSize: "0.9rem", color: "#767676", textDecoration: "line-through", marginBottom: 2 }}>
                    {formatPrice(car.originalPrice)}
                  </p>
                )}
                <p className="font-bebas" style={{ fontSize: "2.5rem", color: "#C4FF00", lineHeight: 1 }}>
                  {formatPrice(car.price)}
                </p>
              </div>
              <p style={{ fontFamily: "Outfit", fontSize: "0.7rem", color: "#767676", letterSpacing: "0.15em" }}>
                NZD
              </p>
            </div>

            {/* Info chips 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {chips.map(({ icon: Icon, label, value }) => (
                <div key={label} style={{
                  backgroundColor: "#FFFFFF", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "0.875rem", padding: "0.875rem 1rem",
                  display: "flex", alignItems: "center", gap: "0.875rem",
                }}>
                  <div style={iconWrap}><Icon size={16} color="#4A4A4A" /></div>
                  <div>
                    <p style={{ fontFamily: "Outfit", fontSize: "0.65rem", color: "#767676", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {label}
                    </p>
                    <p style={{color: "#1A1A1A" }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Colour row */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.875rem",
              padding: "0.875rem 1rem", backgroundColor: "#FFFFFF",
              borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={iconWrap}><Palette size={16} color="#4A4A4A" /></div>
              <p style={{ fontFamily: "Outfit", fontSize: "0.65rem", color: "#767676", textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>
                Colour
              </p>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                border: "1px solid #E0E0DC",
                boxShadow: "0 0 8px rgba(0,0,0,0.5)",
                backgroundColor: car.color, flexShrink: 0,
              }} />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0.25rem 0" }} />

            {/* Vehicle Description */}
            <div>
              {sectionHeader("Vehicle Description")}
              <p style={{ fontFamily: "Outfit", fontSize: "0.875rem", color: "#767676", lineHeight: 1.8 }}>
                {car.description}
              </p>
            </div>

            {/* Seller's Note */}
            <div style={{
              backgroundColor: "#FFFFFF", border: "1px solid #E0E0DC",
              borderRadius: "1rem", padding: "1.5rem", position: "relative", overflow: "hidden",
            }}>
              {/* Gold top-left accent */}
              <div style={{
                position: "absolute", top: 0, left: 0, width: 60, height: 3,
                background: "#C4FF00",
              }} />
              {sectionHeader("Seller's Note")}
              <p style={{ fontFamily: "Outfit", fontSize: "0.875rem", color: "#4A4A4A", lineHeight: 1.8, fontStyle: "italic" }}>
                "{car.ownerDescription}"
              </p>
              {/* Decorative quote mark */}
              <div style={{
                position: "absolute", top: "0.75rem", right: "1rem",
                fontFamily: "Georgia, serif", fontSize: "5rem", color: "rgba(29,78,216,0.08)",
                lineHeight: 1, pointerEvents: "none", userSelect: "none",
              }}>
                "
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <button
                onClick={() => setModalOpen(true)}
                onMouseEnter={() => setOfferBtnHovered(true)}
                onMouseLeave={() => setOfferBtnHovered(false)}
                style={{
                  height: "52px", width: "100%",
                  backgroundColor: offerBtnHovered ? "rgba(26,26,26,0.05)" : "transparent",
                  border: `2px solid #1A1A1A`,
                  color: "#1A1A1A", borderRadius: "0.875rem",
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.05em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem",
                  boxShadow: offerBtnHovered ? "0 0 20px rgba(29,78,216,0.15)" : "none",
                  cursor: "pointer", transition: "all 0.3s",
                }}
              >
                <MessageCircle size={18} />
                I'm Interested / Make an Offer
              </button>

              <Link
                to={`/financing?carId=${car.id}`}
                onMouseEnter={() => setFinanceBtnHovered(true)}
                onMouseLeave={() => setFinanceBtnHovered(false)}
                style={{
                  height: "52px", width: "100%", background: "#1A1A1A", color: "#FFFFFF", borderRadius: "0.875rem", border: "none",
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.05em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem",
                  boxShadow: financeBtnHovered ? "0 0 30px rgba(26,26,26,0.4)" : "none",
                  opacity: financeBtnHovered ? 0.95 : 1,
                  textDecoration: "none", transition: "all 0.3s",
                }}
              >
                <Calculator size={18} />
                Finance Calculator
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ════ OFFER MODAL ════ */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#F2F2F0]/80 backdrop-blur-md"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                position: "relative", width: "100%", maxWidth: "42rem",
                backgroundColor: "#FFFFFF", border: "1px solid rgba(29,78,216,0.2)",
                borderRadius: "1.5rem", zIndex: 10, overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{
                background: "#1A1A1A",
                padding: "1.75rem 2rem", display: "flex",
                alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
              }}>
                <div>
                  <h2 className="font-bebas text-3xl tracking-wide" style={{ color: "#FFFFFF", lineHeight: 1 }}>
                    Make an Offer
                  </h2>
                  <p className="font-inter text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {car.title} · {formatPrice(car.price)}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    width: "2rem", height: "2rem", borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.2)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    border: "none", cursor: "pointer", flexShrink: 0, color: "#000",
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Car info strip */}
              <div style={{
                backgroundColor: "#E4EAF0", padding: "0.875rem 2rem",
                display: "flex", alignItems: "center", gap: "1rem",
              }}>
                <img src={car.images[0]} alt={car.title} style={{ width: 80, height: 56, objectFit: "cover", borderRadius: "0.5rem", flexShrink: 0 }} />
                <div>
                  <p className="font-bebas text-[#0D1B2A] tracking-wide" style={{ fontSize: "1.1rem", lineHeight: 1.2 }}>{car.title}</p>
                  <div className="font-inter text-xs flex items-center gap-1.5" style={{ color: "#767676", marginTop: "0.25rem" }}>
                    <span>{car.year}</span><span>·</span>
                    <span>{formatKm(car.km)}</span><span>·</span>
                    <span>{fuelLabel[car.fuel]}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleOfferSubmit} style={{ padding: "2rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

                  {/* First Name and Last Name */}
                  {(["firstName", "lastName"] as const).map((field, i) => (
                    <div key={field}>
                      <label className="font-inter text-xs block mb-1.5" style={{ color: "#767676" }}>{i === 0 ? "First Name *" : "Last Name *"}</label>
                      <input required value={offerForm[field]}
                        onChange={(e) => setOfferForm({ ...offerForm, [field]: e.target.value })}
                        placeholder={i === 0 ? "John" : "Smith"}
                        className="font-inter text-sm text-[#0D1B2A] focus:outline-none focus:border-[#C4FF00]"
                        style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#F2F2F0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}
                      />
                    </div>
                  ))}

                  {/* Phone */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="font-inter text-xs block mb-1.5" style={{ color: "#767676" }}>Phone *</label>
                    <input type="tel" required value={offerForm.phone}
                      onChange={(e) => setOfferForm({ ...offerForm, phone: e.target.value })}
                      placeholder="+64 21 123 4567"
                      className="font-inter text-sm text-[#0D1B2A] focus:outline-none focus:border-[#C4FF00]"
                      style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#F2F2F0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}
                    />
                  </div>

                  {/* Offer price */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="font-inter text-xs block mb-1.5" style={{ color: "#767676" }}>Your Offer (NZD) *</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#4A4A4A", fontFamily: "Outfit", fontSize: "0.875rem", fontWeight: 600, pointerEvents: "none" }}>$</span>
                      <input type="number" required value={offerForm.offerPrice}
                        onChange={(e) => setOfferForm({ ...offerForm, offerPrice: e.target.value })}
                        placeholder="32000"
                        className="font-inter text-sm text-[#0D1B2A] focus:outline-none focus:border-[#C4FF00]"
                        style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#F2F2F0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem 0.625rem 2rem" }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="font-inter text-xs block mb-1.5" style={{ color: "#767676" }}>Email *</label>
                    <input type="email" required value={offerForm.email}
                      onChange={(e) => setOfferForm({ ...offerForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="font-inter text-sm text-[#0D1B2A] focus:outline-none focus:border-[#C4FF00]"
                      style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#F2F2F0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}
                    />
                  </div>

                  {/* Message */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="font-inter text-xs block mb-1.5" style={{ color: "#767676" }}>Message (optional)</label>
                    <textarea value={offerForm.message}
                      onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                      placeholder="Any questions or comments about this vehicle?"
                      rows={3}
                      className="font-inter text-sm text-[#0D1B2A] focus:outline-none focus:border-[#C4FF00] resize-none"
                      style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#F2F2F0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="font-inter text-sm transition-colors"
                    style={{ flex: 1, padding: "0.75rem", border: "1px solid #C8D8E4", color: "#767676", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: "transparent" }}>
                    Cancel
                  </button>
                  <button type="submit"
                    className="font-inter transition-opacity hover:opacity-90"
                    style={{ flex: 2, padding: "0.75rem", background: "#1A1A1A", color: "#FFFFFF", fontWeight: 700, fontSize: "0.875rem", borderRadius: "0.5rem", border: "none", cursor: "pointer" }}>
                    Send My Offer →
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ TOAST ════ */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-700 text-[#0D1B2A] font-inter text-sm px-5 py-3 rounded-xl shadow-xl"
          >
            <CheckCircle2 size={18} />
            Offer sent successfully! We'll be in touch soon.
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
