import type { Sale } from '../../../../lib/salesService'

interface SaleNotesSectionProps {
  sale: Sale
}

export function SaleNotesSection({ sale }: SaleNotesSectionProps) {
  if (!sale.notes) {
    return null
  }

  return (
    <div
      style={{
        backgroundColor: "transparent",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}>
      <h4
        style={{
          fontFamily: "Outfit",
          fontSize: "0.85rem",
          color: "#767676",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.75rem",
        }}>
        Notes
      </h4>
      <p
        style={{
          fontFamily: "Outfit",
          fontSize: "0.875rem",
          color: "#767676",
        }}>
        {sale.notes}
      </p>
    </div>
  )
}
