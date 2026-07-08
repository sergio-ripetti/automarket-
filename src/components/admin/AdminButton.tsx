import type { ButtonHTMLAttributes } from 'react'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export default function AdminButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className = '',
  ...props
}: AdminButtonProps) {
  const baseStyles = {
    fontFamily: 'Outfit',
    fontWeight: 600,
    border: 'none',
    borderRadius: '0.625rem',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontSize: '0.7rem',
  }

  const sizeStyles = {
    sm: { padding: '0.5rem 1rem', minHeight: '32px' },
    md: { padding: '0.875rem 1.5rem', minHeight: '40px' },
    lg: { padding: '1rem 2rem', minHeight: '48px' },
  }[size]

  const variantStyles = {
    primary: {
      backgroundColor: '#C4FF00',
      color: '#1A1A1A',
      '&:hover': { backgroundColor: '#B8E600', boxShadow: '0 4px 12px rgba(196,255,0,0.3)' },
      '&:active': { backgroundColor: '#A3CC00' },
      '&:disabled': { backgroundColor: '#E0E0DC', color: '#999999' },
    },
    secondary: {
      backgroundColor: 'transparent',
      border: '1px solid #E0E0DC',
      color: '#1A1A1A',
      '&:hover': { backgroundColor: '#F5F5F0', borderColor: '#C4FF00' },
      '&:active': { backgroundColor: '#EBEBEB' },
      '&:disabled': { borderColor: '#E0E0DC', color: '#999999' },
    },
    danger: {
      backgroundColor: '#D64545',
      color: '#FFFFFF',
      '&:hover': { backgroundColor: '#C13939', boxShadow: '0 4px 12px rgba(214,69,69,0.3)' },
      '&:active': { backgroundColor: '#AD3030' },
      '&:disabled': { backgroundColor: '#E0E0DC', color: '#999999' },
    },
    dark: {
      backgroundColor: '#1A1A1A',
      color: '#FFFFFF',
      '&:hover': { backgroundColor: '#0D0D0D', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
      '&:active': { backgroundColor: '#000000' },
      '&:disabled': { backgroundColor: '#E0E0DC', color: '#999999' },
    },
  }[variant]

  const buttonStyles = {
    ...baseStyles,
    ...sizeStyles,
    backgroundColor: variantStyles.backgroundColor,
    border: variantStyles.border || 'none',
    color: variantStyles.color,
    opacity: disabled || isLoading ? 0.6 : 1,
  }

  // Merge user-provided styles without letting them override button styles
  const mergedStyles = {
    ...buttonStyles,
    ...(props.style || {}),
  } as React.CSSProperties

  const { style, ...restProps } = props

  return (
    <button
      className={className}
      style={mergedStyles}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          const target = e.currentTarget
          if (variant === 'primary') {
            target.style.backgroundColor = '#B8E600'
            target.style.boxShadow = '0 4px 12px rgba(196,255,0,0.3)'
          } else if (variant === 'danger') {
            target.style.backgroundColor = '#C13939'
            target.style.boxShadow = '0 4px 12px rgba(214,69,69,0.3)'
          } else if (variant === 'dark') {
            target.style.backgroundColor = '#0D0D0D'
            target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
          } else if (variant === 'secondary') {
            target.style.backgroundColor = '#F5F5F0'
            target.style.borderColor = '#C4FF00'
          }
        }
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget
        if (variant === 'primary') {
          target.style.backgroundColor = '#C4FF00'
          target.style.boxShadow = 'none'
        } else if (variant === 'danger') {
          target.style.backgroundColor = '#D64545'
          target.style.boxShadow = 'none'
        } else if (variant === 'dark') {
          target.style.backgroundColor = '#1A1A1A'
          target.style.boxShadow = 'none'
        } else if (variant === 'secondary') {
          target.style.backgroundColor = 'transparent'
          target.style.borderColor = '#E0E0DC'
        }
      }}
      {...restProps}
    >
      {isLoading && <span>⏳</span>}
      {children}
    </button>
  )
}
