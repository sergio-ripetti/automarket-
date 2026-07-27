import { FormLabel, FormInput, FormSelect, FormError } from '../../shared'
import { sanitizeDigits } from '../../../lib/numericInput'
import type { FinancingForm } from '../../../types'
import type { FinancingValidationErrors } from '../../../lib/financingValidation'

interface EmploymentDetailsSectionProps {
  form: FinancingForm
  errors: FinancingValidationErrors
  onFieldChange: <K extends keyof FinancingForm>(field: K, value: FinancingForm[K]) => void
}

export default function EmploymentDetailsSection({
  form,
  errors,
  onFieldChange,
}: EmploymentDetailsSectionProps) {
  return (
    <>
      {/* Employment Section — full width */}
      <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#1A1A1A', marginBottom: '1.25rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          Employment Details
        </h3>
      </div>

      {/* Employer */}
      <div>
        <FormLabel required>Employer</FormLabel>
        <FormInput
          required
          value={form.employer}
          placeholder="e.g., ABC Corp"
          maxLength={80}
          onChange={(e) => onFieldChange('employer', e.target.value)}
          error={errors.employer}
        />
        <FormError message={errors.employer} />
      </div>

      {/* Job Title */}
      <div>
        <FormLabel required>Job Title</FormLabel>
        <FormInput
          required
          value={form.jobTitle}
          placeholder="e.g., Manager"
          maxLength={60}
          onChange={(e) => onFieldChange('jobTitle', e.target.value)}
          error={errors.jobTitle}
        />
        <FormError message={errors.jobTitle} />
      </div>

      {/* Employment Type */}
      <div>
        <FormLabel required>Employment Type</FormLabel>
        <FormSelect
          required
          value={form.employmentType}
          onChange={(e) => onFieldChange('employmentType', e.target.value as 'fulltime' | 'parttime' | 'selfemployed' | 'other')}
          error={errors.employmentType}
        >
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="selfemployed">Self-employed</option>
          <option value="other">Other</option>
        </FormSelect>
        <FormError message={errors.employmentType} />
      </div>

      {/* Years Employed */}
      <div>
        <FormLabel required>Years with Current Employer</FormLabel>
        <FormInput
          required
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={form.yearsEmployed === 0 ? '' : String(form.yearsEmployed)}
          placeholder="e.g., 3"
          onChange={(e) => onFieldChange('yearsEmployed', Number(sanitizeDigits(e.target.value, 2)) || 0)}
          error={errors.yearsEmployed}
        />
        <FormError message={errors.yearsEmployed} />
      </div>
    </>
  )
}
