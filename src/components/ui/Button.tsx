import type { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#0D1B2A] text-white font-semibold hover:bg-[#2E86AB] active:opacity-90 transition-colors',
  secondary: 'bg-[#2E86AB] text-white hover:bg-[#256E8C] active:bg-[#1E5A78] transition-colors',
  outline: 'border-2 border-[#2E86AB] text-[#2E86AB] hover:bg-[#2E86AB]/10 active:bg-[#2E86AB]/20',
  ghost: 'text-[#4A6070] hover:text-[#0D1B2A] hover:bg-[#E4EAF0] active:bg-[#C8D8E4]',
  danger: 'bg-[#DC2626] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D] transition-colors',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2.5 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl',
}

// Reusable button component supporting style variants, sizes, loading spinner, and optional icon
export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  icon,
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && !loading && icon}
      {children}
    </button>
  )
}
