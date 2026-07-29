export {
  ALLOWED_DOWNLOAD_HOSTNAMES,
  sanitizeDownloadFilename,
  extensionFromResourceType,
  validateAttachmentUrl,
} from './saleDocumentDownload';

export interface NormalizedFinancingAttachment {
  url: string;
  filename?: string;
}

export declare function normalizeFinancingDocument(doc: unknown): NormalizedFinancingAttachment | null;
