import { downloadProtectedDocument, ProtectedDocumentDownloadError } from './downloadProtectedDocument'

export class SaleDocumentDownloadError extends ProtectedDocumentDownloadError {}

// Forces a real file download for a Sales attachment by streaming it through the protected
// backend proxy (GET /api/sales/:saleId/documents/download?url=...) rather than navigating to
// the Cloudinary URL directly, which many browsers refuse to force-download cross-origin.
// The backend never fetches the given url blindly - it only proxies it if that exact url is
// already present in the sale's own stored attachments.
export async function downloadSaleDocument(saleId: string, url: string, suggestedFilename?: string): Promise<void> {
  try {
    await downloadProtectedDocument(
      `sales/${encodeURIComponent(saleId)}/documents/download`,
      url,
      suggestedFilename,
      'sale-document'
    )
  } catch (err) {
    if (err instanceof ProtectedDocumentDownloadError) {
      throw new SaleDocumentDownloadError(err.message)
    }
    throw err
  }
}
