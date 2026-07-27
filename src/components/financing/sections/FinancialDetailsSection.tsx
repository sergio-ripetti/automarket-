import { FormLabel, FormInput, FormError } from '../../shared'
import { sanitizeDigits } from '../../../lib/numericInput'
import type { FinancingForm } from '../../../types'
import type { FinancingValidationErrors } from '../../../lib/financingValidation'

interface FinancialDetailsSectionProps {
  form: FinancingForm
  errors: FinancingValidationErrors
  onFieldChange: <K extends keyof FinancingForm>(field: K, value: FinancingForm[K]) => void
}

export default function FinancialDetailsSection({
  form,
  errors,
  onFieldChange,
}: FinancialDetailsSectionProps) {
  return (
    <>
      {/* Monthly Expenses */}
      <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <FormLabel required>Monthly Expenses (NZD)</FormLabel>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', color: '#767676', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
            <FormInput
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={form.monthlyExpenses}
              placeholder="2,000"
              onChange={(e) => onFieldChange('monthlyExpenses', sanitizeDigits(e.target.value, 6))}
              error={errors.monthlyExpenses}
              style={{ paddingLeft: '1.5rem' }}
            />
          </div>
          <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', marginTop: '0.25rem' }}>
            Rent, food, other loans, etc.
          </p>
          <FormError message={errors.monthlyExpenses} />
        </div>
      </div>
    </>
  )
}
