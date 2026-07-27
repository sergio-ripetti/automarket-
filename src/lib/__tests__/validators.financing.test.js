import { describe, it, expect } from 'vitest'
import { validateFinancingSubmission } from '../validators.js'

describe('validateFinancingSubmission', () => {
  const validPayload = {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '+64 21 123 4567',
    licenseNumber: 'AB12345',
    income: '5000',
    monthlyExpenses: '2500',
    downPayment: 20,
    months: 36,
    employer: 'TechCorp Ltd',
    jobTitle: 'Developer',
    employmentType: 'fulltime',
    yearsEmployed: 5,
    carId: 'car-001',
    carTitle: 'Toyota Camry',
    documents: [
      {
        url: 'https://example.com/id.pdf',
        type: 'passport_license',
        filename: 'id.pdf',
      },
    ],
    creditHistoryConsent: true,
  }

  it('accepts valid payload', () => {
    expect(validateFinancingSubmission(validPayload)).toBeNull()
  })

  it('rejects missing firstName', () => {
    const payload = { ...validPayload, firstName: '' }
    expect(validateFinancingSubmission(payload)).toBeTruthy()
  })

  it('rejects missing lastName', () => {
    const payload = { ...validPayload, lastName: '' }
    expect(validateFinancingSubmission(payload)).toBeTruthy()
  })

  it('rejects invalid email', () => {
    const payload = { ...validPayload, email: 'invalid-email' }
    expect(validateFinancingSubmission(payload)).toContain('email')
  })

  it('rejects invalid NZ licence format', () => {
    const payload = { ...validPayload, licenseNumber: 'invalid' }
    expect(validateFinancingSubmission(payload)).toContain('licence')
  })

  it('rejects zero income', () => {
    const payload = { ...validPayload, income: '0' }
    expect(validateFinancingSubmission(payload)).toContain('Income')
  })

  it('rejects negative income', () => {
    const payload = { ...validPayload, income: '-100' }
    expect(validateFinancingSubmission(payload)).toContain('Income')
  })

  it('rejects negative expenses', () => {
    const payload = { ...validPayload, monthlyExpenses: '-500' }
    expect(validateFinancingSubmission(payload)).toContain('negative')
  })

  it('rejects expenses greater than income', () => {
    const payload = { ...validPayload, monthlyExpenses: '6000' }
    expect(validateFinancingSubmission(payload)).toContain('exceed')
  })

  it('rejects missing consent', () => {
    const payload = { ...validPayload, creditHistoryConsent: false }
    expect(validateFinancingSubmission(payload)).toContain('consent')
  })

  it('rejects invalid documents array', () => {
    const payload = { ...validPayload, documents: 'not-an-array' }
    expect(validateFinancingSubmission(payload)).toContain('array')
  })

  it('rejects document without URL', () => {
    const payload = {
      ...validPayload,
      documents: [
        {
          type: 'passport_license',
          filename: 'id.pdf',
        },
      ],
    }
    expect(validateFinancingSubmission(payload)).toContain('URL')
  })

  it('rejects document with non-HTTP URL', () => {
    const payload = {
      ...validPayload,
      documents: [
        {
          url: '/local/path.pdf',
          type: 'passport_license',
          filename: 'id.pdf',
        },
      ],
    }
    expect(validateFinancingSubmission(payload)).toContain('URL')
  })

  it('accepts valid NZ licence formats', () => {
    const formats = ['AB12345', 'CD123456']
    formats.forEach((license) => {
      const payload = { ...validPayload, licenseNumber: license }
      expect(validateFinancingSubmission(payload)).toBeNull()
    })
  })

  it('accepts valid emails', () => {
    const emails = [
      'test@example.com',
      'user.name@domain.co.nz',
      'a@b.co',
    ]
    emails.forEach((email) => {
      const payload = { ...validPayload, email }
      expect(validateFinancingSubmission(payload)).toBeNull()
    })
  })

  it('rejects non-object payload', () => {
    expect(validateFinancingSubmission(null)).toBeTruthy()
    expect(validateFinancingSubmission('string')).toBeTruthy()
    expect(validateFinancingSubmission([])).toBeTruthy()
  })

  it('rejects missing car selection', () => {
    const payload = { ...validPayload, carId: undefined, manualPrice: undefined }
    expect(validateFinancingSubmission(payload)).toContain('Car')
  })

  it('accepts manualPrice when carId missing', () => {
    const payload = {
      ...validPayload,
      carId: undefined,
      manualPrice: '30000',
    }
    expect(validateFinancingSubmission(payload)).toBeNull()
  })
})
