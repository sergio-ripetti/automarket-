export type VehicleStatusTone = 'sale' | 'featured' | 'unavailable'

// Single shared tone palette for vehicle status badges (SALE / FEATURED / NOT AVAILABLE),
// used by both Admin Inventory and the public-facing vehicle cards so the two surfaces read
// as one visual system instead of independently-styled badges. SOLD is intentionally NOT part
// of this system - it stays its own diagonal ribbon treatment since it must remain visually
// dominant, not just another badge.
export const vehicleStatusTones: Record<VehicleStatusTone, { background: string; color: string; border: string }> = {
  sale: {
    background: 'linear-gradient(135deg, #8B1E1E 0%, #6B1414 100%)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.18)',
  },
  featured: {
    background: '#181818',
    color: '#D4AF6A',
    border: '1px solid rgba(212,175,106,0.45)',
  },
  unavailable: {
    background: 'rgba(13,13,13,0.72)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.2)',
  },
}
