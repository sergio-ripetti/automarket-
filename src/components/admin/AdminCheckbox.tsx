import type { InputHTMLAttributes } from 'react'

interface AdminCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function AdminCheckbox({
  label,
  className = '',
  ...props
}: AdminCheckboxProps) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <div style={{
        position: 'relative',
        width: '18px',
        height: '18px',
        flexShrink: 0,
      }}>
        <input
          type="checkbox"
          className={className}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            cursor: 'pointer',
            opacity: 0,
            zIndex: 1,
          }}
          {...props}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          width: '18px',
          height: '18px',
          border: `1.5px solid ${props.checked ? '#C4FF00' : '#E0E0DC'}`,
          borderRadius: '0.375rem',
          backgroundColor: props.checked ? '#C4FF00' : '#FFFFFF',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {props.checked && (
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span style={{
          fontFamily: 'Outfit',
          fontSize: '0.875rem',
          color: '#1A1A1A',
          fontWeight: 500,
        }}>
          {label}
        </span>
      )}
    </label>
  )
}
