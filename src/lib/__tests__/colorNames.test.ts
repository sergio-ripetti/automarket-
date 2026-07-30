import { describe, it, expect } from 'vitest'
import { getVehicleColourName } from '../colorNames'

describe('getVehicleColourName', () => {
  it('matches a lowercase hex value', () => {
    expect(getVehicleColourName('#ffffff')).toBe('White')
  })

  it('matches an uppercase hex value', () => {
    expect(getVehicleColourName('#FFFFFF')).toBe('White')
  })

  it('expands and matches a shorthand hex value', () => {
    expect(getVehicleColourName('#fff')).toBe('White')
  })

  it('maps a near-white shade to White', () => {
    expect(getVehicleColourName('#f5f5f5')).toBe('White')
  })

  it('matches black', () => {
    expect(getVehicleColourName('#000000')).toBe('Black')
  })

  it('distinguishes grey from silver', () => {
    expect(getVehicleColourName('#808080')).toBe('Grey')
    expect(getVehicleColourName('#c0c0c0')).toBe('Silver')
  })

  it('matches red', () => {
    expect(getVehicleColourName('#ff0000')).toBe('Red')
  })

  it('matches blue', () => {
    expect(getVehicleColourName('#0000ff')).toBe('Blue')
  })

  it('matches green, yellow, orange, purple and brown', () => {
    expect(getVehicleColourName('#008000')).toBe('Green')
    expect(getVehicleColourName('#ffff00')).toBe('Yellow')
    expect(getVehicleColourName('#ffa500')).toBe('Orange')
    expect(getVehicleColourName('#800080')).toBe('Purple')
    expect(getVehicleColourName('#a52a2a')).toBe('Brown')
  })

  it('falls back to "Unknown colour" for an invalid hex-like value', () => {
    expect(getVehicleColourName('#zzzzzz')).toBe('Unknown colour')
  })

  it('falls back to "Unknown colour" for a missing value', () => {
    expect(getVehicleColourName(undefined)).toBe('Unknown colour')
    expect(getVehicleColourName(null)).toBe('Unknown colour')
    expect(getVehicleColourName('')).toBe('Unknown colour')
  })

  it('returns "Custom colour" for a valid but unrecognized hex value', () => {
    expect(getVehicleColourName('#123456')).toBe('Custom colour')
  })

  it('does not render the raw hex string as the fallback for unknown colours', () => {
    const result = getVehicleColourName('#123456')
    expect(result).not.toBe('#123456')
  })

  it('passes through a legacy plain-text colour name unchanged', () => {
    expect(getVehicleColourName('Silver')).toBe('Silver')
  })
})
