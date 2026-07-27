import type { Sale } from '../../../../lib/salesService'

interface WarrantyDetailsCardProps {
  sale: Sale
}

export function WarrantyDetailsCard({ sale }: WarrantyDetailsCardProps) {
  if (!sale.warranty && !sale.mechanicalInsurance) {
    return null
  }

  return (
    <div
      id="admin-sales-detail-warranty"
      className="admin-sales-detail-warranty"
      style={{
        backgroundColor: "transparent",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "1rem",
        padding: "clamp(0.75rem, 2vw, 1.5rem)",
        marginBottom: "clamp(0.75rem, 2vw, 1.5rem)",
      }}>
      <h3
        className="font-bebas"
        style={{
          fontSize: "1.1rem",
          color: "#1A1A1A",
          marginBottom: "1rem",
        }}>
        Warranty & Insurance
      </h3>
      <div style={{ fontSize: "0.875rem" }}>
        {sale.warranty && (
          <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
            Warranty: {sale.warranty?.months} months - {sale.warranty?.provider}
          </p>
        )}
        {sale.mechanicalInsurance && (
          <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
            Insurance: {sale.mechanicalInsurance?.months} months -{" "}
            {sale.mechanicalInsurance?.provider}
          </p>
        )}
      </div>
    </div>
  )
}
