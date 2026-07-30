// Maps stored vehicle colour values (hex codes from the colour picker, or legacy plain-text
// names already saved in Firestore) to a human-readable label, without rewriting the stored
// value. The raw value stays available for the swatch and tooltip - only the display label
// changes.

interface NamedColor {
  name: string
  r: number
  g: number
  b: number
}

const NAMED_COLORS: NamedColor[] = [
  { name: 'White', r: 255, g: 255, b: 255 },
  { name: 'Black', r: 0, g: 0, b: 0 },
  { name: 'Grey', r: 128, g: 128, b: 128 },
  { name: 'Silver', r: 192, g: 192, b: 192 },
  { name: 'Red', r: 255, g: 0, b: 0 },
  { name: 'Blue', r: 0, g: 0, b: 255 },
  { name: 'Green', r: 0, g: 128, b: 0 },
  { name: 'Yellow', r: 255, g: 255, b: 0 },
  { name: 'Orange', r: 255, g: 165, b: 0 },
  { name: 'Purple', r: 128, g: 0, b: 128 },
  { name: 'Brown', r: 165, g: 42, b: 42 },
]

// A colour within this RGB distance of a named entry is considered "close enough" to share
// that name (e.g. off-white shades like #f5f5f5 read as White). Anything further away is an
// unrecognized custom colour rather than a mislabeled near-match.
const MATCH_THRESHOLD = 45

function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim())
  if (!match) return null
  let hex = match[1].toLowerCase()
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  return hex
}

function nearestNamedColor(hex: string): string | null {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  let closest: string | null = null
  let closestDistance = Infinity
  for (const candidate of NAMED_COLORS) {
    const distance = Math.sqrt(
      (r - candidate.r) ** 2 + (g - candidate.g) ** 2 + (b - candidate.b) ** 2,
    )
    if (distance < closestDistance) {
      closestDistance = distance
      closest = candidate.name
    }
  }
  return closestDistance <= MATCH_THRESHOLD ? closest : null
}

// Returns a human-readable colour name for display. Hex values (shorthand or full, any case)
// are matched against a small named palette by nearest RGB distance; unrecognized hex values
// fall back to "Custom colour" rather than the raw code. Values that aren't hex (legacy records
// already storing a plain name like "Silver") are returned as-is. Missing/invalid input falls
// back to "Unknown colour".
export function getVehicleColourName(value: string | null | undefined): string {
  if (value == null) return 'Unknown colour'
  const trimmed = value.trim()
  if (!trimmed) return 'Unknown colour'

  const hex = normalizeHex(trimmed)
  if (!hex) {
    // Looks like it was meant to be a hex code but isn't a valid one.
    if (trimmed.startsWith('#')) return 'Unknown colour'
    return trimmed
  }

  return nearestNamedColor(hex) ?? 'Custom colour'
}
