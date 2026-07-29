import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'dark'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[#0D1B2A]/50 text-[#0D1B2A]',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  info: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  gold: 'bg-[#C4FF00] text-[#1A1A1A] border border-[#C4FF00]',
  // Solid, opaque, high-contrast - deliberately distinct from `danger` (Sale) and `gold`
  // (Featured) so a SOLD badge can never be mistaken for either, and reads clearly against
  // both light card backgrounds and the dark image overlay.
  dark: 'bg-[#1A1A1A] text-white border border-white/20',
}

// Small pill-shaped label used to display status/tags (e.g. Sale, Featured) with semantic color variants
export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1 rounded-full
        text-xs font-medium font-poppins tracking-wide uppercase
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

// Wraps multiple Badge elements in a flex container with consistent spacing
export function BadgeGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap gap-2 ${className}`}>{children}</div>
}
