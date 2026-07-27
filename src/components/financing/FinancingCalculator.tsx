import { useState } from 'react'
import { FormInput, FormLabel } from '../shared'
import { sanitizeDigits } from '../../lib/numericInput'
import type { Car } from '../../types'
import type { FinancingCalculationResult } from '../../lib/financingCalculations'

interface FinancingCalculatorProps {
  car: Car | undefined
  manualPrice: string
  downPaymentPercent: number
  loanTermMonths: number
  calculation: FinancingCalculationResult
  onManualPriceChange: (value: string) => void
  onDownPaymentChange: (value: number) => void
  onLoanTermChange: (months: number) => void
  onContinue: () => void
}

const MONTH_OPTIONS = [12, 24, 36, 48, 60]

function formatPrice(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

export default function FinancingCalculator({
  car,
  manualPrice,
  downPaymentPercent,
  loanTermMonths,
  calculation,
  onManualPriceChange,
  onDownPaymentChange,
  onLoanTermChange,
  onContinue,
}: FinancingCalculatorProps) {
  const [applyHovered, setApplyHovered] = useState(false)

  const downPaymentAmt = calculation.downPaymentAmount
  const financed = calculation.financedAmount
  const monthly = Math.round(calculation.monthlyPayment)
  const totalRepay = Math.round(calculation.totalRepayment)
  const totalInterest = Math.round(calculation.totalInterest)
  const sliderPct = calculation.sliderPercentage

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2.5rem', alignItems: 'start' }}>

      {/* Left — Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Car card or price input */}
        {car ? (
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.875rem', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <img src={car.images[0]} alt={car.title} style={{ width: 72, height: 50, objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }} />
            <div>
              <p className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em' }}>{car.title}</p>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>{formatPrice(car.price)}</p>
            </div>
          </div>
        ) : (
          <div>
            <FormLabel required>CAR PRICE (NZD)</FormLabel>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#767676', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
              <FormInput
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={9}
                value={manualPrice}
                onChange={(e) => onManualPriceChange(sanitizeDigits(e.target.value, 9))}
                placeholder="25,000"
              />
            </div>
          </div>
        )}

        {/* Down Payment slider */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.875rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>DOWN PAYMENT</p>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#1A1A1A' }}>{formatPrice(downPaymentAmt)}</p>
            </div>
            <div style={{
              backgroundColor: '#F2F2F0', border: '1px solid #1A1A1A',
              borderRadius: '0.5rem', padding: '0.2rem 0.75rem',
            }}>
              <span className="font-bebas" style={{ fontSize: '1.75rem', color: '#1A1A1A', lineHeight: 1 }}>{downPaymentPercent}%</span>
            </div>
          </div>
          <input
            type="range" min={10} max={50} step={5}
            value={downPaymentPercent}
            onChange={(e) => onDownPaymentChange(Number(e.target.value))}
            style={{
              width: '100%', cursor: 'pointer', accentColor: '#1A1A1A',
              background: `linear-gradient(to right, #1A1A1A ${sliderPct}%, rgba(255,255,255,0.08) ${sliderPct}%)`,
              height: '4px', borderRadius: '2px', outline: 'none', border: 'none',
              WebkitAppearance: 'none',
            } as React.CSSProperties}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676' }}>10%</span>
            <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676' }}>50%</span>
          </div>
        </div>

        {/* Loan Term pills */}
        <div>
          <FormLabel style={{ marginBottom: '0.75rem' }} required>LOAN TERM</FormLabel>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => onLoanTermChange(m)}
                style={loanTermMonths === m ? {
                  padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                  background: '#1A1A1A',
                  color: '#FFFFFF', fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                } : {
                  padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                  backgroundColor: '#F2F2F0', color: '#4A4A4A',
                  fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 400,
                  border: '1px solid #E0E0DC', cursor: 'pointer',
                }}
              >
                {m} mo
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Results card */}
      <div style={{ position: 'sticky', top: '7rem' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0DC',
          borderRadius: '1.25rem', padding: '2rem',
        }}>
          <p style={{ fontFamily: 'Outfit', fontSize: '0.68rem', color: '#767676', letterSpacing: '0.14em', marginBottom: '0.5rem' }}>
            ESTIMATED MONTHLY PAYMENT
          </p>
          <p className="font-bebas" style={{ fontSize: '3.5rem', color: '#1A1A1A', lineHeight: 1, marginBottom: '1.75rem' }}>
            {formatPrice(monthly)}
          </p>

          <div style={{ borderTop: '1px solid #E0E0DC', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
            {[
              { label: 'Amount Financed', value: formatPrice(financed) },
              { label: 'Total Repayment', value: formatPrice(totalRepay) },
              { label: 'Total Interest', value: formatPrice(totalInterest), red: true },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676' }}>{label}</span>
                <span style={{color: "#1A1A1A" }}>{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onContinue}
            onMouseEnter={() => setApplyHovered(true)}
            onMouseLeave={() => setApplyHovered(false)}
            style={{
              width: '100%', height: '52px',
              background: applyHovered ? '#1A2838' : '#0D1B2A',
              color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 700,
              fontSize: '0.9rem', letterSpacing: '0.04em',
              border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
              boxShadow: applyHovered ? '0 0 25px rgba(13,27,42,0.4)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            Apply for Financing →
          </button>
        </div>
      </div>
    </div>
  )
}
