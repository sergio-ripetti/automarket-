// Financing-specific attachment normalization, backing the Financing download proxy
// (GET /api/financing/:id/documents/download in server.js). The generic, entity-agnostic
// pieces (hostname/URL validation, filename sanitization, extension inference) are NOT
// duplicated here - they are imported from saleDocumentDownload.js, which already implements
// them without any Sales-specific assumptions. Only the attachment-shape normalization differs,
// since Financing documents ({url, type, filename} - no publicId/resourceType) are a simpler,
// distinct shape from Sales' UploadedDocument.
export {
  ALLOWED_DOWNLOAD_HOSTNAMES,
  validateAttachmentUrl,
  sanitizeDownloadFilename,
  extensionFromResourceType,
} from './saleDocumentDownload.js';

/**
 * Mirrors src/types/index.ts's FinancingDocument shape ({ url, type, filename }), plus legacy
 * plain-string entries. Unlike Sales attachments, Financing documents never carry publicId/
 * resourceType at all - there is no Cloudinary Admin API cleanup path for Financing documents.
 */
export function normalizeFinancingDocument(doc) {
  if (typeof doc === 'string') {
    return { url: doc, filename: undefined };
  }
  return doc && typeof doc === 'object' && typeof doc.url === 'string' ? doc : null;
}
