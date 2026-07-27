/**
 * Pure validation and normalization functions for Financing form.
 * All validators receive values and return normalized values, booleans or error objects.
 */

import type { FinancingForm } from '../types'

/**
 * Errors for each form field.
 */
export type FinancingValidationErrors = Partial<Record<keyof FinancingForm, string>>

/**
 * Check if email format is valid.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Check if value is a valid NZ driver licence format.
 * Format: 2 uppercase letters + 5-6 digits (e.g., AB12345)
 */
export function isValidNZLicence(licenseNumber: string): boolean {
  return /^[A-Z]{2}\d{5,6}$/.test(licenseNumber)
}

/**
 * Normalize phone input by trimming whitespace.
 */
export function normalizePhoneInput(phone: string): string {
  return phone.trim()
}

/**
 * Normalize licence input by trimming and converting to uppercase.
 */
export function normalizeLicenceInput(licence: string): string {
  return licence.trim().toUpperCase()
}

/**
 * Normalize numeric input by parsing as number or returning 0.
 */
export function normalizeNumericInput(value: string): number {
  const parsed = Number(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Validate the complete Financing form.
 * Returns an object with field names as keys and error messages as values.
 * If no errors, returns an empty object.
 */
export function validateFinancingForm(form: FinancingForm): FinancingValidationErrors {
  const errors: FinancingValidationErrors = {}

  // Personal info
  if (!form.firstName.trim()) {
    errors.firstName = 'Required'
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Required'
  }

  if (!form.email.trim()) {
    errors.email = 'Required'
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Invalid email'
  }

  if (!form.phone.trim()) {
    errors.phone = 'Required'
  }

  // Licence
  if (!form.licenseNumber.trim()) {
    errors.licenseNumber = 'Required'
  } else if (!isValidNZLicence(form.licenseNumber)) {
    errors.licenseNumber = 'Invalid NZ licence format (e.g., AB12345)'
  }

  // Financial
  if (!form.income.trim()) {
    errors.income = 'Required'
  } else if (Number(form.income) <= 0) {
    errors.income = 'Income must be greater than zero'
  }

  if (!form.monthlyExpenses.trim()) {
    errors.monthlyExpenses = 'Required'
  } else if (Number(form.monthlyExpenses) > Number(form.income)) {
    errors.monthlyExpenses = 'Monthly expenses cannot exceed income'
  }

  // Employment
  if (!form.employer.trim()) {
    errors.employer = 'Required'
  }

  if (!form.jobTitle.trim()) {
    errors.jobTitle = 'Required'
  }

  if (form.yearsEmployed === 0) {
    errors.yearsEmployed = 'Required'
  }

  // Consent
  if (!form.creditHistoryConsent) {
    errors.creditHistoryConsent = 'You must consent to a credit check'
  }

  return errors
}

/**
 * Check if the form has no validation errors.
 */
export function isFinancingFormValid(errors: FinancingValidationErrors): boolean {
  return Object.keys(errors).length === 0
}
