import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
  fullWidth?: boolean
}

// Reusable text input with optional label, icon, error message, and helper text for form validation feedback
export default function Input({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-#2E86AB">{icon}</div>}
        <input
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-gray-800/50 border border-gray-700 text-white
            placeholder:text-white/30
            focus:outline-none focus:border-#2E86AB focus:ring-2 focus:ring-#2E86AB/20
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
            disabled:bg-gray-900/30 disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-2 text-sm text-white/50">{helperText}</p>}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

// Reusable multi-line text input with optional label, error message, and helper text for form validation feedback
export function TextArea({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  ...props
}: TextAreaProps) {
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-gray-800/50 border border-gray-700 text-white
          placeholder:text-white/30 resize-none
          focus:outline-none focus:border-#2E86AB focus:ring-2 focus:ring-#2E86AB/20
          transition-all duration-200
          ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
          disabled:bg-gray-900/30 disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-2 text-sm text-white/50">{helperText}</p>}
    </div>
  )
}
