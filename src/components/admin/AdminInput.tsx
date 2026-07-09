import type { InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
}

export default function AdminInput({
  label,
  error,
  helperText,
  icon,
  className = '',
  ...props
}: AdminInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? 'rgba(239,68,68,0.85)'
    : isFocused
    ? '#1A1A1A'
    : '#E0E0DC'

  const borderWidth = error || isFocused ? '2px' : '1px'

  return (
    <div>
      {label && (
        <label style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.7rem',
          color: '#767676',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'block',
          marginBottom: '6px',
        }}>
          {label}
          {props.required && <span style={{ color: '#B0B0B0', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#767676',
          }}>
            {icon}
          </div>
        )}
        <input
          className={className}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `${borderWidth} solid ${borderColor}`,
            borderRadius: 0,
            padding: icon ? '0.75rem 0 0.5rem 1.75rem' : '0.75rem 0 0.5rem 0',
            color: '#1A1A1A',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
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
          placeholder={props.placeholder}
          {...props}
        />
      </div>
      {error && (
        <p style={{
          marginTop: '0.3rem',
          fontSize: '0.7rem',
          color: 'rgba(239,68,68,0.85)',
          fontFamily: 'Outfit',
        }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{
          marginTop: '0.3rem',
          fontSize: '0.7rem',
          color: '#767676',
          fontFamily: 'Outfit',
        }}>
          {helperText}
        </p>
      )}
    </div>
  )
}
