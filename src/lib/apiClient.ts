// Centralizes how every service resolves the backend origin and parses its responses, so all of
// them share one policy instead of each hand-rolling its own `import.meta.env.VITE_API_BASE_URL
// || '/api'` variant. This exists because in production (Vercel), a relative '/api/...' request
// has no matching serverless function and falls through to vercel.json's SPA catch-all rewrite,
// which returns index.html (200 OK, content-type text/html) instead of JSON from the Express
// backend - previously surfacing as "SyntaxError: Unexpected token '<' ... is not valid JSON".

// Resolves the backend origin from VITE_API_BASE_URL (e.g. "https://your-backend.example.com",
// no trailing slash, and WITHOUT an "/api" suffix - callers already include "/api/..." in the
// path they pass to apiUrl()). When unset, requests fall back to a relative path: correct in
// local dev (Vite's server.proxy in vite.config.ts forwards '/api' to the local Express server)
// but only correct in production if something else (e.g. a Vercel rewrite) also proxies '/api'
// to the real backend - which is not currently configured. See README/.env.example for the
// required Vercel Production/Preview configuration.
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/+$/, '')
  }
  return ''
}

// Builds a full request URL for a backend path (path should start with "/api/..."), avoiding
// duplicate slashes whether or not a base URL is configured.
export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

// Thrown when a response cannot be treated as the JSON the caller expected - most notably when
// '/api/...' was answered by the frontend's own SPA instead of the backend.
export class ApiResponseError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

// Parses a fetch Response as JSON, but fails safely and legibly when the backend didn't actually
// answer, instead of letting response.json() throw a cryptic
// "SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON".
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    // Covers the actual production failure: an HTML document (Vercel's SPA fallback) is not
    // valid JSON, so response.json() throws a raw "SyntaxError: Unexpected token '<' ... is not
    // valid JSON". That message is confusing on its own - replace it with a clear, safe one.
    throw new ApiResponseError(
      'The server returned an unexpected response. The backend service may be unavailable or misconfigured.',
      response.status,
    )
  }
}
