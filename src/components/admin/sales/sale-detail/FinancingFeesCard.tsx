import type { Sale } from '../../../../lib/salesService'

interface FinancingFeesCardProps {
  sale: Sale
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function FinancingFeesCard({ sale }: FinancingFeesCardProps) {
  if (!sale.financingFees) {
    return null
  }

  return (
    <div
      id="admin-sales-detail-financing-fees"
      className="admin-sales-detail-financing-fees"
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
        Financing Fees
      </h3>
      <div style={{ fontSize: "0.875rem" }}>
        <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
          Establishment: {fmt(sale.financingFees?.establishmentFee)}
        </p>
        <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
          PPSR: {fmt(sale.financingFees?.ppsr)}
        </p>
        <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
          Monthly Account Fee: {fmt(sale.financingFees?.monthlyAccountFee)}
        </p>
        <p style={{ color: "#0D1B2A", marginBottom: "0.75rem" }}>
          Dealer Origination: {fmt(sale.financingFees?.dealerOriginationFee)}
        </p>
        <p
          style={{
            color: "#1A1A1A",
            fontWeight: 600,
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
          Total: {fmt(sale.financingFees?.total)}
        </p>
      </div>
    </div>
  )
}
