import type { Sale } from '../../../../lib/salesService'

interface OrcDetailsCardProps {
  sale: Sale
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function OrcDetailsCard({ sale }: OrcDetailsCardProps) {
  if (!sale.orc || (sale.orc?.orcTotal <= 0 && !sale.orc?.orcIncluded)) {
    return null
  }

  return (
    <div
      id="admin-sales-detail-orc"
      className="admin-sales-detail-orc detail-card"
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
        On Road Costs (ORC)
      </h3>
      {sale.orc?.orcIncluded ? (
        <span
          style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(34,197,94,0.2)",
            color: "#22c55e",
            fontSize: "0.875rem",
            fontWeight: 600,
            fontFamily: "Outfit",
          }}>
          ORC Included in Price
        </span>
      ) : (
        <div style={{ fontSize: "0.875rem" }}>
          {sale.orc?.wof > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              WoF: {fmt(sale.orc?.wof)}
            </p>
          )}
          {sale.orc?.registration > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              Registration: {fmt(sale.orc?.registration)}
            </p>
          )}
          {sale.orc?.grooming > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              Grooming: {fmt(sale.orc?.grooming)}
            </p>
          )}
          {sale.orc?.ownershipTransfer > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              Ownership Transfer: {fmt(sale.orc?.ownershipTransfer)}
            </p>
          )}
          {sale.orc?.mechanicalInspection > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              Mechanical Inspection: {fmt(sale.orc?.mechanicalInspection)}
            </p>
          )}
          {sale.orc?.otherAmount > 0 && (
            <p style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
              {sale.orc?.otherLabel}: {fmt(sale.orc?.otherAmount)}
            </p>
          )}
          <p
            style={{
              color: "#1A1A1A",
              fontWeight: 600,
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}>
            Total: {fmt(sale.orc?.orcTotal)}
          </p>
        </div>
      )}
    </div>
  )
}
