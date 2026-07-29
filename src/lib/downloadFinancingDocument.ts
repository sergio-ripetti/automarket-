import { downloadProtectedDocument, ProtectedDocumentDownloadError } from './downloadProtectedDocument'

export class FinancingDocumentDownloadError extends ProtectedDocumentDownloadError {}

// Forces a real file download for a Financing supporting document by streaming it through the
// protected backend proxy (GET /api/financing/:financingId/documents/download?url=...) rather
// than navigating to the Cloudinary URL directly. Mirrors downloadSaleDocument.ts exactly (both
// delegate to the same generic downloadProtectedDocument core) - only the endpoint path and
// fallback filename differ.
export async function downloadFinancingDocument(
  financingId: string,
  url: string,
  suggestedFilename?: string
): Promise<void> {
  try {
    await downloadProtectedDocument(
      `financing/${encodeURIComponent(financingId)}/documents/download`,
      url,
      suggestedFilename,
      'financing-document'
    )
  } catch (err) {
    if (err instanceof ProtectedDocumentDownloadError) {
      throw new FinancingDocumentDownloadError(err.message)
    }
    throw err
  }
}
