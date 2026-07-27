import { describe, it, expect } from 'vitest'
import { sanitizeDigits } from '../numericInput'

describe('sanitizeDigits', () => {
  it('keeps digits only', () => {
    expect(sanitizeDigits('12345')).toBe('12345')
  })

  it('rejects letters', () => {
    expect(sanitizeDigits('abc123def')).toBe('123')
  })

  it('rejects e and E (scientific notation)', () => {
    expect(sanitizeDigits('3e10')).toBe('310')
    expect(sanitizeDigits('3E10')).toBe('310')
  })

  it('rejects plus and minus signs', () => {
    expect(sanitizeDigits('+123')).toBe('123')
    expect(sanitizeDigits('-123')).toBe('123')
  })

  it('rejects decimal points', () => {
    expect(sanitizeDigits('12.34')).toBe('1234')
  })

  it('never produces scientific notation from a malicious paste', () => {
    const malicious = '3.333333333333333e+102'
    const result = sanitizeDigits(malicious, 9)
    expect(result).not.toMatch(/[eE.+-]/)
    expect(Number.isFinite(Number(result))).toBe(true)
  })

  it('truncates to maxDigits', () => {
    expect(sanitizeDigits('1234567890', 6)).toBe('123456')
  })

  it('applies the same truncation to pasted content as typed content', () => {
    // A "paste" and "type" both arrive through the same onChange value - the sanitizer
    // is applied uniformly regardless of input origin.
    const pasted = sanitizeDigits('999999999999', 6)
    const typed = sanitizeDigits('999999999999', 6)
    expect(pasted).toBe(typed)
    expect(pasted).toBe('999999')
  })

  it('returns empty string for fully non-numeric input', () => {
    expect(sanitizeDigits('abc')).toBe('')
  })
})
