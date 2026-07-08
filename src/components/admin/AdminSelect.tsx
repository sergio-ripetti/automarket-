import type { SelectHTMLAttributes, ReactNode } from 'react'

interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
}

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23767676' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")"

export default function AdminSelect({
  label,
  error,
  helperText,
  options,
  className = '',
  ...props
}: AdminSelectProps) {
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
      <select
        className={className}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${error ? '#D64545' : '#E0E0DC'}`,
          borderRadius: '0.625rem',
          padding: '0.875rem 1rem',
          paddingRight: '2.5rem',
          color: '#1A1A1A',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          outline: 'none',
          transition: 'all 0.2s ease',
          appearance: 'none',
          backgroundImage: CHEVRON,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          cursor: 'pointer',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? '#D64545' : '#C4FF00'
          e.currentTarget.style.boxShadow = error ? 'none' : '0 0 0 3px rgba(196,255,0,0.1)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#D64545' : '#E0E0DC'
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
