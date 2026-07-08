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
        fontFamily: 'Outfit',
        fontSize: '0.7rem',
        color: '#1A1A1A',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'block',
        marginBottom: '6px',
      }}
      {...props}
    >
      {children}
      {required && <span style={{ color: '#D64545', marginLeft: '0.25rem' }}>*</span>}
    </label>
  )
}
