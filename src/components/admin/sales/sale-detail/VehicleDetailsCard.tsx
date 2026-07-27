import type { Sale } from '../../../../lib/salesService'

interface VehicleDetailsCardProps {
  sale: Sale
}

export function VehicleDetailsCard({ sale }: VehicleDetailsCardProps) {
  if (!sale.vehicleInfo) {
    return null
  }

  return (
    <div
      id="admin-sales-detail-vehicle-details"
      className="admin-sales-detail-vehicle-details detail-card"
      style={{
        width: "100%",
        boxSizing: "border-box",
      }}>
      <h3
        className="font-bebas"
        style={{
          fontSize: "1.1rem",
          color: "#1A1A1A",
          marginBottom: "1rem",
        }}>
        Vehicle Details
      </h3>
      <div
        className="detail-section-grid-2col"
        style={{ marginBottom: "1rem" }}>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.7rem",
              color: "#767676",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}>
            VIN
          </p>
          <p style={{ color: "#0D1B2A" }}>{sale.vehicleInfo?.vin}</p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.7rem",
              color: "#767676",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}>
            License Plate
          </p>
          <p style={{ color: "#0D1B2A" }}>{sale.vehicleInfo?.plate}</p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.7rem",
              color: "#767676",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}>
            Origin
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.375rem",
              backgroundColor: sale.vehicleInfo?.isNZNew
                ? "rgba(34,197,94,0.2)"
                : "rgba(29,78,216,0.2)",
              color: sale.vehicleInfo?.isNZNew ? "#22c55e" : "#1A1A1A",
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "Outfit",
            }}>
            {sale.vehicleInfo?.isNZNew ? "NZ New" : "Used Import"}
          </span>
        </div>
        {!sale.vehicleInfo?.isNZNew && (
          <div>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.7rem",
                color: "#767676",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
              }}>
              Country
            </p>
            <p style={{ color: "#0D1B2A" }}>
              {sale.vehicleInfo?.originCountry}
            </p>
          </div>
        )}
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.7rem",
              color: "#767676",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}>
            Previous Owners
          </p>
          <p style={{ color: "#0D1B2A" }}>
            {sale.vehicleInfo?.previousOwners}
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.7rem",
              color: "#767676",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}>
            Maintenance History
          </p>
          <p style={{ color: "#0D1B2A" }}>
            {sale.vehicleInfo?.hasMaintenanceHistory ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  )
}
