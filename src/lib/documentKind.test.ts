import { describe, it, expect } from 'vitest'
import { detectDocumentKind } from './documentKind'

describe('detectDocumentKind', () => {
  it('detects image from mimeType', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', mimeType: 'image/png' })).toBe('image')
  })

  it('detects pdf from mimeType', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', mimeType: 'application/pdf' })).toBe('pdf')
  })

  it('detects image from filename extension when mimeType is absent', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'photo.webp' })).toBe('image')
  })

  it('detects pdf from filename extension when mimeType is absent', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'contract.pdf' })).toBe('pdf')
  })

  it('falls back to the URL extension when filename is absent', () => {
    expect(detectDocumentKind({ url: 'https://example.com/raw/upload/v1/doc.jpg' })).toBe('image')
  })

  it('does not classify a document as an image merely because the URL contains the word "image"', () => {
    expect(detectDocumentKind({ url: 'https://example.com/image-uploads/contract.pdf', filename: 'contract.pdf' })).toBe('pdf')
  })

  it('returns unknown for an unrecognized file type', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'data.xyz' })).toBe('unknown')
  })

  it('mimeType takes priority over a conflicting filename extension', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', mimeType: 'application/pdf', filename: 'weird.png' })).toBe('pdf')
  })

  it('supports jpeg, jpg, png, and webp as image extensions', () => {
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'a.jpeg' })).toBe('image')
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'a.jpg' })).toBe('image')
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'a.png' })).toBe('image')
    expect(detectDocumentKind({ url: 'https://example.com/x', filename: 'a.webp' })).toBe('image')
  })
})
