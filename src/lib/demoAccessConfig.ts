// Single source of truth for the public portfolio demo credentials shown in the Admin Login
// "Demo Access" modal. Intentionally read from environment variables (not hardcoded) so the
// credentials can be rotated without touching component code, and so this module can fail
// safely (no credentials shown) instead of ever falling back to a real admin account.

const rawEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL
const rawPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD

export const DEMO_ACCESS_EMAIL = typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail.trim() : null
export const DEMO_ACCESS_PASSWORD = typeof rawPassword === 'string' && rawPassword.trim() ? rawPassword.trim() : null

// True only when both env vars are set. The modal must show "Demo access is temporarily
// unavailable" rather than any credential when this is false - never fall back to a real account.
export function isDemoAccessConfigured(): boolean {
  return Boolean(DEMO_ACCESS_EMAIL && DEMO_ACCESS_PASSWORD)
}
