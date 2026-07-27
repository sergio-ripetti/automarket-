import PersonalDetailsSection from './sections/PersonalDetailsSection'
import EmploymentDetailsSection from './sections/EmploymentDetailsSection'
import FinancialDetailsSection from './sections/FinancialDetailsSection'
import DocumentUploadSection from './sections/DocumentUploadSection'
import ConsentSection from './sections/ConsentSection'
import type { FinancingForm, FinancingDocument } from '../../types'
import type { FinancingValidationErrors } from '../../lib/financingValidation'

export type UploadingFilesState = Map<string, { file: File; progress: number; uploaded: boolean }>

interface FinancingApplicationFormProps {
  form: FinancingForm
  errors: FinancingValidationErrors
  uploadingFiles: UploadingFilesState
  isSubmitting?: boolean
  onFieldChange: <K extends keyof FinancingForm>(field: K, value: FinancingForm[K]) => void
  onFilesSelected: (files: FileList) => void
  onDocumentTypeChange: (url: string, type: FinancingDocument['type']) => void
  onRemoveDocument: (url: string) => void
  onBack: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export default function FinancingApplicationForm({
  form,
  errors,
  uploadingFiles,
  isSubmitting = false,
  onFieldChange,
  onFilesSelected,
  onDocumentTypeChange,
  onRemoveDocument,
  onBack,
  onSubmit,
}: FinancingApplicationFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.25rem', padding: '2.5rem' }}>
        <h2 className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
          Complete Your Application
        </h2>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', marginBottom: '2rem' }}>
          All starred fields are required to process your application.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <PersonalDetailsSection
            form={form}
            errors={errors}
            onFieldChange={onFieldChange}
          />

          <EmploymentDetailsSection
            form={form}
            errors={errors}
            onFieldChange={onFieldChange}
          />

          <FinancialDetailsSection
            form={form}
            errors={errors}
            onFieldChange={onFieldChange}
          />

          <DocumentUploadSection
            documents={form.documents}
            uploadingFiles={uploadingFiles}
            onFilesSelected={onFilesSelected}
            onDocumentTypeChange={onDocumentTypeChange}
            onRemoveDocument={onRemoveDocument}
          />

          <ConsentSection
            creditHistoryConsent={form.creditHistoryConsent}
            error={errors.creditHistoryConsent}
            onConsent={(checked) => onFieldChange('creditHistoryConsent', checked)}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              flex: 1, height: '52px', backgroundColor: '#F2F2F0',
              border: '1px solid #E0E0DC', color: '#1A1A1A',
              fontFamily: 'Outfit', fontSize: '0.875rem', borderRadius: '0.75rem', cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 2, height: '52px', background: isSubmitting ? '#999' : '#1A1A1A', color: '#FFFFFF', fontFamily: 'Outfit', fontWeight: 700,
              fontSize: '0.9rem', letterSpacing: '0.04em',
              border: 'none', borderRadius: '0.75rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            Submit Application →
          </button>
        </div>
      </div>
    </form>
  )
}
