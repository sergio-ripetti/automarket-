import { formatNZD } from '../../../../lib/formatting'
import { sanitizeDigits } from '../../../../lib/numericInput'
import { CollapsibleSection } from '../CollapsibleSection'
import { FormInputField } from '../FormInputField'
import type { FormData } from '../../../../types/saleForm'

interface OrcSectionProps {
  form: FormData
  expanded: boolean
  orcTotal: number
  onToggle: () => void
  onFormChange: (updater: (f: FormData) => FormData) => void
}

export function OrcSection({
  form,
  expanded,
  orcTotal,
  onToggle,
  onFormChange,
}: OrcSectionProps) {
  return (
    <CollapsibleSection
      title="ORC - On Road Costs (Optional)"
      subtitle="Typical range: NZ$300 - NZ$650"
      expanded={expanded}
      onToggle={onToggle}>
      <div>
        <div
          className="admin-new-sale__checkbox-group">
          <label
            className="admin-new-sale__checkbox-label">
            <input
              type="checkbox"
              checked={form.orcIncluded}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcIncluded: e.target.checked,
                }))
              }
            />
            <span>
              ORC Included in Price
            </span>
          </label>
          <label
            className="admin-new-sale__checkbox-label">
            <input
              type="checkbox"
              checked={form.driveAwayPrice}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  driveAwayPrice: e.target.checked,
                }))
              }
            />
            <span>
              Drive Away Price
            </span>
          </label>
        </div>

        {!form.orcIncluded && (
          <div
            className="admin-new-sale__grid">
            <FormInputField
              label="WoF (NZD)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={form.orcWof === 0 ? '' : String(form.orcWof)}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcWof: Math.min(9999, Number(sanitizeDigits(e.target.value, 4)) || 0),
                }))
              }
            />
            <div>
              <label
                className="admin-new-sale__label">
                Registration (NZD)
              </label>
              <div
                className="admin-new-sale__registration-grid">
                <select
                  value={form.orcRegistrationMonths}
                  onChange={(e) =>
                    onFormChange((f) => ({
                      ...f,
                      orcRegistrationMonths: Number(e.target.value) as
                        | 6
                        | 12,
                    }))
                  }
                  className="admin-new-sale__select">
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
                <FormInputField
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={form.orcRegistration === 0 ? '' : String(form.orcRegistration)}
                  onChange={(e) =>
                    onFormChange((f) => ({
                      ...f,
                      orcRegistration: Number(sanitizeDigits(e.target.value, 5)) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <FormInputField
              label="Grooming/Detailing (NZD)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={form.orcGrooming === 0 ? '' : String(form.orcGrooming)}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcGrooming: Number(sanitizeDigits(e.target.value, 5)) || 0,
                }))
              }
            />
            <FormInputField
              label="Ownership Transfer (NZD)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={form.orcOwnershipTransfer === 0 ? '' : String(form.orcOwnershipTransfer)}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcOwnershipTransfer: Number(sanitizeDigits(e.target.value, 5)) || 0,
                }))
              }
            />
            <FormInputField
              label="Mechanical Inspection (NZD)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={form.orcMechanicalInspection === 0 ? '' : String(form.orcMechanicalInspection)}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcMechanicalInspection: Number(sanitizeDigits(e.target.value, 5)) || 0,
                }))
              }
            />
            <FormInputField
              label="Other Cost Label"
              placeholder="e.g., Inspection"
              maxLength={60}
              value={form.orcOtherLabel}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcOtherLabel: e.target.value,
                }))
              }
            />
            <FormInputField
              label="Other Cost Amount (NZD)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={form.orcOtherAmount === 0 ? '' : String(form.orcOtherAmount)}
              onChange={(e) =>
                onFormChange((f) => ({
                  ...f,
                  orcOtherAmount: Number(sanitizeDigits(e.target.value, 6)) || 0,
                }))
              }
            />
          </div>
        )}

        <div
          className="admin-new-sale__orc-total">
          <p
            className="admin-new-sale__summary-label">
            ORC Total
          </p>
          <p
            className="font-bebas admin-new-sale__orc-total-value">
            {formatNZD(orcTotal)}
          </p>
        </div>
      </div>
    </CollapsibleSection>
  )
}
