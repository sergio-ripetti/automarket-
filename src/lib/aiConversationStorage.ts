// Session-scoped (tab-lifetime) persistence for the Admin AI Assistant's visible chat history.
// Deliberately sessionStorage, not localStorage: the conversation can touch business data (sales
// figures, buyer names) and should not linger indefinitely on the machine - it should survive
// in-app navigation within the same tab but disappear when the tab/browser closes. Firestore is
// not used here: this is UI-local display state, not a record the business needs persisted.
export const AI_MESSAGES_STORAGE_KEY = 'automarket.admin.ai.messages.v1'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  id?: string
}

// Only the fields needed to redraw the chat are persisted - the business-context payload sent to
// the backend, the raw API response, and any auth token are never part of `ChatMessage`, so they
// can never end up in storage regardless of what shape they arrive in.
function isValidRole(value: unknown): value is ChatMessage['role'] {
  return value === 'user' || value === 'assistant'
}

// Narrows an arbitrary parsed value down to a single well-formed ChatMessage, or null if the
// entry is malformed - so one corrupted entry can be dropped without discarding the rest.
function toValidMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  if (!isValidRole(candidate.role)) return null
  if (typeof candidate.content !== 'string') return null

  const message: ChatMessage = { role: candidate.role, content: candidate.content }

  if (typeof candidate.id === 'string') message.id = candidate.id

  if (typeof candidate.timestamp === 'string') {
    const parsed = new Date(candidate.timestamp)
    if (!Number.isNaN(parsed.getTime())) message.timestamp = parsed
  }

  return message
}

// Reads and validates the stored conversation. Never throws: any failure (storage unavailable,
// malformed JSON, unexpected shape) safely resolves to an empty conversation so the AI Assistant
// still works purely in-memory.
export function loadAIConversation(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(toValidMessage)
      .filter((m): m is ChatMessage => m !== null)
  } catch {
    return []
  }
}

// Persists only the visible conversation (role/content/id/timestamp) - never the business
// context payload or API response. Silently no-ops on storage failure (quota, private-browsing
// restrictions, disabled storage) so the chat keeps working in memory.
export function saveAIConversation(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    const serializable = messages.map((m) => ({
      role: m.role,
      content: m.content,
      id: m.id,
      timestamp: m.timestamp?.toISOString(),
    }))
    window.sessionStorage.setItem(AI_MESSAGES_STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    // Storage unavailable/quota exceeded - conversation still works in memory for this render
  }
}

// Removes only the AI conversation key - used by the Clear button and by admin sign-out cleanup.
// Never clears unrelated sessionStorage.
export function clearAIConversation(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(AI_MESSAGES_STORAGE_KEY)
  } catch {
    // Storage unavailable - nothing to clear
  }
}
