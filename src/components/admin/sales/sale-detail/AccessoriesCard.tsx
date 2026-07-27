import type { Sale } from '../../../../lib/salesService'

interface AccessoriesCardProps {
  sale: Sale
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function AccessoriesCard({ sale }: AccessoriesCardProps) {
  if (!sale.extraAccessories || !sale.extraAccessories?.items || sale.extraAccessories?.items?.length === 0) {
    return null
  }

  return (
    <div
      id="admin-sales-detail-accessories"
      className="admin-sales-detail-accessories"
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
        Extra Accessories
      </h3>
      <div style={{ fontSize: "0.875rem" }}>
        {sale.extraAccessories?.items?.map((item, idx) => (
          <p
            key={idx}
            style={{ color: "#0D1B2A", marginBottom: "0.5rem" }}>
            {item.description}: {fmt(item.price)}
          </p>
        ))}
        <p
          style={{
            color: "#1A1A1A",
            fontWeight: 600,
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
          Total: {fmt(sale.extraAccessories?.total)}
        </p>
      </div>
    </div>
  )
}
