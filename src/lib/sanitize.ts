// Recursively strips undefined values (replacing with null) and normalizes NaN to 0 so nested objects/arrays are safe to write to Firestore
export function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined || obj === null) return null
  if (typeof obj === 'number') return isNaN(obj) ? 0 : obj
  if (typeof obj === 'string') return obj
  if (typeof obj === 'boolean') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key]
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val)
      } else {
        result[key] = null
      }
    }
    return result
  }
  return obj
}
