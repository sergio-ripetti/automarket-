/**
 * Shared digit-only sanitization for controlled numeric-style text inputs.
 * Used instead of type="number" to prevent scientific notation, e/E, +/- and decimals
 * from ever entering form state - the sanitizer runs on every change (typed or pasted).
 */

// Strips everything except digits 0-9, then truncates to maxDigits if provided.
export function sanitizeDigits(value: string, maxDigits?: number): string {
  const digitsOnly = value.replace(/[^0-9]/g, '')
  return typeof maxDigits === 'number' ? digitsOnly.slice(0, maxDigits) : digitsOnly
}
