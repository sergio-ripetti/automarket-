import type { LabelHTMLAttributes } from 'react'

interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export default function FormLabel({
  required = false,
  children,
  ...props
}: FormLabelProps) {
  return (
    <label
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.7rem',
        color: '#767676',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
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
