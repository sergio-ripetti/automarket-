// Pure, side-effect-free helpers backing the Sales attachment download proxy
// (GET /api/sales/:id/documents/download in server.js). Kept separate from server.js so
// they can be unit tested without booting the Express app or Firebase Admin.

// Only these hostnames are ever fetched by the download proxy - this is the sole SSRF
// defense, so it must stay an exact allowlist rather than a pattern/suffix match.
export const ALLOWED_DOWNLOAD_HOSTNAMES = new Set(['res.cloudinary.com']);

// Mirrors src/lib/salesService.ts's normalizeDocument() - duplicated (not imported) because
// salesService.ts is a TypeScript module used by the frontend build, while this file is
// plain JS consumed by server.js.
export function normalizeSaleDocument(doc) {
  if (typeof doc === 'string') {
    return { url: doc, publicId: '', resourceType: '', filename: undefined };
  }
  return doc && typeof doc === 'object' ? doc : null;
}

// Strips path separators, control characters, and other characters unsafe in a
// Content-Disposition filename or on Windows filesystems, and enforces a sane length.
export function sanitizeDownloadFilename(name, fallback) {
  if (!name || typeof name !== 'string') return fallback;
  const forbidden = new Set(['\\', '/', '"', '<', '>', ':', '|', '?', '*']);
  let cleaned = '';
  for (const ch of name) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || forbidden.has(ch)) continue;
    cleaned += ch;
  }
  cleaned = cleaned.trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  return cleaned.slice(0, 150);
}

export function extensionFromResourceType(resourceType, urlPathname) {
  const urlExt = (urlPathname.match(/\.([a-zA-Z0-9]{1,5})$/) || [])[1];
  if (urlExt) return `.${urlExt.toLowerCase()}`;
  if (resourceType === 'image') return '.jpg';
  return '.pdf';
}

/**
 * Validates that an attachment URL is safe to fetch: well-formed, HTTPS, and hosted on an
 * approved provider hostname. Returns { ok: true, parsedUrl } or { ok: false, error }.
 * @param {string} url
 */
export function validateAttachmentUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, error: 'Attachment has an invalid URL' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTPS attachment URLs are supported' };
  }
  if (!ALLOWED_DOWNLOAD_HOSTNAMES.has(parsedUrl.hostname)) {
    return { ok: false, error: 'Attachment host is not an approved provider' };
  }

  return { ok: true, parsedUrl };
}
