import type { LabelHTMLAttributes } from 'react'

interface AdminLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export default function AdminLabel({
  required = false,
  children,
  className = '',
  ...props
}: AdminLabelProps) {
  return (
    <label
      className={className}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.7rem',
        color: '#767676',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'block',
        marginBottom: '6px',
      }}
      {...props}
    >
      {children}
      {required && <span style={{ color: '#B0B0B0', marginLeft: '0.25rem' }}>*</span>}
    </label>
  )
}
