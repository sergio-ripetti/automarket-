import { useState } from 'react'
import type { Car } from '../types'

interface FinancingSimulatorProps {
  car?: Car
  onRequestFinancing?: () => void
}

// Formats a numeric price into NZD currency string for display
function formatPrice(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

const MONTHLY_RATE = 0.008

// Interactive loan calculator - lets the user adjust down payment and term to preview monthly payment, total repayment, and interest for a car (or a default price if none given)
export default function FinancingSimulator({ car, onRequestFinancing }: FinancingSimulatorProps) {
  const basePrice = car?.price ?? 25000
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [months, setMonths] = useState(36)

  const downPayment = Math.round((downPaymentPct / 100) * basePrice)
  const financed = basePrice - downPayment
  const r = MONTHLY_RATE
  const n = months

  const monthlyPayment = financed * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPayment = monthlyPayment * n + downPayment
  const totalInterest = totalPayment - basePrice

  const monthOptions = [12, 24, 36, 48, 60]

  return (
    <div className="space-y-6">
      {/* Down payment slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-inter text-sm text-[#0D1B2A]/70">Down payment</label>
          <div className="text-right">
            <span className="font-bebas text-xl text-#2E86AB">{downPaymentPct}%</span>
            <p className="font-inter text-xs text-[#0D1B2A]/40">{formatPrice(downPayment)}</p>
          </div>
        </div>
        <input
          type="range"
          min={10}
          max={50}
          step={5}
          value={downPaymentPct}
          onChange={(e) => setDownPaymentPct(Number(e.target.value))}
          className="w-full accent-#2E86AB"
        />
        <div className="flex justify-between font-inter text-xs text-[#0D1B2A]/30 mt-1">
          <span>10%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Loan term selector */}
      <div>
        <label className="font-inter text-sm text-[#0D1B2A]/70 block mb-2">Loan term</label>
        <div className="flex gap-2 flex-wrap">
          {monthOptions.map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`font-inter text-sm px-4 py-2 rounded border transition-all ${
                months === m
                  ? 'bg-#2E86AB text-dark border-#2E86AB font-semibold'
                  : 'bg-white/5 text-[#0D1B2A]/60 border-white/10 hover:border-#2E86AB/40'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-#2E86AB/10 border border-#2E86AB/30 rounded-lg p-4 col-span-2">
          <p className="font-inter text-xs text-#2E86AB/70 mb-1">Monthly Payment</p>
          <p className="font-bebas text-3xl text-#2E86AB">{formatPrice(Math.round(monthlyPayment))}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="font-inter text-xs text-[#0D1B2A]/50 mb-1">Amount Financed</p>
          <p className="font-inter text-sm font-semibold text-[#0D1B2A]">{formatPrice(financed)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="font-inter text-xs text-[#0D1B2A]/50 mb-1">Total Repayment</p>
          <p className="font-inter text-sm font-semibold text-[#0D1B2A]">{formatPrice(Math.round(totalPayment))}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 col-span-2">
          <p className="font-inter text-xs text-[#0D1B2A]/50 mb-1">Total Interest</p>
          <p className="font-inter text-sm font-semibold text-red-400">{formatPrice(Math.round(totalInterest))}</p>
        </div>
      </div>

      {onRequestFinancing && (
        <button
          onClick={onRequestFinancing}
          className="w-full bg-#2E86AB text-dark font-inter font-semibold py-3 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Apply for Financing
        </button>
      )}
    </div>
  )
}
