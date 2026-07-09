import type { SelectHTMLAttributes } from 'react'
import { useState } from 'react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")"

export default function FormSelect({
  error,
  children,
  ...props
}: FormSelectProps) {
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? 'rgba(239,68,68,0.85)'
    : isFocused
    ? '#1A1A1A'
    : '#E0E0DC'

  const borderWidth = error || isFocused ? '2px' : '1px'

  return (
    <select
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: `${borderWidth} solid ${borderColor}`,
        borderRadius: 0,
        padding: '0.75rem 2.5rem 0.5rem 0',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem',
        color: '#1A1A1A',
        outline: 'none',
        transition: 'border-bottom-color 0.2s, border-width 0.2s',
        appearance: 'none',
        backgroundImage: CHEVRON,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0 center',
        cursor: 'pointer',
      }}
      onFocus={(e) => {
        setIsFocused(true)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        setIsFocused(false)
        props.onBlur?.(e)
      }}
      {...props}
    >
      {children}
    </select>
  )
}
