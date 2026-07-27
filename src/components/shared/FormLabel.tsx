import type { LabelHTMLAttributes } from 'react'

interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export default function FormLabel({
  required = false,
  children,
  style,
  ...props
}: FormLabelProps) {
  return (
    <label
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.7rem',
        color: '#1A1A1A',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '6px',
        fontWeight: 600,
        ...style,
      }}
      {...props}
    >
      {children}
      {required && <span style={{ color: '#1A1A1A', marginLeft: '0.25rem' }}>*</span>}
    </label>
  )
}
