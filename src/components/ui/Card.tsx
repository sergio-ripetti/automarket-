import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  interactive?: boolean
}

// Base container component for card-style layouts, with optional hover and interactive (clickable) styling
export function Card({ children, className = '', hoverable = false, interactive = false }: CardProps) {
  return (
    <div
      className={`
        bg-gray-900 border border-white/5 rounded-xl
        ${hoverable ? 'hover:border-#C4FF00/30 hover:shadow-lg transition-all duration-200 hover:shadow-black/20' : ''}
        ${interactive ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

// Top section of a Card, typically used for titles, separated by a bottom border
export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/5 ${className}`}>
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

// Main content section of a Card
export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

// Bottom section of a Card, typically used for action buttons, separated by a top border
export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-white/5 flex gap-3 ${className}`}>
      {children}
    </div>
  )
}
