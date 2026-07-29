import { describe, it, expect, beforeEach } from 'vitest'
import {
  AI_MESSAGES_STORAGE_KEY,
  loadAIConversation,
  saveAIConversation,
  clearAIConversation,
  type ChatMessage,
} from '../aiConversationStorage'

describe('aiConversationStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('uses a namespaced, versioned storage key', () => {
    expect(AI_MESSAGES_STORAGE_KEY).toBe('automarket.admin.ai.messages.v1')
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadAIConversation()).toEqual([])
  })

  it('round-trips valid messages through save and load, preserving id/content/role/timestamp', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'How many cars have I sold?', id: 'u1', timestamp: new Date('2026-01-01T10:00:00Z') },
      { role: 'assistant', content: 'You have sold 12 cars.', id: 'a1', timestamp: new Date('2026-01-01T10:00:05Z') },
    ]
    saveAIConversation(messages)
    const restored = loadAIConversation()
    expect(restored).toHaveLength(2)
    expect(restored[0]).toMatchObject({ role: 'user', content: 'How many cars have I sold?', id: 'u1' })
    expect(restored[0].timestamp).toBeInstanceOf(Date)
    expect(restored[1]).toMatchObject({ role: 'assistant', content: 'You have sold 12 cars.', id: 'a1' })
  })

  it('falls back to an empty conversation on malformed JSON without throwing', () => {
    sessionStorage.setItem(AI_MESSAGES_STORAGE_KEY, '{not valid json')
    expect(() => loadAIConversation()).not.toThrow()
    expect(loadAIConversation()).toEqual([])
  })

  it('falls back to an empty conversation when the stored value is not an array', () => {
    sessionStorage.setItem(AI_MESSAGES_STORAGE_KEY, JSON.stringify({ role: 'user', content: 'hi' }))
    expect(loadAIConversation()).toEqual([])
  })

  it('discards individual malformed entries while keeping valid ones', () => {
    sessionStorage.setItem(
      AI_MESSAGES_STORAGE_KEY,
      JSON.stringify([
        { role: 'user', content: 'valid message' },
        { role: 'hacker', content: 'invalid role' },
        { role: 'assistant', content: 42 },
        null,
        'just a string',
        { content: 'missing role' },
        { role: 'assistant', content: 'another valid one' },
      ])
    )
    const restored = loadAIConversation()
    expect(restored).toHaveLength(2)
    expect(restored[0].content).toBe('valid message')
    expect(restored[1].content).toBe('another valid one')
  })

  it('drops an invalid timestamp field but keeps the rest of the message', () => {
    sessionStorage.setItem(
      AI_MESSAGES_STORAGE_KEY,
      JSON.stringify([{ role: 'user', content: 'hi', timestamp: 'not-a-date' }])
    )
    const restored = loadAIConversation()
    expect(restored).toHaveLength(1)
    expect(restored[0].timestamp).toBeUndefined()
  })

  it('clearAIConversation removes only the AI conversation key, not unrelated storage', () => {
    saveAIConversation([{ role: 'user', content: 'hi' }])
    sessionStorage.setItem('unrelated-key', 'keep-me')

    clearAIConversation()

    expect(sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem('unrelated-key')).toBe('keep-me')
    expect(loadAIConversation()).toEqual([])
  })

  it('never stores fields beyond role/content/id/timestamp, even if present on the input object', () => {
    const messages = [
      {
        role: 'user',
        content: 'hi',
        id: 'u1',
        // Extra fields that must never leak into storage
        businessContext: { totalRevenue: 999999 },
        idToken: 'secret-token',
      },
    ] as unknown as ChatMessage[]

    saveAIConversation(messages)
    const raw = sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)
    expect(raw).not.toContain('businessContext')
    expect(raw).not.toContain('secret-token')
  })
})
