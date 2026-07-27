// Determines how to visually present a stored document (thumbnail vs PDF icon vs generic icon).
// Never infers this from checking whether the URL merely *contains* the word "image" - that check
// is unreliable (a filename or folder segment can contain "image" regardless of actual file type).
export type DocumentKind = 'image' | 'pdf' | 'unknown'

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)($|\?)/i
const PDF_EXTENSION = /\.pdf($|\?)/i

export interface DocumentKindInput {
  mimeType?: string
  filename?: string
  url: string
}

// Priority: stored mimeType (most reliable when present) -> filename extension -> URL extension.
// A generic category label (e.g. Financing's "payslip"/"passport_license") is intentionally never
// consulted here - it describes what the document IS, not what file format it's stored in.
export function detectDocumentKind({ mimeType, filename, url }: DocumentKindInput): DocumentKind {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType === 'application/pdf') return 'pdf'
  }
  if (filename) {
    if (IMAGE_EXTENSIONS.test(filename)) return 'image'
    if (PDF_EXTENSION.test(filename)) return 'pdf'
  }
  if (IMAGE_EXTENSIONS.test(url)) return 'image'
  if (PDF_EXTENSION.test(url)) return 'pdf'
  return 'unknown'
}
