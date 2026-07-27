import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidNZLicence,
  normalizePhoneInput,
  normalizeLicenceInput,
  normalizeNumericInput,
  validateFinancingForm,
  isFinancingFormValid,
} from '../financingValidation'
import type { FinancingForm } from '../../types'

const validForm: FinancingForm = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+64 21 123 4567',
  licenseNumber: 'AB12345',
  income: '5000',
  employer: 'TechCorp Ltd',
  jobTitle: 'Senior Developer',
  employmentType: 'fulltime',
  yearsEmployed: 5,
  monthlyExpenses: '2500',
  documents: [],
  creditHistoryConsent: true,
  downPayment: 20,
  months: 36,
}

describe('Financing Validation', () => {
  describe('isValidEmail', () => {
    it('accepts valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('john.smith@company.co.nz')).toBe(true)
      expect(isValidEmail('a+b@test.org')).toBe(true)
    })

    it('rejects invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@example')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidNZLicence', () => {
    it('accepts valid NZ licence formats', () => {
      expect(isValidNZLicence('AB12345')).toBe(true)
      expect(isValidNZLicence('CD123456')).toBe(true)
      expect(isValidNZLicence('ZZ99999')).toBe(true)
    })

    it('rejects lowercase letters', () => {
      expect(isValidNZLicence('ab12345')).toBe(false)
    })

    it('rejects wrong number of digits', () => {
      expect(isValidNZLicence('AB1234')).toBe(false) // only 4 digits
      expect(isValidNZLicence('AB1234567')).toBe(false) // 7 digits
    })

    it('rejects missing letters or numbers', () => {
      expect(isValidNZLicence('A12345')).toBe(false) // only 1 letter
      expect(isValidNZLicence('123456')).toBe(false) // no letters
      expect(isValidNZLicence('AB')).toBe(false) // no numbers
    })

    it('rejects empty string', () => {
      expect(isValidNZLicence('')).toBe(false)
    })
  })

  describe('normalizePhoneInput', () => {
    it('trims whitespace', () => {
      expect(normalizePhoneInput('  +64 21 123 4567  ')).toBe('+64 21 123 4567')
    })

    it('preserves formatted phone numbers', () => {
      expect(normalizePhoneInput('+64 21 123 4567')).toBe('+64 21 123 4567')
    })

    it('handles empty string', () => {
      expect(normalizePhoneInput('')).toBe('')
    })
  })

  describe('normalizeLicenceInput', () => {
    it('converts to uppercase', () => {
      expect(normalizeLicenceInput('ab12345')).toBe('AB12345')
    })

    it('trims whitespace', () => {
      expect(normalizeLicenceInput('  AB12345  ')).toBe('AB12345')
    })

    it('handles mixed case', () => {
      expect(normalizeLicenceInput('aB12345')).toBe('AB12345')
    })

    it('handles empty string', () => {
      expect(normalizeLicenceInput('')).toBe('')
    })
  })

  describe('normalizeNumericInput', () => {
    it('parses numeric strings', () => {
      expect(normalizeNumericInput('5000')).toBe(5000)
      expect(normalizeNumericInput('0')).toBe(0)
      expect(normalizeNumericInput('2500.50')).toBe(2500.5)
    })

    it('returns 0 for invalid numeric strings', () => {
      expect(normalizeNumericInput('not-a-number')).toBe(0)
      expect(normalizeNumericInput('')).toBe(0)
      expect(normalizeNumericInput('  ')).toBe(0)
    })

    it('handles negative numbers', () => {
      expect(normalizeNumericInput('-5000')).toBe(-5000)
    })
  })

  describe('validateFinancingForm - Required Fields', () => {
    it('requires first name', () => {
      const form = { ...validForm, firstName: '' }
      const errors = validateFinancingForm(form)
      expect(errors.firstName).toBe('Required')
    })

    it('requires last name', () => {
      const form = { ...validForm, lastName: '' }
      const errors = validateFinancingForm(form)
      expect(errors.lastName).toBe('Required')
    })

    it('requires email', () => {
      const form = { ...validForm, email: '' }
      const errors = validateFinancingForm(form)
      expect(errors.email).toBe('Required')
    })

    it('requires phone', () => {
      const form = { ...validForm, phone: '' }
      const errors = validateFinancingForm(form)
      expect(errors.phone).toBe('Required')
    })

    it('requires licence number', () => {
      const form = { ...validForm, licenseNumber: '' }
      const errors = validateFinancingForm(form)
      expect(errors.licenseNumber).toBe('Required')
    })

    it('requires income', () => {
      const form = { ...validForm, income: '' }
      const errors = validateFinancingForm(form)
      expect(errors.income).toBe('Required')
    })

    it('requires employer', () => {
      const form = { ...validForm, employer: '' }
      const errors = validateFinancingForm(form)
      expect(errors.employer).toBe('Required')
    })

    it('requires job title', () => {
      const form = { ...validForm, jobTitle: '' }
      const errors = validateFinancingForm(form)
      expect(errors.jobTitle).toBe('Required')
    })

    it('requires years employed to be non-zero', () => {
      const form = { ...validForm, yearsEmployed: 0 }
      const errors = validateFinancingForm(form)
      expect(errors.yearsEmployed).toBe('Required')
    })

    it('requires monthly expenses', () => {
      const form = { ...validForm, monthlyExpenses: '' }
      const errors = validateFinancingForm(form)
      expect(errors.monthlyExpenses).toBe('Required')
    })

    it('requires credit history consent', () => {
      const form = { ...validForm, creditHistoryConsent: false }
      const errors = validateFinancingForm(form)
      expect(errors.creditHistoryConsent).toBe('You must consent to a credit check')
    })
  })

  describe('validateFinancingForm - Format Validation', () => {
    it('validates email format', () => {
      const form = { ...validForm, email: 'invalid-email' }
      const errors = validateFinancingForm(form)
      expect(errors.email).toBe('Invalid email')
    })

    it('validates NZ licence format', () => {
      const form = { ...validForm, licenseNumber: 'invalid' }
      const errors = validateFinancingForm(form)
      expect(errors.licenseNumber).toBe('Invalid NZ licence format (e.g., AB12345)')
    })

    it('accepts lowercase licence and validates it', () => {
      const form = { ...validForm, licenseNumber: 'ab12345' }
      const errors = validateFinancingForm(form)
      expect(errors.licenseNumber).toBe('Invalid NZ licence format (e.g., AB12345)')
    })
  })

  describe('validateFinancingForm - Financial Validation', () => {
    it('rejects zero income', () => {
      const form = { ...validForm, income: '0' }
      const errors = validateFinancingForm(form)
      expect(errors.income).toBe('Income must be greater than zero')
    })

    it('rejects negative income', () => {
      const form = { ...validForm, income: '-1000' }
      const errors = validateFinancingForm(form)
      expect(errors.income).toBe('Income must be greater than zero')
    })

    it('accepts positive income', () => {
      const form = { ...validForm, income: '1' }
      const errors = validateFinancingForm(form)
      expect(errors.income).toBeUndefined()
    })

    it('rejects expenses greater than income', () => {
      const form = { ...validForm, income: '5000', monthlyExpenses: '6000' }
      const errors = validateFinancingForm(form)
      expect(errors.monthlyExpenses).toBe('Monthly expenses cannot exceed income')
    })

    it('accepts expenses equal to income', () => {
      const form = { ...validForm, income: '5000', monthlyExpenses: '5000' }
      const errors = validateFinancingForm(form)
      expect(errors.monthlyExpenses).toBeUndefined()
    })

    it('accepts expenses less than income', () => {
      const form = { ...validForm, income: '5000', monthlyExpenses: '2500' }
      const errors = validateFinancingForm(form)
      expect(errors.monthlyExpenses).toBeUndefined()
    })
  })

  describe('validateFinancingForm - Complete Form', () => {
    it('returns empty error object for valid form', () => {
      const errors = validateFinancingForm(validForm)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('returns multiple errors for multiple invalid fields', () => {
      const form = {
        ...validForm,
        firstName: '',
        email: 'invalid',
        income: '0',
        creditHistoryConsent: false,
      }
      const errors = validateFinancingForm(form)
      expect(errors.firstName).toBe('Required')
      expect(errors.email).toBe('Invalid email')
      expect(errors.income).toBe('Income must be greater than zero')
      expect(errors.creditHistoryConsent).toBe('You must consent to a credit check')
    })

    it('does not mutate the original form object', () => {
      const form = { ...validForm }
      const originalFirstName = form.firstName
      validateFinancingForm(form)
      expect(form.firstName).toBe(originalFirstName)
    })
  })

  describe('isFinancingFormValid', () => {
    it('returns true when no errors', () => {
      const errors = {}
      expect(isFinancingFormValid(errors)).toBe(true)
    })

    it('returns false when there are errors', () => {
      const errors = { firstName: 'Required' }
      expect(isFinancingFormValid(errors)).toBe(false)
    })

    it('returns false when multiple errors exist', () => {
      const errors = { firstName: 'Required', email: 'Invalid email' }
      expect(isFinancingFormValid(errors)).toBe(false)
    })
  })
})
