import { Upload, X } from 'lucide-react'
import { FormSelect } from '../../shared'
import type { FinancingDocument } from '../../../types'
import type { UploadingFilesState } from '../FinancingApplicationForm'

interface DocumentUploadSectionProps {
  documents: FinancingDocument[]
  uploadingFiles: UploadingFilesState
  onFilesSelected: (files: FileList) => void
  onDocumentTypeChange: (url: string, type: FinancingDocument['type']) => void
  onRemoveDocument: (url: string) => void
}

export default function DocumentUploadSection({
  documents,
  uploadingFiles,
  onFilesSelected,
  onDocumentTypeChange,
  onRemoveDocument,
}: DocumentUploadSectionProps) {
  return (
    <>
      {/* Documents Section — full width */}
      <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#1A1A1A', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          Supporting Documents
        </h3>
        <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#4A4A4A', marginBottom: '1.25rem' }}>
          Please upload the following documents to support your application
        </p>

        {/* Upload Area */}
        <div
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files) onFilesSelected(e.dataTransfer.files)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = 'rgba(29,78,216,0.6)'
            e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.06)'
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
            e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.03)'
          }}
          style={{
            border: '2px dashed rgba(29,78,216,0.3)',
            borderRadius: '1rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgba(29,78,216,0.03)',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '180px',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(29,78,216,0.6)'
            e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
            e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.03)'
          }}
        >
          <input
            type="file"
            multiple
            accept="image/*, application/pdf"
            onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
            style={{ display: 'none' }}
            id="doc-upload"
          />
          <label htmlFor="doc-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
            <Upload size={40} style={{ margin: '0 auto 1rem', color: '#C4FF00' }} />
            <p style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>
              Drop files here or click to browse
            </p>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              Images and PDFs accepted
            </p>
          </label>
        </div>

        {/* Uploading Files */}
        {uploadingFiles.size > 0 && (
          <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
            {Array.from(uploadingFiles.entries())
              .filter((entry): entry is [string, { file: File; progress: number; uploaded: boolean }] => entry[1]?.file instanceof File)
              .map(([fileId, { file, progress }]) => (
              <div key={fileId} style={{
                backgroundColor: '#E4EAF0',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
              }}>
                <div style={{
                  height: '80px',
                  backgroundColor: '#F2F2F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '3px',
                    backgroundColor: '#333333',
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: '#C4FF00',
                      width: `${progress}%`,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <p style={{color: "#0D1B2A", whiteSpace: 'nowrap'}}>
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Documents */}
        {documents.filter((doc) => doc && typeof doc.url === 'string' && typeof doc.filename === 'string').length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              {documents.filter((doc) => doc && typeof doc.url === 'string' && typeof doc.filename === 'string').length} document(s) uploaded
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {documents.filter((doc) => doc && typeof doc.url === 'string' && typeof doc.filename === 'string').map((doc) => (
                <div key={doc.url} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#E4EAF0', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{color: "#0D1B2A", whiteSpace: 'nowrap'}}>
                    {doc.filename}
                  </p>
                  <FormSelect
                    value={doc.type}
                    onChange={(e) => onDocumentTypeChange(doc.url, e.target.value as FinancingDocument['type'])}
                  >
                    <option value="passport_license">Passport/License</option>
                    <option value="visa_residency">Visa/Residency</option>
                    <option value="proof_of_address">Proof of Address</option>
                    <option value="payslip">Payslip</option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="other">Other</option>
                  </FormSelect>
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(doc.url)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgba(239,68,68,0.2)',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
