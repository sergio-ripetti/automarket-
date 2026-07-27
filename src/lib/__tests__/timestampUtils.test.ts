import { describe, it, expect } from 'vitest'
import { toEpochMillis, compareByCreatedAtDesc, sortByCreatedAtDesc } from '../timestampUtils'

class FakeFirestoreTimestamp {
  private ms: number
  constructor(ms: number) {
    this.ms = ms
  }
  toMillis() { return this.ms }
  toDate() { return new Date(this.ms) }
}

describe('toEpochMillis', () => {
  it('converts a Firestore Timestamp-like object (toMillis)', () => {
    expect(toEpochMillis(new FakeFirestoreTimestamp(1000))).toBe(1000)
  })

  it('converts an object exposing only toDate()', () => {
    const value = { toDate: () => new Date(2000) }
    expect(toEpochMillis(value)).toBe(2000)
  })

  it('converts a serialized {_seconds,_nanoseconds} object', () => {
    expect(toEpochMillis({ _seconds: 10, _nanoseconds: 500_000_000 })).toBe(10_500)
  })

  it('converts a serialized {seconds,nanoseconds} object (non-underscored variant)', () => {
    expect(toEpochMillis({ seconds: 5, nanoseconds: 0 })).toBe(5000)
  })

  it('converts a native Date', () => {
    expect(toEpochMillis(new Date(4242))).toBe(4242)
  })

  it('converts an ISO string', () => {
    expect(toEpochMillis('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'))
  })

  it('converts a raw epoch number', () => {
    expect(toEpochMillis(123456)).toBe(123456)
  })

  it('returns null for missing values', () => {
    expect(toEpochMillis(undefined)).toBeNull()
    expect(toEpochMillis(null)).toBeNull()
  })

  it('returns null for an invalid string', () => {
    expect(toEpochMillis('not-a-date')).toBeNull()
  })

  it('returns null for the unresolved serverTimestamp() sentinel object (the real corrupt legacy shape)', () => {
    expect(toEpochMillis({ _methodName: 'serverTimestamp' })).toBeNull()
  })

  it('never throws for arbitrary garbage input', () => {
    expect(() => toEpochMillis({})).not.toThrow()
    expect(() => toEpochMillis([])).not.toThrow()
    expect(() => toEpochMillis(() => {})).not.toThrow()
    expect(toEpochMillis({})).toBeNull()
  })
})

describe('sortByCreatedAtDesc / compareByCreatedAtDesc', () => {
  it('sorts newest first', () => {
    const items = [
      { id: 'old', createdAt: new Date(1000) },
      { id: 'newest', createdAt: new Date(3000) },
      { id: 'mid', createdAt: new Date(2000) },
    ]
    const sorted = sortByCreatedAtDesc(items)
    expect(sorted.map((i) => i.id)).toEqual(['newest', 'mid', 'old'])
  })

  it('places missing/invalid createdAt records last, after all valid ones', () => {
    const items = [
      { id: 'corrupt', createdAt: { _methodName: 'serverTimestamp' } },
      { id: 'newest', createdAt: new Date(3000) },
      { id: 'missing' },
      { id: 'oldest', createdAt: new Date(1000) },
    ]
    const sorted = sortByCreatedAtDesc(items)
    expect(sorted.map((i) => i.id)).toEqual(['newest', 'oldest', 'corrupt', 'missing'])
  })

  it('never throws even when every record has an invalid timestamp', () => {
    const items = [{ id: 'a' }, { id: 'b', createdAt: 'garbage' }]
    expect(() => sortByCreatedAtDesc(items)).not.toThrow()
  })

  it('does not mutate the original array', () => {
    const items = [{ id: 'a', createdAt: new Date(1) }, { id: 'b', createdAt: new Date(2) }]
    const original = [...items]
    sortByCreatedAtDesc(items)
    expect(items).toEqual(original)
  })

  it('compareByCreatedAtDesc treats two invalid timestamps as equal (stable order preserved by sort)', () => {
    expect(compareByCreatedAtDesc({}, {})).toBe(0)
  })
})
