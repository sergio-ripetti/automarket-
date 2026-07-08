import type { InputHTMLAttributes, ReactNode } from 'react'

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
  return (
    <div>
      {label && (
        <label style={{
          fontFamily: 'Outfit',
          fontSize: '0.7rem',
          color: '#1A1A1A',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'block',
          marginBottom: '6px',
        }}>
          {label}
          {props.required && <span style={{ color: '#D64545', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '0.75rem',
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
            backgroundColor: '#FFFFFF',
            border: `1px solid ${error ? '#D64545' : '#E0E0DC'}`,
            borderRadius: '0.625rem',
            padding: icon ? '0.875rem 1rem 0.875rem 2.5rem' : '0.875rem 1rem',
            color: '#1A1A1A',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? '#D64545' : '#C4FF00'
            e.currentTarget.style.boxShadow = error ? 'none' : '0 0 0 3px rgba(196,255,0,0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#D64545' : '#E0E0DC'
            e.currentTarget.style.boxShadow = 'none'
          }}
          placeholder={props.placeholder}
          {...props}
        />
      </div>
      {error && (
        <p style={{
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#D64545',
          fontFamily: 'Outfit',
        }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#767676',
          fontFamily: 'Outfit',
        }}>
          {helperText}
        </p>
      )}
    </div>
  )
}
