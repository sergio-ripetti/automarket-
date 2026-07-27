import type { Sale } from '../../../../lib/salesService'

interface BuyerInfoCardProps {
  sale: Sale
}

export function BuyerInfoCard({ sale }: BuyerInfoCardProps) {
  return (
    <div
      id="admin-sales-detail-buyer"
      className="admin-sales-detail-buyer detail-card"
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
        Buyer Information
      </h3>
      <div className="detail-section-grid-2col">
        {[
          { label: "Full Name", value: sale.buyer.name },
          { label: "ID Number", value: sale.buyer.idNumber },
          { label: "License", value: sale.buyer.licenseNumber },
          { label: "Email", value: sale.buyer.email },
          { label: "Phone", value: sale.buyer.phone },
          { label: "Address", value: sale.buyer.address },
        ].map(({ label, value }) => (
          <div key={label}>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.75rem",
                color: "#767676",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.25rem",
              }}>
              {label}
            </p>
            <p style={{ color: "#0D1B2A" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
