import type { InputHTMLAttributes } from 'react'
import '../../../pages/admin/AdminNewSale.css'

interface FormInputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  placeholder?: string
  helperText?: string
  fullWidth?: boolean
  fieldId?: string
  error?: string
  invalid?: boolean
}

/**
 * Reusable text/number input field with consistent styling and focus behavior
 */
export function FormInputField({
  label,
  required,
  placeholder,
  helperText,
  fullWidth = true,
  fieldId,
  error,
  invalid,
  ...inputProps
}: FormInputFieldProps) {
  const inputId = fieldId || inputProps.id
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={`admin-new-sale__field-wrapper ${!fullWidth ? 'admin-new-sale__field-wrapper--auto' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="admin-new-sale__label">
          {label} {required ? '*' : ''}
        </label>
      )}
      <input
        id={inputId}
        placeholder={placeholder}
        {...inputProps}
        aria-invalid={invalid || !!error}
        aria-describedby={errorId}
        className={`admin-new-sale__field ${invalid || error ? 'admin-new-sale__field--invalid' : ''}`}
        onFocus={(e) => {
          inputProps.onFocus?.(e)
        }}
        onBlur={(e) => {
          inputProps.onBlur?.(e)
        }}
      />
      {error && (
        <p id={errorId} className="admin-new-sale__error">
          {error}
        </p>
      )}
      {helperText && (
        <p className="admin-new-sale__helper-text">
          {helperText}
        </p>
      )}
    </div>
  )
}
