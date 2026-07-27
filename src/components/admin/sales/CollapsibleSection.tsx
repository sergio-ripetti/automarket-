import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import '../../../pages/admin/AdminNewSale.css'

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  headerId?: string
  contentId?: string
}

/**
 * Reusable collapsible section with consistent styling
 */
export function CollapsibleSection({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  headerId,
  contentId,
}: CollapsibleSectionProps) {
  return (
    <div className="admin-new-sale__section">
      <button
        id={headerId}
        type="button"
        onClick={onToggle}
        className="admin-new-sale__section-header"
        aria-expanded={expanded}
        aria-controls={contentId}>
        <div>
          {title}
          {subtitle && (
            <p className="admin-new-sale__section-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`admin-new-sale__chevron ${expanded ? 'admin-new-sale__chevron--expanded' : ''}`}
        />
      </button>
      {expanded && (
        <div id={contentId} className="admin-new-sale__section-body">
          {children}
        </div>
      )}
    </div>
  )
}
