import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { FormData } from '../../../../types/saleForm'
import { FormInputField } from '../FormInputField'
import { isValidNZLicence } from '../../../../lib/financingValidation'

interface BuyerInformationStepProps {
  form: FormData
  onFormChange: (updater: (f: FormData) => FormData) => void
  canNext: boolean
  onBack: () => void
  onNext: () => void
}

// Same phone-formatting behavior already used in Contact.tsx and CarDetail.tsx - keeps digits
// and common formatting characters (+, space, -, parens) so pasted numbers are sanitized but
// human-entered formatting is preserved.
function formatPhoneInput(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, '')
}

export function BuyerInformationStep({
  form,
  onFormChange,
  canNext,
  onBack,
  onNext,
}: BuyerInformationStepProps) {
  const licenceInvalid = form.buyerLicense.trim().length > 0 && !isValidNZLicence(form.buyerLicense.trim().toUpperCase())

  return (
    <div>
      <h2
        className="font-bebas admin-new-sale__page-heading">
        Buyer Information
      </h2>
      <div
        className="admin-new-sale__grid">
        <FormInputField
          fieldId="buyer-name"
          label="Full Name"
          required
          maxLength={80}
          value={form.buyerName}
          onChange={(e) =>
            onFormChange((f) => ({ ...f, buyerName: e.target.value }))
          }
        />
        <FormInputField
          fieldId="buyer-email"
          label="Email"
          type="email"
          required
          maxLength={100}
          value={form.buyerEmail}
          onChange={(e) =>
            onFormChange((f) => ({ ...f, buyerEmail: e.target.value }))
          }
        />
        <FormInputField
          fieldId="buyer-id-number"
          label="ID Number"
          required
          maxLength={20}
          placeholder="e.g. AB123456"
          value={form.buyerIdNumber}
          onChange={(e) =>
            onFormChange((f) => ({ ...f, buyerIdNumber: e.target.value }))
          }
        />
        <FormInputField
          fieldId="buyer-phone"
          label="Phone"
          type="tel"
          required
          maxLength={20}
          value={form.buyerPhone}
          onChange={(e) =>
            onFormChange((f) => ({ ...f, buyerPhone: formatPhoneInput(e.target.value) }))
          }
        />
        <FormInputField
          fieldId="buyer-license"
          label="Driver License"
          required
          maxLength={20}
          placeholder="e.g. AB12345"
          invalid={licenceInvalid}
          error={licenceInvalid ? 'Invalid NZ licence format (e.g., AB12345)' : undefined}
          value={form.buyerLicense}
          onChange={(e) =>
            onFormChange((f) => ({ ...f, buyerLicense: e.target.value.toUpperCase() }))
          }
        />
        <div className="admin-new-sale__grid--full">
          <FormInputField
            fieldId="buyer-address"
            label="Address"
            required
            maxLength={100}
            value={form.buyerAddress}
            onChange={(e) =>
              onFormChange((f) => ({ ...f, buyerAddress: e.target.value }))
            }
          />
        </div>
      </div>

      <div
        className="admin-new-sale__button-group">
        <button
          type="button"
          onClick={onBack}
          className="admin-new-sale__button--outline">
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className={`admin-new-sale__button--primary ${!canNext ? 'admin-new-sale__button--primary--disabled' : ''}`}
          style={{
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.5,
          }}>
          Next Step
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
