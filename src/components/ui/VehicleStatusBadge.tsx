import type { ComponentType } from 'react'
import { vehicleStatusTones, type VehicleStatusTone } from '../../lib/vehicleStatusTones'

interface VehicleStatusBadgeProps {
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  label: string
  tone: VehicleStatusTone
}

// Compact, icon + uppercase-text badge shared by Admin Inventory and public vehicle cards.
// Consistent font, weight, letter-spacing, radius, shadow and padding across every tone -
// only color/icon differ between SALE, FEATURED and NOT AVAILABLE.
export default function VehicleStatusBadge({ icon: Icon, label, tone }: VehicleStatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
      style={{
        ...vehicleStatusTones[tone],
        padding: '0.3rem 0.55rem',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        lineHeight: 1,
      }}>
      <Icon size={11} aria-hidden={true} />
      {label}
    </span>
  )
}
