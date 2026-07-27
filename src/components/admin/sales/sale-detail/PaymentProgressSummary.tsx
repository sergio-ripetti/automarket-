interface PaymentProgressSummaryProps {
  paidCount: number
  totalPayments: number
  pendingCount: number
  remaining: number
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function PaymentProgressSummary({
  paidCount,
  totalPayments,
  pendingCount,
  remaining,
}: PaymentProgressSummaryProps) {
  return (
    <>
      <div
        id="admin-sales-payment-progress"
        style={{
          width: "100%",
          height: "clamp(6px, 1.5vw, 10px)",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "clamp(0.75rem, 2vw, 1rem)",
        }}>
        <div
          style={{
            height: "100%",
            backgroundColor: "#22c55e",
            width: `${(paidCount / totalPayments) * 100}%`,
            transition: "width 0.3s",
          }}
        />
      </div>
      <p
        style={{
          fontFamily: "Outfit",
          fontSize: "0.75rem",
          color: "#767676",
          marginTop: "0.5rem",
          marginBottom: "1rem",
        }}>
        {paidCount} of {totalPayments} payments completed
      </p>

      <div
        style={{
          backgroundColor: "rgba(29,78,216,0.05)",
          border: "1px solid rgba(29,78,216,0.1)",
          borderRadius: 0,
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontFamily: "Outfit",
          fontSize: "0.85rem",
          color: "#0D1B2A",
        }}>
        {paidCount} payments completed · {pendingCount} pending ·{" "}
        {fmt(remaining)} remaining
      </div>
    </>
  )
}
