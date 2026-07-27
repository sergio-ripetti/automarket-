import type { Sale } from '../../../../lib/salesService'

interface PaymentSummaryCardProps {
  sale: Sale
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export function PaymentSummaryCard({ sale }: PaymentSummaryCardProps) {
  return (
    <div
      id="admin-sales-detail-payment"
      className="admin-sales-detail-payment"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E0E0DC",
        borderRadius: "1rem",
        padding: "clamp(0.75rem, 2vw, 1.5rem)",
        marginBottom: "clamp(0.75rem, 2vw, 1.5rem)",
      }}>
      <span
        style={{
          display: "inline-block",
          padding: "0.375rem 0.75rem",
          borderRadius: "0.375rem",
          backgroundColor:
            sale.paymentPlan.type === "cash"
              ? "rgba(34, 197, 94, 0.12)"
              : sale.paymentPlan.type === "financing"
                ? "rgba(59, 130, 246, 0.12)"
                : "rgba(147, 51, 234, 0.12)",
          color:
            sale.paymentPlan.type === "cash"
              ? "#22c55e"
              : sale.paymentPlan.type === "financing"
                ? "#3b82f6"
                : "#9333ea",
          fontSize: "0.75rem",
          fontWeight: 600,
          fontFamily: "Outfit",
          marginBottom: "1rem",
        }}>
        {sale.paymentPlan.type === "cash"
          ? "Cash Payment"
          : sale.paymentPlan.type === "financing"
            ? "Full Financing"
            : "Down Payment + Financing"}
      </span>

      {sale.paymentPlan.type === "cash" ? (
        <div>
          <p
            style={{
              fontFamily: "Outfit",
              fontSize: "0.75rem",
              color: "#767676",
              marginBottom: "0.5rem",
            }}>
            Sale Price
          </p>
          <p
            className="font-bebas"
            style={{
              fontSize: "2.5rem",
              color: "#1A1A1A",
              lineHeight: 1,
            }}>
            {fmt(sale.paymentPlan.salePrice)}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.75rem",
                color: "#767676",
                marginBottom: "0.25rem",
              }}>
              Sale Price
            </p>
            <p style={{ color: "#1A1A1A" }}>
              {fmt(sale.paymentPlan.salePrice)}
            </p>
          </div>
          {sale.paymentPlan.downPayment > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.75rem",
                  color: "#767676",
                  marginBottom: "0.25rem",
                }}>
                Down Payment
              </p>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.95rem",
                  color: "#22c55e",
                }}>
                {fmt(sale.paymentPlan.downPayment)}
              </p>
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.75rem",
                color: "#767676",
                marginBottom: "0.25rem",
              }}>
              Amount Financed
            </p>
            <p style={{ color: "#1A1A1A" }}>
              {fmt(sale.paymentPlan.financedAmount)}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "0.75rem",
              padding: "1rem",
              border: "1px solid #E0E0DC",
              marginBottom: "1rem",
              display: "inline-flex",
              flexDirection: "column",
              minWidth: "180px",
              maxWidth: "260px",
            }}>
            <p
              style={{
                fontFamily: "Outfit",
                fontSize: "0.75rem",
                color: "#767676",
                marginBottom: "0.4rem",
              }}>
              Monthly Payment
            </p>
            <p
              className="font-bebas"
              style={{
                fontSize: "1.5rem",
                color: "#1A1A1A",
                lineHeight: 1,
              }}>
              {fmt(sale.paymentPlan.monthlyPayment)}
            </p>
          </div>
          <div
            className="payment-summary-grid"
            style={{
              paddingTop: "1rem",
              borderTop: "1px solid #E0E0DC",
            }}>
            <div>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.75rem",
                  color: "#767676",
                  marginBottom: "0.25rem",
                }}>
                Total Interest
              </p>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.95rem",
                  color: "#ef4444",
                }}>
                {fmt(sale.paymentPlan.totalInterest)}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.75rem",
                  color: "#767676",
                  marginBottom: "0.25rem",
                }}>
                Total Repayment
              </p>
              <p style={{ color: "#1A1A1A" }}>
                {fmt(sale.paymentPlan.totalPayment)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
