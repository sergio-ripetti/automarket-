import { Upload, X, FileText, Download, TriangleAlert } from 'lucide-react'
import type { FormData } from '../../../../types/saleForm'
import { useFileAvailability } from '../../../../hooks/useFileAvailability'

interface DocumentsUploadSectionProps {
  form: FormData
  onFilesSelected: (files: FileList) => void
  onRemoveFile: (url: string) => void | Promise<void>
  deletingUrls?: Set<string>
}

export function DocumentsUploadSection({
  form,
  onFilesSelected,
  onRemoveFile,
  deletingUrls,
}: DocumentsUploadSectionProps) {
  const pdfUrls = form.uploadedDocuments.filter((doc) => /\.pdf($|\?)/i.test(doc.url)).map((doc) => doc.url)
  const availability = useFileAvailability(pdfUrls)

  return (
    <div className="admin-new-sale__documents-section">
      <h3
        className="admin-new-sale__documents-title">
        Documents & Photos
      </h3>
      <p
        className="admin-new-sale__documents-description">
        Upload vehicle photos, buyer's license, signed contracts or any other
        documents. Multiple files accepted.
      </p>

      <div
        className="admin-new-sale__upload-zone"
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('admin-new-sale__upload-zone--dragactive')
          if (e.dataTransfer.files) onFilesSelected(e.dataTransfer.files)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('admin-new-sale__upload-zone--dragactive')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('admin-new-sale__upload-zone--dragactive')
        }}
        onMouseEnter={(e) => {
          e.currentTarget.classList.add('admin-new-sale__upload-zone--dragactive')
        }}
        onMouseLeave={(e) => {
          e.currentTarget.classList.remove('admin-new-sale__upload-zone--dragactive')
        }}>
        <input
          type="file"
          multiple
          accept="image/jpeg, image/png, image/webp, application/pdf"
          onChange={(e) => {
            if (e.target.files) onFilesSelected(e.target.files)
            e.target.value = ''
          }}
          className="admin-new-sale__upload-input"
          id="unified-upload"
        />
        <label
          htmlFor="unified-upload"
          className="admin-new-sale__upload-label">
          <Upload
            size={40}
            className="admin-new-sale__upload-icon"
          />
          <p className="admin-new-sale__upload-text">
            Drop files here or click to browse
          </p>
          <p
            className="admin-new-sale__upload-hint">
            JPEG, PNG, WebP, or PDF – up to 10 files, 10MB each
          </p>
        </label>
      </div>

      {form.uploadingFiles.size > 0 && (
        <div
          className="admin-new-sale__upload-grid">
          {Array.from(form.uploadingFiles.entries()).map(
            ([fileId, { file, progress }]) => (
              <div
                key={fileId}
                className="admin-new-sale__file-card">
                <div
                  className="admin-new-sale__file-preview">
                  <div
                    className="admin-new-sale__file-progress-wrapper">
                    <div
                      className="admin-new-sale__file-progress-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span
                    className="admin-new-sale__file-progress-text">
                    {Math.round(progress)}%
                  </span>
                </div>
                <p
                  className="admin-new-sale__file-name">
                  {file.name}
                </p>
              </div>
            ),
          )}
        </div>
      )}

      {form.uploadedDocuments.length > 0 && (
        <div className="admin-new-sale__uploaded-documents">
          <p
            className="admin-new-sale__uploaded-count">
            {form.uploadedDocuments.length} file(s) uploaded
          </p>
          <div
            className="admin-new-sale__upload-grid">
            {form.uploadedDocuments.map((doc) => {
              const url = doc.url
              const filename = doc.filename || decodeURIComponent(url.split('/').pop() || 'file')
              const isPdf = /\.pdf($|\?)/i.test(url)
              const isUnavailable = isPdf && availability[url] === false
              const isDeleting = deletingUrls?.has(url) ?? false
              return (
                <div
                  key={url}
                  className="admin-new-sale__file-card"
                  style={{ opacity: isDeleting ? 0.6 : 1 }}>
                  {isUnavailable ? (
                    <div className="admin-new-sale__file-placeholder" style={{ color: '#EF4444', gap: '0.25rem', flexDirection: 'column' }}>
                      <TriangleAlert size={32} />
                      <span style={{ fontSize: '0.65rem' }}>File unavailable</span>
                    </div>
                  ) : isPdf ? (
                    <div className="admin-new-sale__file-placeholder">
                      <FileText size={40} />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={filename}
                      className="admin-new-sale__file-image"
                    />
                  )}
                  <p className="admin-new-sale__file-name">{filename}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(url)}
                    disabled={isDeleting}
                    aria-label={isDeleting ? `Deleting ${filename}...` : `Remove ${filename}`}
                    className="admin-new-sale__file-remove">
                    {isDeleting ? '…' : <X size={18} />}
                  </button>
                  {isUnavailable ? (
                    <p style={{ fontSize: '0.6rem', color: '#767676', textAlign: 'center', padding: '0.25rem' }}>
                      This file could not be retrieved
                    </p>
                  ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-new-sale__file-view">
                      View
                    </a>
                    <a
                      href={url}
                      download={filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-new-sale__file-view"
                      aria-label={`Download ${filename}`}>
                      <Download size={14} />
                    </a>
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
