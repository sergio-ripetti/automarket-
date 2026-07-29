export declare const ALLOWED_DOWNLOAD_HOSTNAMES: Set<string>;

export interface NormalizedAttachment {
  url: string;
  publicId: string;
  resourceType: string;
  filename?: string;
}

export declare function normalizeSaleDocument(doc: unknown): NormalizedAttachment | null;
export declare function sanitizeDownloadFilename(name: string | undefined | null, fallback: string): string;
export declare function extensionFromResourceType(resourceType: string | undefined, urlPathname: string): string;
export declare function validateAttachmentUrl(
  url: string
): { ok: true; parsedUrl: URL } | { ok: false; error: string };
