import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DocumentUploadSection from '../DocumentUploadSection'
import type { FinancingDocument } from '../../../../types'
import type { UploadingFilesState } from '../../FinancingApplicationForm'

const noop = () => {}

describe('DocumentUploadSection - crash safety', () => {
  it('does not crash when an uploadingFiles entry has an undefined file', () => {
    const uploadingFiles: UploadingFilesState = new Map([
      ['orphan-id', { file: undefined as unknown as File, progress: 100, uploaded: true }],
    ])

    expect(() =>
      render(
        <DocumentUploadSection
          documents={[]}
          uploadingFiles={uploadingFiles}
          onFilesSelected={noop}
          onDocumentTypeChange={noop}
          onRemoveDocument={noop}
        />
      )
    ).not.toThrow()
  })

  it('renders the file name for a valid uploading File entry', () => {
    const validFile = new File(['content'], 'passport.pdf', { type: 'application/pdf' })
    const uploadingFiles: UploadingFilesState = new Map([
      ['valid-id', { file: validFile, progress: 50, uploaded: false }],
    ])

    render(
      <DocumentUploadSection
        documents={[]}
        uploadingFiles={uploadingFiles}
        onFilesSelected={noop}
        onDocumentTypeChange={noop}
        onRemoveDocument={noop}
      />
    )

    expect(screen.getByText('passport.pdf')).toBeInTheDocument()
  })

  it('does not render an orphaned entry with an undefined file, but still renders a valid sibling entry', () => {
    const validFile = new File(['content'], 'payslip.pdf', { type: 'application/pdf' })
    const uploadingFiles: UploadingFilesState = new Map([
      ['orphan-id', { file: undefined as unknown as File, progress: 100, uploaded: true }],
      ['valid-id', { file: validFile, progress: 50, uploaded: false }],
    ])

    render(
      <DocumentUploadSection
        documents={[]}
        uploadingFiles={uploadingFiles}
        onFilesSelected={noop}
        onDocumentTypeChange={noop}
        onRemoveDocument={noop}
      />
    )

    expect(screen.getByText('payslip.pdf')).toBeInTheDocument()
  })

  it('filters an invalid document entry (missing filename/url) out of the rendered and submitted list', () => {
    const documents = [
      { url: 'https://example.com/a.pdf', type: 'payslip' as const, filename: 'a.pdf' },
      { url: undefined, type: 'other', filename: undefined } as unknown as FinancingDocument,
    ]

    render(
      <DocumentUploadSection
        documents={documents}
        uploadingFiles={new Map()}
        onFilesSelected={noop}
        onDocumentTypeChange={noop}
        onRemoveDocument={noop}
      />
    )

    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    expect(screen.getByText('1 document(s) uploaded')).toBeInTheDocument()
  })

  it('remove-file button calls onRemoveDocument with the correct url', () => {
    const onRemoveDocument = vi.fn()
    const documents: FinancingDocument[] = [
      { url: 'https://example.com/a.pdf', type: 'payslip', filename: 'a.pdf' },
    ]

    render(
      <DocumentUploadSection
        documents={documents}
        uploadingFiles={new Map()}
        onFilesSelected={noop}
        onDocumentTypeChange={noop}
        onRemoveDocument={onRemoveDocument}
      />
    )

    screen.getByText('a.pdf')
    const removeButton = document.querySelector('button')
    expect(removeButton).toBeTruthy()
    fireEvent.click(removeButton!)
    expect(onRemoveDocument).toHaveBeenCalledWith('https://example.com/a.pdf')
  })
})
