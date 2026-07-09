import type { InputHTMLAttributes } from 'react'
import { useState } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export default function FormInput({
  error,
  ...props
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? 'rgba(239,68,68,0.85)'
    : isFocused
    ? '#1A1A1A'
    : '#E0E0DC'

  const borderWidth = error || isFocused ? '2px' : '1px'

  return (
    <input
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: `${borderWidth} solid ${borderColor}`,
        borderRadius: 0,
        padding: '0.75rem 0 0.5rem 0',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem',
        color: '#1A1A1A',
        outline: 'none',
        transition: 'border-bottom-color 0.2s, border-width 0.2s',
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
    />
  )
}
