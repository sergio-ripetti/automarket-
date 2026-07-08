import type { TextareaHTMLAttributes } from 'react'

interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export default function AdminTextarea({
  label,
  error,
  helperText,
  className = '',
  ...props
}: AdminTextareaProps) {
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
      <textarea
        className={className}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          border: `1px solid ${error ? '#D64545' : '#E0E0DC'}`,
          borderRadius: '0.625rem',
          padding: '0.875rem 1rem',
          color: '#1A1A1A',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          outline: 'none',
          transition: 'all 0.2s ease',
          resize: 'vertical',
          minHeight: '120px',
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
