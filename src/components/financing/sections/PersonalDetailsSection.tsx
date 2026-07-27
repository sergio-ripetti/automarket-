import { FormLabel, FormInput, FormError } from '../../shared'
import { sanitizeDigits } from '../../../lib/numericInput'
import type { FinancingForm } from '../../../types'
import type { FinancingValidationErrors } from '../../../lib/financingValidation'

// Filters phone input to digits and common formatting characters (+, space, -, parens)
function formatPhoneInput(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, '')
}

interface PersonalDetailsSectionProps {
  form: FinancingForm
  errors: FinancingValidationErrors
  onFieldChange: <K extends keyof FinancingForm>(field: K, value: FinancingForm[K]) => void
}

export default function PersonalDetailsSection({
  form,
  errors,
  onFieldChange,
}: PersonalDetailsSectionProps) {
  return (
    <>
      {/* First Name */}
      <div>
        <FormLabel required>First Name</FormLabel>
        <FormInput
          required
          value={form.firstName}
          placeholder="John"
          maxLength={40}
          onChange={(e) => onFieldChange('firstName', e.target.value)}
          error={errors.firstName}
        />
        <FormError message={errors.firstName} />
      </div>

      {/* Last Name */}
      <div>
        <FormLabel required>Last Name</FormLabel>
        <FormInput
          required
          value={form.lastName}
          placeholder="Smith"
          maxLength={40}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
          error={errors.lastName}
        />
        <FormError message={errors.lastName} />
      </div>

      {/* Email */}
      <div>
        <FormLabel required>Email</FormLabel>
        <FormInput
          required
          type="email"
          value={form.email}
          placeholder="john@example.com"
          maxLength={100}
          onChange={(e) => onFieldChange('email', e.target.value)}
          error={errors.email}
        />
        <FormError message={errors.email} />
      </div>

      {/* Phone */}
      <div>
        <FormLabel required>Phone</FormLabel>
        <FormInput
          required
          type="tel"
          value={form.phone}
          placeholder="+64 21 123 4567"
          maxLength={20}
          onChange={(e) => onFieldChange('phone', formatPhoneInput(e.target.value))}
          error={errors.phone}
        />
        <FormError message={errors.phone} />
      </div>

      {/* Driver's Licence */}
      <div>
        <FormLabel required>Driver's Licence No.</FormLabel>
        <FormInput
          required
          value={form.licenseNumber}
          placeholder="A12345678"
          maxLength={20}
          onChange={(e) => onFieldChange('licenseNumber', e.target.value.toUpperCase())}
          error={errors.licenseNumber}
        />
        <FormError message={errors.licenseNumber} />
      </div>

      {/* Monthly Income */}
      <div>
        <FormLabel required>Monthly Income (NZD)</FormLabel>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', color: '#767676', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
          <FormInput
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={form.income}
            placeholder="5,000"
            onChange={(e) => onFieldChange('income', sanitizeDigits(e.target.value, 6))}
            error={errors.income}
            style={{ paddingLeft: '1.5rem' }}
          />
        </div>
        <FormError message={errors.income} />
      </div>
    </>
  )
}
