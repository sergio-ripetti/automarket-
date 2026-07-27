import type { Sale } from '../../../../lib/salesService'

interface VehicleInfoCardProps {
  sale: Sale
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function VehicleInfoCard({ sale }: VehicleInfoCardProps) {
  return (
    <div
      id="admin-sales-detail-vehicle"
      className="admin-sales-detail-vehicle detail-card"
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}>
      <img
        src={sale.carImages[0]}
        alt=""
        style={{
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          display: "block",
          borderRadius: "0.75rem",
          marginBottom: "1rem",
        }}
      />
      <h2
        className="font-bebas"
        style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
        {sale.carTitle}
      </h2>
      <div
        className="detail-section-grid-2col"
        style={{ marginBottom: "1rem" }}>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.75rem",
              color: "#767676",
            }}>
            Year • KM
          </p>
          <p style={{ color: "#0D1B2A" }}>
            {sale.carYear} • {0} km
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.75rem",
              color: "#767676",
            }}>
            Color
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              aria-label={`Vehicle color: ${sale.carColor}`}
              title={sale.carColor}
              style={{
                display: "inline-block",
                width: "1rem",
                height: "1rem",
                borderRadius: "50%",
                backgroundColor: sale.carColor,
                border: "1px solid #E0E0DC",
                flexShrink: 0,
              }}
            />
            <p style={{ color: "#1A1A1A" }}>{sale.carColor}</p>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #E0E0DC" }}>
        <p
          style={{
            fontFamily: "Outfit",
            fontSize: "0.7rem",
            color: "#6B7280",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "0.4rem",
            fontWeight: 600,
          }}>
          Sale Price
        </p>
        <p
          className="font-bebas"
          style={{ fontSize: "1.1rem", color: "#0D1B2A", fontWeight: 700 }}>
          {fmt(sale.paymentPlan.salePrice)}
        </p>
      </div>
    </div>
  )
}
